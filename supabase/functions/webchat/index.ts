import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Types for routing rules
interface RuleCondition {
  field: string
  operator: string
  value: string | string[] | number
}

interface ConditionGroup {
  operator: 'AND' | 'OR'
  conditions: RuleCondition[]
}

interface RuleAction {
  type: string
  user_id?: string
  user_ids?: string[]
  status_id?: string
  content?: string
}

interface ActionsGroup {
  actions: RuleAction[]
  elseActions?: RuleAction[]
}

interface RoutingRule {
  id: string
  tenant_id: string
  name: string
  priority: number
  is_active: boolean
  conditions: ConditionGroup
  actions: ActionsGroup
}

interface RuleContext {
  channel_type: string
  message_content: string
  message_language: string
  contact_name: string
  contact_email: string
  contact_phone: string
  hour: number
  day_of_week: number
}

// Evaluate a single condition
function evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
  let fieldValue: string | number

  switch (condition.field) {
    case 'channel_type':
      fieldValue = context.channel_type
      break
    case 'message_content':
      fieldValue = context.message_content
      break
    case 'message_language':
      fieldValue = context.message_language
      break
    case 'contact.name':
      fieldValue = context.contact_name
      break
    case 'contact.email':
      fieldValue = context.contact_email
      break
    case 'contact.phone':
      fieldValue = context.contact_phone
      break
    case 'time.hour':
      fieldValue = context.hour
      break
    case 'time.day_of_week':
      fieldValue = context.day_of_week
      break
    default:
      return false
  }

  const conditionValue = condition.value
  const stringFieldValue = String(fieldValue).toLowerCase()
  const stringConditionValue = String(conditionValue).toLowerCase()

  switch (condition.operator) {
    case 'equals':
      return stringFieldValue === stringConditionValue
    case 'not_equals':
      return stringFieldValue !== stringConditionValue
    case 'contains':
      return stringFieldValue.includes(stringConditionValue)
    case 'not_contains':
      return !stringFieldValue.includes(stringConditionValue)
    case 'starts_with':
      return stringFieldValue.startsWith(stringConditionValue)
    case 'ends_with':
      return stringFieldValue.endsWith(stringConditionValue)
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue)
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue)
    case 'in':
      if (Array.isArray(conditionValue)) {
        return conditionValue.map(v => String(v).toLowerCase()).includes(stringFieldValue)
      }
      return false
    case 'not_in':
      if (Array.isArray(conditionValue)) {
        return !conditionValue.map(v => String(v).toLowerCase()).includes(stringFieldValue)
      }
      return true
    default:
      return false
  }
}

// Evaluate a condition group
function evaluateConditionGroup(conditions: ConditionGroup, context: RuleContext): boolean {
  if (!conditions.conditions || conditions.conditions.length === 0) {
    return true
  }

  if (conditions.operator === 'AND') {
    return conditions.conditions.every(c => evaluateCondition(c, context))
  } else {
    return conditions.conditions.some(c => evaluateCondition(c, context))
  }
}

// Execute rule actions
async function executeActions(
  supabase: any,
  actions: RuleAction[],
  conversationId: string,
  contactId: string,
  tenantId: string,
  ruleId: string
): Promise<{ assignedTo?: string; statusId?: string; autoReplyContent?: string }> {
  const result: { assignedTo?: string; statusId?: string; autoReplyContent?: string } = {}

  for (const action of actions) {
    console.log(`Executing action: ${action.type}`, action)

    switch (action.type) {
      case 'assign_to_user':
        if (action.user_id) {
          result.assignedTo = action.user_id
        }
        break

      case 'assign_to_pool':
        if (action.user_ids && action.user_ids.length > 0) {
          // Get distribution record for round-robin within pool
          let { data: distribution } = await supabase
            .from('chat_distribution')
            .select('*')
            .eq('tenant_id', tenantId)
            .single()

          if (!distribution) {
            await supabase
              .from('chat_distribution')
              .insert({ tenant_id: tenantId, assignment_index: 0 })
            distribution = { assignment_index: 0 }
          }

          const poolIndex = distribution.assignment_index % action.user_ids.length
          result.assignedTo = action.user_ids[poolIndex]

          await supabase
            .from('chat_distribution')
            .update({
              assignment_index: distribution.assignment_index + 1,
              last_assigned_user_id: result.assignedTo,
              updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenantId)
        }
        break

      case 'apply_status':
        if (action.status_id) {
          result.statusId = action.status_id
          // Apply status to contact
          await supabase
            .from('contact_statuses')
            .upsert({
              tenant_id: tenantId,
              contact_id: contactId,
              status_id: action.status_id,
              created_at: new Date().toISOString()
            }, {
              onConflict: 'contact_id,status_id',
              ignoreDuplicates: true
            })
        }
        break

      case 'send_message':
        if (action.content) {
          result.autoReplyContent = action.content
          // Insert auto-reply message
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_type: 'system',
              content: action.content,
              metadata: { auto_reply: true, rule_id: ruleId }
            })
        }
        break
    }

    // Log the action
    await supabase
      .from('rule_action_logs')
      .insert({
        tenant_id: tenantId,
        rule_id: ruleId,
        conversation_id: conversationId,
        contact_id: contactId,
        action_type: action.type,
        action_details: action
      })
  }

  return result
}

