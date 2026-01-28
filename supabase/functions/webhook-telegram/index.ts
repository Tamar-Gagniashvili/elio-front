import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Find channel
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('channel_type', 'telegram')
      .eq('is_active', true)
      .single()

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
        throw convError
      }
      conversation = newConversation
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
