import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      // Get channel to verify token
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

    const body = await req.json()
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

    // Process WhatsApp Cloud API webhook
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

    // Find channel
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel_type', 'whatsapp')
      .eq('is_active', true)
      .single()

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('contact_id', dbContact.id)
      .in('status', ['open', 'assigned'])
      .single()

    if (!conversation) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          contact_id: dbContact.id,
          channel_id: channel?.id,
          status: 'open',
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