// Evaluate and execute routing rules
async function evaluateRoutingRules(
  supabase: any,
  tenantId: string,
  conversationId: string,
  contactId: string,
  context: RuleContext
): Promise<{ assignedTo?: string }> {
  console.log('Evaluating routing rules with context:', context)

  // Fetch active rules ordered by priority
  const { data: rules, error } = await supabase
    .from('routing_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (error || !rules || rules.length === 0) {
    console.log('No active routing rules found')
    return {}
  }

  let finalAssignedTo: string | undefined

  for (const ruleData of rules) {
    const rule: RoutingRule = {
      ...ruleData,
      conditions: ruleData.conditions as ConditionGroup,
      actions: ruleData.actions as ActionsGroup
    }

    console.log(`Evaluating rule: ${rule.name}`)

    const conditionsPassed = evaluateConditionGroup(rule.conditions, context)

    if (conditionsPassed) {
      console.log(`Rule "${rule.name}" matched - executing THEN actions`)
      const result = await executeActions(
        supabase,
        rule.actions.actions || [],
        conversationId,
        contactId,
        tenantId,
        rule.id
      )
      if (result.assignedTo) finalAssignedTo = result.assignedTo
    } else if (rule.actions.elseActions && rule.actions.elseActions.length > 0) {
      console.log(`Rule "${rule.name}" not matched - executing ELSE actions`)
      const result = await executeActions(
        supabase,
        rule.actions.elseActions,
        conversationId,
        contactId,
        tenantId,
        rule.id
      )
      if (result.assignedTo) finalAssignedTo = result.assignedTo
    }
  }

  return { assignedTo: finalAssignedTo }
}

// Get next sales rep with online-first priority
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

  const allSalesUserIds = salesReps.map((s: { user_id: string }) => s.user_id)

  // Check which sales reps are online (with 5 minute threshold for stale presence)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const { data: onlinePresence } = await supabase
    .from('user_presence')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('is_online', true)
    .gte('last_seen_at', fiveMinutesAgo)
    .in('user_id', allSalesUserIds)

  const onlineSalesUserIds = onlinePresence?.map((p: { user_id: string }) => p.user_id) || []
  
  console.log(`Online sales reps: ${onlineSalesUserIds.length}/${allSalesUserIds.length}`)

  // Choose which pool to use: online first, fallback to all
  const targetPool = onlineSalesUserIds.length > 0 ? onlineSalesUserIds : allSalesUserIds
  const poolType = onlineSalesUserIds.length > 0 ? 'online' : 'all'

  console.log(`Using ${poolType} pool with ${targetPool.length} users`)

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
      return targetPool[0]
    }
    distribution = newDist
  }

  // Round-robin within the chosen pool
  const nextIndex = distribution.assignment_index % targetPool.length
  const nextSalesRep = targetPool[nextIndex]

  await supabase
    .from('chat_distribution')
    .update({
      assignment_index: distribution.assignment_index + 1,
      last_assigned_user_id: nextSalesRep,
      updated_at: new Date().toISOString()
    })
    .eq('id', distribution.id)

  console.log(`Assigned to ${poolType} sales rep at index ${nextIndex}:`, nextSalesRep)
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

      // Build context for rule evaluation
      const now = new Date()
      const ruleContext: RuleContext = {
        channel_type: 'web_chat',
        message_content: message || '',
        message_language: 'en', // Default, could be detected
        contact_name: name || contact.name || '',
        contact_email: email || contact.email || '',
        contact_phone: contact.phone || '',
        hour: now.getHours(),
        day_of_week: now.getDay()
      }

      if (!conversation) {
        // Evaluate routing rules first
        const ruleResult = await evaluateRoutingRules(
          supabase,
          tenantId,
          '', // Conversation not created yet, will update after
          contact.id,
          ruleContext
        )

        // Use rule-assigned user or fall back to round-robin
        const assignedTo = ruleResult.assignedTo || await getNextSalesRep(supabase, tenantId)

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

        // Re-run rules now with the conversation ID for actions that need it
        await evaluateRoutingRules(
          supabase,
          tenantId,
          conversation.id,
          contact.id,
          ruleContext
        )
      } else {
        // Existing conversation - still evaluate rules for auto-replies
        await evaluateRoutingRules(
          supabase,
          tenantId,
          conversation.id,
          contact.id,
          ruleContext
        )
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
        .select('*, contacts!inner(id, name, email, phone)')
        .eq('id', conversation_id)
        .single()

      if (!conversation) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Build context for rule evaluation on each message
      const now = new Date()
      const ruleContext: RuleContext = {
        channel_type: 'web_chat',
        message_content: message,
        message_language: 'en',
        contact_name: conversation.contacts?.name || '',
        contact_email: conversation.contacts?.email || '',
        contact_phone: conversation.contacts?.phone || '',
        hour: now.getHours(),
        day_of_week: now.getDay()
      }

      // Evaluate rules for auto-replies
      await evaluateRoutingRules(
        supabase,
        tenantId,
        conversation_id,
        conversation.contact_id,
        ruleContext
      )

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
