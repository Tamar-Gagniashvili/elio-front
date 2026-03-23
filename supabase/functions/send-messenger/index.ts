import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function decryptCredential(encryptedValue: string): Promise<string> {
  if (!encryptedValue.startsWith('enc:')) return encryptedValue
  const ciphertext = encryptedValue.slice(4)
  const keyString = Deno.env.get('CHANNEL_ENCRYPTION_KEY')
  if (!keyString) return encryptedValue
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(keyString))
  const key = await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, ['decrypt'])
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, key, combined.slice(12))
  return new TextDecoder().decode(decrypted)
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
      .select('*, contact:contacts(*)')
      .eq('id', conversation_id)
      .single()

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const contact = conversation.contact
    if (contact.channel_type !== 'messenger') {
      return new Response(JSON.stringify({ error: 'Not a Messenger conversation' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get Messenger channel config
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('tenant_id', conversation.tenant_id)
      .eq('channel_type', 'messenger')
      .eq('is_active', true)
      .single()

    if (channelError || !channel) {
      return new Response(JSON.stringify({ error: 'Messenger channel not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const config = channel.config as { page_access_token?: string }
    if (!config?.page_access_token) {
      return new Response(JSON.stringify({ error: 'Page access token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const pageToken = await decryptCredential(config.page_access_token)
    const recipientId = contact.external_id

    if (!recipientId) {
      return new Response(JSON.stringify({ error: 'No external ID found for contact' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Send message via Facebook Graph API
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: content }
      })
    })

    const fbResult = await fbResponse.json()
    console.log('Facebook API response:', fbResult)

    if (!fbResponse.ok) {
      return new Response(JSON.stringify({ error: fbResult.error?.message || 'Failed to send message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, message_id: fbResult.message_id }), {
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
