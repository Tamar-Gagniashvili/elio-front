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

// Verify Facebook webhook signature using HMAC SHA-256
async function verifyFacebookSignature(req: Request, bodyText: string, appSecret: string | undefined): Promise<boolean> {
  const signature = req.headers.get('X-Hub-Signature-256')
  
  // If no app_secret is configured, log warning but allow (backward compatibility)
  if (!appSecret) {
    console.warn('No app_secret configured for Messenger channel - signature verification skipped')
    return true
  }
  
  // Decrypt if encrypted
  const decryptedSecret = await decryptCredential(appSecret)
  
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
  const keyData = encoder.encode(decryptedSecret)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenant_id')

  // Handle Facebook webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    console.log('Messenger verification request:', { mode, token, tenantId })

    if (mode === 'subscribe' && tenantId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const { data: channel } = await supabase
        .from('channels')
        .select('config')
        .eq('tenant_id', tenantId)
        .eq('channel_type', 'messenger')
        .single()

      let storedToken = (channel?.config as any)?.verify_token
      // Decrypt if encrypted
      if (storedToken) {
        storedToken = await decryptCredential(storedToken)
      }
      if (token === storedToken) {
        console.log('Messenger webhook verified')
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
      .eq('channel_type', 'messenger')
      .eq('is_active', true)
      .single()

    if (!channel) {
      console.error('Messenger channel not found for tenant:', tenantId)
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify Facebook signature
    const appSecret = (channel.config as any)?.app_secret
    const isValid = await verifyFacebookSignature(req, bodyText, appSecret)
    if (!isValid) {
      console.error('Invalid Messenger signature for tenant:', tenantId)
      return new Response('Unauthorized', { 
        status: 401,
        headers: corsHeaders 
      })
    }

    const body = JSON.parse(bodyText)
    console.log('Messenger webhook received:', JSON.stringify(body, null, 2))

    // Process Facebook Messenger webhook
    if (body.object !== 'page') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.message) continue

        const senderId = event.sender.id
        const text = event.message.text || '[Media message]'

        // Find or create contact
        let { data: contact } = await supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('external_id', senderId)
          .eq('channel_type', 'messenger')
          .single()

        if (!contact) {
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              tenant_id: tenantId,
              external_id: senderId,
              channel_type: 'messenger',
              name: 'Messenger User',
              metadata: {}
            })
            .select()
            .single()

          if (contactError) {
            console.error('Error creating contact:', contactError)
            continue
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
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              tenant_id: tenantId,
              contact_id: contact.id,
              channel_id: channel?.id,
              status: 'open',
              last_message_at: new Date().toISOString(),
              last_message_preview: text.substring(0, 100)
            })
            .select()
            .single()

          if (convError) {
            console.error('Error creating conversation:', convError)
            continue
          }
          conversation = newConversation
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
            metadata: { messenger_message_id: event.message.mid }
          })

        if (msgError) {
          console.error('Error creating message:', msgError)
        }
      }
    }

    console.log('Messenger message processed successfully')
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
