import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Decrypt AES-GCM encrypted credentials
async function decryptCredential(encryptedValue: string): Promise<string> {
  // If not encrypted (no prefix), return as-is for backward compatibility
  if (!encryptedValue.startsWith('enc:')) {
    return encryptedValue
  }
  
  const ciphertext = encryptedValue.slice(4) // Remove 'enc:' prefix
  
  const keyString = Deno.env.get('CHANNEL_ENCRYPTION_KEY')
  if (!keyString) {
    console.warn('CHANNEL_ENCRYPTION_KEY not set, returning value as-is')
    return encryptedValue
  }
  
  // Create key from secret
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  
  const key = await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12)
  const encrypted = combined.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )
  
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

// Verify Telegram webhook secret token
async function verifyTelegramSignature(req: Request, channel: any): Promise<boolean> {
  // Telegram sends the secret token in X-Telegram-Bot-Api-Secret-Token header
  const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
  let storedToken = (channel?.config as any)?.secret_token
  
  // If no secret token is configured, log warning but allow (backward compatibility)
  if (!storedToken) {
    console.warn('No secret_token configured for Telegram channel - signature verification skipped')
    return true
  }
  
  // Decrypt if encrypted
  storedToken = await decryptCredential(storedToken)
  
  if (!secretToken) {
    console.error('Missing X-Telegram-Bot-Api-Secret-Token header')
    return false
  }
  
  return secretToken === storedToken
}

// Get next sales rep using round-robin
async function getNextSalesRep(supabase: any, tenantId: string) {
  // Get all active sales reps for this tenant
  const { data: salesReps, error: salesError } = await supabase
    .from('tenant_memberships')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'sales')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (salesError || !salesReps || salesReps.length === 0) {
    console.log('No sales reps found for tenant:', tenantId)
    return null
  }

  // Get or create distribution record for this tenant
  let { data: distribution } = await supabase
    .from('chat_distribution')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!distribution) {
    const { data: newDist, error: distError } = await supabase
      .from('chat_distribution')
      .insert({
        tenant_id: tenantId,
        assignment_index: 0,
        last_assigned_user_id: null
      })
      .select()
      .single()

    if (distError) {
      console.error('Error creating distribution:', distError)
      return salesReps[0].user_id
    }
    distribution = newDist
  }

  // Calculate next index using round-robin
  const nextIndex = distribution.assignment_index % salesReps.length
  const nextSalesRep = salesReps[nextIndex].user_id

  // Update distribution record
  await supabase
    .from('chat_distribution')
    .update({
      assignment_index: distribution.assignment_index + 1,
      last_assigned_user_id: nextSalesRep,
      updated_at: new Date().toISOString()
    })
    .eq('id', distribution.id)

  console.log(`Assigned to sales rep at index ${nextIndex}:`, nextSalesRep)
  return nextSalesRep
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenant_id')

    if (!tenantId) {
      console.error('Missing tenant_id parameter')
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Find channel first to verify signature
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel_type', 'telegram')
      .eq('is_active', true)
      .single()

    if (!channel) {
      console.error('Telegram channel not found for tenant:', tenantId)
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify Telegram signature
    const isValid = await verifyTelegramSignature(req, channel)
    if (!isValid) {
      console.error('Invalid Telegram signature for tenant:', tenantId)
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const body = await req.json()
    console.log('Telegram webhook received:', JSON.stringify(body, null, 2))

    // Extract message from Telegram update
    const message = body.message || body.edited_message
    if (!message) {
      console.log('No message in update')
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const telegramUserId = message.from.id.toString()
    const chatId = message.chat.id.toString()
    const text = message.text || ''
    const firstName = message.from.first_name || ''
    const lastName = message.from.last_name || ''
    const username = message.from.username || ''

    // Find or create contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('external_id', telegramUserId)
      .eq('channel_type', 'telegram')
      .single()

    if (!contact) {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          external_id: telegramUserId,
          channel_type: 'telegram',
          name: `${firstName} ${lastName}`.trim() || username || 'Telegram User',
          metadata: { chat_id: chatId, username }
        })
        .select()
        .single()

      if (contactError) {
        console.error('Error creating contact:', contactError)
        throw contactError
      }
      contact = newContact
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contact.id)
      .in('status', ['open', 'assigned'])
      .single()

    if (!conversation) {
      // Get next sales rep for assignment
      const assignedTo = await getNextSalesRep(supabase, tenantId)

      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          contact_id: contact.id,
          channel_id: channel?.id,
          status: assignedTo ? 'assigned' : 'open',
          assigned_to: assignedTo,
          assignment_seen_by_assignee: assignedTo ? false : true,
          last_message_at: new Date().toISOString(),
          last_message_preview: text.substring(0, 100)
        })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        throw convError
      }
      conversation = newConversation
      console.log('Created new conversation with assignment:', assignedTo)
    } else {
      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: text.substring(0, 100),
          unread_count: conversation.unread_count + 1
        })
        .eq('id', conversation.id)
    }

    // Create message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'contact',
        content: text,
        metadata: { telegram_message_id: message.message_id }
      })

    if (msgError) {
      console.error('Error creating message:', msgError)
      throw msgError
    }

    console.log('Message processed successfully')
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Webhook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
