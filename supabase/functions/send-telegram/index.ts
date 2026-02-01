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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { conversation_id, content } = await req.json()

    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: 'Missing conversation_id or content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get conversation with contact
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('id', conversation_id)
      .single()

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError)
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const contact = conversation.contact
    if (contact.channel_type !== 'telegram') {
      return new Response(JSON.stringify({ error: 'Not a Telegram conversation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the Telegram channel config for this tenant
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('tenant_id', conversation.tenant_id)
      .eq('channel_type', 'telegram')
      .eq('is_active', true)
      .single()

    if (channelError || !channel) {
      console.error('Error fetching channel:', channelError)
      return new Response(JSON.stringify({ error: 'Telegram channel not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const config = channel.config as { bot_token?: string }
    if (!config?.bot_token) {
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Decrypt bot token if encrypted
    const botToken = await decryptCredential(config.bot_token)

    // Get chat_id from contact metadata
    const metadata = contact.metadata as { chat_id?: string }
    const chatId = metadata?.chat_id || contact.external_id

    if (!chatId) {
      return new Response(JSON.stringify({ error: 'No chat ID found for contact' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: content,
        parse_mode: 'HTML'
      })
    })

    const telegramResult = await telegramResponse.json()
    console.log('Telegram API response:', telegramResult)

    if (!telegramResult.ok) {
      console.error('Telegram API error:', telegramResult)
      return new Response(JSON.stringify({ error: telegramResult.description || 'Failed to send message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message_id: telegramResult.result.message_id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Send error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
