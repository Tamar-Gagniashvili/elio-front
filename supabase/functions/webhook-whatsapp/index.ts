import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Verify Facebook/WhatsApp webhook signature using HMAC SHA-256
async function verifyFacebookSignature(req: Request, bodyText: string, appSecret: string | undefined): Promise<boolean> {
  const signature = req.headers.get('X-Hub-Signature-256')
  
  // If no app_secret is configured, log warning but allow (backward compatibility)
  if (!appSecret) {
    console.warn('No app_secret configured for WhatsApp channel - signature verification skipped')
    return true
  }
  
  if (!signature) {
    console.error('Missing X-Hub-Signature-256 header')
    return false
  }
  
  // Signature format: sha256=<hash>
  const expectedPrefix = 'sha256='
  if (!signature.startsWith(expectedPrefix)) {
    console.error('Invalid signature format')
    return false
  }
  
  const providedHash = signature.slice(expectedPrefix.length)
  
  // Calculate expected hash using Web Crypto API
  const encoder = new TextEncoder()
  const keyData = encoder.encode(appSecret)
  const messageData = encoder.encode(bodyText)
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)
  const expectedHash = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  return providedHash === expectedHash
}

// Get next sales rep using round-robin
async function getNextSalesRep(supabase: any, tenantId: string) {
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

  const nextIndex = distribution.assignment_index % salesReps.length
  const nextSalesRep = salesReps[nextIndex].user_id

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

  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenant_id')

  // Handle WhatsApp webhook verification (GET request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    console.log('WhatsApp verification request:', { mode, token, tenantId })

    if (mode === 'subscribe' && tenantId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { data: channel } = await supabase
        .from('channels')
        .select('config')
        .eq('tenant_id', tenantId)
        .eq('channel_type', 'whatsapp')
        .single()

      const storedToken = (channel?.config as any)?.verify_token
      if (token === storedToken) {
        console.log('WhatsApp webhook verified')
        return new Response(challenge, { status: 200 })
      }
    }

    return new Response('Forbidden', { status: 403 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (!tenantId) {
      console.error('Missing tenant_id parameter')
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Read body as text first for signature verification
    const bodyText = await req.text()
    
    // Find channel to get app_secret for signature verification
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel_type', 'whatsapp')
      .eq('is_active', true)
      .single()

    if (!channel) {
      console.error('WhatsApp channel not found for tenant:', tenantId)
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify Facebook/WhatsApp signature
    const appSecret = (channel.config as any)?.app_secret
    const isValid = await verifyFacebookSignature(req, bodyText, appSecret)
    if (!isValid) {
      console.error('Invalid WhatsApp signature for tenant:', tenantId)
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const body = JSON.parse(bodyText)
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages?.[0]) {
      console.log('No message in webhook')
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]
    const whatsappId = message.from
    const text = message.text?.body || message.caption || '[Media message]'
    const contactName = contact?.profile?.name || 'WhatsApp User'

    // Find or create contact
    let { data: dbContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('external_id', whatsappId)
      .eq('channel_type', 'whatsapp')
      .single()

    if (!dbContact) {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          tenant_id: tenantId,
          external_id: whatsappId,
          channel_type: 'whatsapp',
          name: contactName,
          phone: whatsappId,
          metadata: {}
        })
        .select()
        .single()

      if (contactError) {
        console.error('Error creating contact:', contactError)
        throw contactError
      }
      dbContact = newContact
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', dbContact.id)
      .in('status', ['open', 'assigned'])
      .single()

    if (!conversation) {
      // Get next sales rep for assignment
      const assignedTo = await getNextSalesRep(supabase, tenantId)

      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          contact_id: dbContact.id,
          channel_id: channel?.id,
          status: assignedTo ? 'assigned' : 'open',
          assigned_to: assignedTo,
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
        metadata: { whatsapp_message_id: message.id, type: message.type }
      })

    if (msgError) {
      console.error('Error creating message:', msgError)
      throw msgError
    }

    console.log('WhatsApp message processed successfully')
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
