import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      return new Response(JSON.stringify({ error: 'Missing tenant_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify tenant exists and has web_chat enabled
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .eq('is_active', true)
      .single()

    if (tenantError || !tenant) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { action, visitor_id, name, email, message, conversation_id, media_url, media_type, media_filename } = body

    console.log('Web chat request:', { action, visitor_id, tenantId })

    // Handle different actions
    if (action === 'init') {
      // Initialize chat session - return tenant info and any existing conversation
      let existingConversation = null
      
      if (visitor_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('external_id', visitor_id)
          .eq('channel_type', 'web_chat')
          .single()

        if (contact) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .in('status', ['open', 'assigned'])
            .single()
          
          existingConversation = conv?.id
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        tenant_name: tenant.name,
        conversation_id: existingConversation
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'start') {
      // Start new conversation
      const uniqueVisitorId = visitor_id || crypto.randomUUID()

      // First, check if a contact with this email already exists (email-based deduplication)
      let contact = null
      
      if (email) {
        const { data: existingByEmail } = await supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('email', email)
          .eq('channel_type', 'web_chat')
          .single()
        
        if (existingByEmail) {
          contact = existingByEmail
          console.log('Found existing contact by email:', email)
          
          // Update name if provided and different
          if (name && name !== contact.name) {
            await supabase
              .from('contacts')
              .update({ name })
              .eq('id', contact.id)
            contact.name = name
          }
          
          // Update external_id to the new visitor_id for session continuity
          if (uniqueVisitorId !== contact.external_id) {
            await supabase
              .from('contacts')
              .update({ external_id: uniqueVisitorId })
              .eq('id', contact.id)
          }
        }
      }

      // If not found by email, try by visitor_id
      if (!contact) {
        const { data: existingByVisitor } = await supabase
          .from('contacts')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('external_id', uniqueVisitorId)
          .eq('channel_type', 'web_chat')
          .single()
        
        contact = existingByVisitor
      }

      // Create new contact if none found
      if (!contact) {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            tenant_id: tenantId,
            external_id: uniqueVisitorId,
            channel_type: 'web_chat',
            name: name || 'Website Visitor',
            email: email || null,
            metadata: { source: 'web_widget' }
          })
          .select()
          .single()

        if (contactError) throw contactError
        contact = newContact
        console.log('Created new contact:', contact.id)
      } else if (name || email) {
        // Update contact info if provided and not already set
        const updates: Record<string, string> = {}
        if (name && name !== contact.name) updates.name = name
        if (email && !contact.email) updates.email = email
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('contacts')
            .update(updates)
            .eq('id', contact.id)
        }
      }

      // Find channel
      const { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('channel_type', 'web_chat')
        .eq('is_active', true)
        .single()

      // Check for existing open/assigned conversation (get the most recent one)
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('contact_id', contact.id)
        .in('status', ['open', 'assigned'])
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(1)
      
      let conversation = existingConversations?.[0] || null
      console.log('Existing conversation:', conversation?.id || 'none')

      if (!conversation) {
        const assignedTo = await getNextSalesRep(supabase, tenantId)

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            channel_id: channel?.id,
            status: assignedTo ? 'assigned' : 'open',
            assigned_to: assignedTo,
            assignment_seen_by_assignee: assignedTo ? false : true,
            last_message_at: new Date().toISOString(),
            last_message_preview: message?.substring(0, 100) || 'New conversation'
          })
          .select()
          .single()

        if (convError) throw convError
        conversation = newConv
      }

      // Create initial message if provided
      if (message) {
        const messageMetadata: Record<string, unknown> = { source: 'web_widget' }
        if (media_url) {
          messageMetadata.media_url = media_url
          messageMetadata.media_type = media_type
          messageMetadata.media_filename = media_filename
        }

        await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_type: 'contact',
            content: message,
            metadata: messageMetadata
          })

        await supabase
          .from('conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: message.substring(0, 100),
            unread_count: (conversation.unread_count || 0) + 1
          })
          .eq('id', conversation.id)
      }

      return new Response(JSON.stringify({
        ok: true,
        conversation_id: conversation.id,
        visitor_id: uniqueVisitorId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'send') {
      // Send message to existing conversation
      if (!conversation_id || !message) {
        return new Response(JSON.stringify({ error: 'Missing conversation_id or message' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation_id)
        .single()

      if (!conversation) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const messageMetadata: Record<string, unknown> = { source: 'web_widget' }
      if (media_url) {
        messageMetadata.media_url = media_url
        messageMetadata.media_type = media_type
        messageMetadata.media_filename = media_filename
      }

      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation_id,
          sender_type: 'contact',
          content: message,
          metadata: messageMetadata
        })

      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          unread_count: (conversation.unread_count || 0) + 1
        })
        .eq('id', conversation_id)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'messages') {
      // Get messages for a conversation
      if (!conversation_id) {
        return new Response(JSON.stringify({ error: 'Missing conversation_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, sender_type, created_at, metadata, media_url, media_type, media_filename')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true })

      return new Response(JSON.stringify({ ok: true, messages: messages || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Web chat error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
