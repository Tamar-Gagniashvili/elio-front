import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  ruleId: string,
  channelType: string,
  channelConfig: any
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
        if (action.content && conversationId) {
          result.autoReplyContent = action.content
          // Insert auto-reply message to database
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_type: 'system',
              content: action.content,
              metadata: { auto_reply: true, rule_id: ruleId }
            })
          
          // Send via Telegram if we have config
          if (channelType === 'telegram' && channelConfig?.bot_token) {
            try {
              const { data: conv } = await supabase
                .from('conversations')
                .select('contacts!inner(metadata)')
                .eq('id', conversationId)
                .single()
              
              const chatId = conv?.contacts?.metadata?.chat_id
              if (chatId) {
                let botToken = channelConfig.bot_token
                if (botToken.startsWith('enc:')) {
                  botToken = await decryptCredential(botToken)
                }
                
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: action.content
                  })
                })
                console.log('Auto-reply sent via Telegram')
              }
            } catch (err) {
              console.error('Error sending Telegram auto-reply:', err)
            }
          }
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
  context: RuleContext,
  channelConfig?: any
): Promise<{ assignedTo?: string }> {
  console.log('Evaluating routing rules with context:', context)

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
        rule.id,
        context.channel_type,
        channelConfig
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
        rule.id,
        context.channel_type,
        channelConfig
      )
      if (result.assignedTo) finalAssignedTo = result.assignedTo
    }
  }

  return { assignedTo: finalAssignedTo }
}

// Decrypt AES-GCM encrypted credentials
async function decryptCredential(encryptedValue: string): Promise<string> {
  if (!encryptedValue.startsWith('enc:')) {
    return encryptedValue
  }
  
  const ciphertext = encryptedValue.slice(4)
  
  const keyString = Deno.env.get('CHANNEL_ENCRYPTION_KEY')
  if (!keyString) {
    console.warn('CHANNEL_ENCRYPTION_KEY not set, returning value as-is')
    return encryptedValue
  }
  
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
  
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
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
  const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
  let storedToken = (channel?.config as any)?.secret_token
  
  if (!storedToken) {
    console.warn('No secret_token configured for Telegram channel - signature verification skipped')
    return true
  }
  
  storedToken = await decryptCredential(storedToken)
  
  if (!secretToken) {
    console.error('Missing X-Telegram-Bot-Api-Secret-Token header')
    return false
  }
  
  return secretToken === storedToken
}

// Get next sales rep using round-robin (fallback)
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

    // Build rule context
    const now = new Date()
    const ruleContext: RuleContext = {
      channel_type: 'telegram',
      message_content: text,
      message_language: 'en', // Could be detected
      contact_name: contact.name || '',
      contact_email: contact.email || '',
      contact_phone: contact.phone || '',
      hour: now.getHours(),
      day_of_week: now.getDay()
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
      // Evaluate routing rules first
      const ruleResult = await evaluateRoutingRules(
        supabase,
        tenantId,
        '', // Will update after creation
        contact.id,
        ruleContext,
        channel.config
      )

      const assignedTo = ruleResult.assignedTo || await getNextSalesRep(supabase, tenantId)

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

      // Re-run rules with conversation ID for actions
      await evaluateRoutingRules(
        supabase,
        tenantId,
        conversation.id,
        contact.id,
        ruleContext,
        channel.config
      )
    } else {
      // Existing conversation - still evaluate rules for auto-replies
      await evaluateRoutingRules(
        supabase,
        tenantId,
        conversation.id,
        contact.id,
        ruleContext,
        channel.config
      )

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
