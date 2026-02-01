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

function evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
  let fieldValue: string | number

  switch (condition.field) {
    case 'channel_type': fieldValue = context.channel_type; break
    case 'message_content': fieldValue = context.message_content; break
    case 'message_language': fieldValue = context.message_language; break
    case 'contact.name': fieldValue = context.contact_name; break
    case 'contact.email': fieldValue = context.contact_email; break
    case 'contact.phone': fieldValue = context.contact_phone; break
    case 'time.hour': fieldValue = context.hour; break
    case 'time.day_of_week': fieldValue = context.day_of_week; break
    default: return false
  }

  const conditionValue = condition.value
  const stringFieldValue = String(fieldValue).toLowerCase()
  const stringConditionValue = String(conditionValue).toLowerCase()

  switch (condition.operator) {
    case 'equals': return stringFieldValue === stringConditionValue
    case 'not_equals': return stringFieldValue !== stringConditionValue
    case 'contains': return stringFieldValue.includes(stringConditionValue)
    case 'not_contains': return !stringFieldValue.includes(stringConditionValue)
    case 'starts_with': return stringFieldValue.startsWith(stringConditionValue)
    case 'ends_with': return stringFieldValue.endsWith(stringConditionValue)
    case 'greater_than': return Number(fieldValue) > Number(conditionValue)
    case 'less_than': return Number(fieldValue) < Number(conditionValue)
    case 'in': return Array.isArray(conditionValue) && conditionValue.map(v => String(v).toLowerCase()).includes(stringFieldValue)
    case 'not_in': return !Array.isArray(conditionValue) || !conditionValue.map(v => String(v).toLowerCase()).includes(stringFieldValue)
    default: return false
  }
}

function evaluateConditionGroup(conditions: ConditionGroup, context: RuleContext): boolean {
  if (!conditions.conditions || conditions.conditions.length === 0) return true
  if (conditions.operator === 'AND') {
    return conditions.conditions.every(c => evaluateCondition(c, context))
  }
  return conditions.conditions.some(c => evaluateCondition(c, context))
}

async function executeActions(
  supabase: any,
  actions: RuleAction[],
  conversationId: string,
  contactId: string,
  tenantId: string,
  ruleId: string,
  channelType: string,
  channelConfig: any,
  senderId?: string
): Promise<{ assignedTo?: string }> {
  const result: { assignedTo?: string } = {}

  for (const action of actions) {
    console.log(`Executing action: ${action.type}`, action)

    switch (action.type) {
      case 'assign_to_user':
        if (action.user_id) result.assignedTo = action.user_id
        break

      case 'assign_to_pool':
        if (action.user_ids && action.user_ids.length > 0) {
          let { data: distribution } = await supabase.from('chat_distribution').select('*').eq('tenant_id', tenantId).single()
          if (!distribution) {
            await supabase.from('chat_distribution').insert({ tenant_id: tenantId, assignment_index: 0 })
            distribution = { assignment_index: 0 }
          }
          const poolIndex = distribution.assignment_index % action.user_ids.length
          result.assignedTo = action.user_ids[poolIndex]
          await supabase.from('chat_distribution').update({ assignment_index: distribution.assignment_index + 1, last_assigned_user_id: result.assignedTo, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId)
        }
        break

      case 'apply_status':
        if (action.status_id) {
          await supabase.from('contact_statuses').upsert({
            tenant_id: tenantId, contact_id: contactId, status_id: action.status_id, created_at: new Date().toISOString()
          }, { onConflict: 'contact_id,status_id', ignoreDuplicates: true })
        }
        break

      case 'send_message':
        if (action.content && conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_type: 'system',
            content: action.content,
            metadata: { auto_reply: true, rule_id: ruleId }
          })
          
          if (channelType === 'messenger' && channelConfig?.page_access_token && senderId) {
            try {
              let pageToken = channelConfig.page_access_token
              if (pageToken.startsWith('enc:')) pageToken = await decryptCredential(pageToken)
              
              await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  recipient: { id: senderId },
                  message: { text: action.content }
                })
              })
              console.log('Auto-reply sent via Messenger')
            } catch (err) {
              console.error('Error sending Messenger auto-reply:', err)
            }
          }
        }
        break
    }

    await supabase.from('rule_action_logs').insert({
      tenant_id: tenantId, rule_id: ruleId, conversation_id: conversationId, contact_id: contactId, action_type: action.type, action_details: action
    })
  }

  return result
}

async function evaluateRoutingRules(
  supabase: any,
  tenantId: string,
  conversationId: string,
  contactId: string,
  context: RuleContext,
  channelConfig?: any,
  senderId?: string
): Promise<{ assignedTo?: string }> {
  console.log('Evaluating routing rules with context:', context)

  const { data: rules, error } = await supabase.from('routing_rules').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('priority', { ascending: true })

  if (error || !rules || rules.length === 0) {
    console.log('No active routing rules found')
    return {}
  }

  let finalAssignedTo: string | undefined

  for (const ruleData of rules) {
    const rule: RoutingRule = { ...ruleData, conditions: ruleData.conditions as ConditionGroup, actions: ruleData.actions as ActionsGroup }
    const conditionsPassed = evaluateConditionGroup(rule.conditions, context)

    if (conditionsPassed) {
      console.log(`Rule "${rule.name}" matched - executing THEN actions`)
      const result = await executeActions(supabase, rule.actions.actions || [], conversationId, contactId, tenantId, rule.id, context.channel_type, channelConfig, senderId)
      if (result.assignedTo) finalAssignedTo = result.assignedTo
    } else if (rule.actions.elseActions && rule.actions.elseActions.length > 0) {
      console.log(`Rule "${rule.name}" not matched - executing ELSE actions`)
      const result = await executeActions(supabase, rule.actions.elseActions, conversationId, contactId, tenantId, rule.id, context.channel_type, channelConfig, senderId)
      if (result.assignedTo) finalAssignedTo = result.assignedTo
    }
  }

  return { assignedTo: finalAssignedTo }
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

async function verifyFacebookSignature(req: Request, bodyText: string, appSecret: string | undefined): Promise<boolean> {
  const signature = req.headers.get('X-Hub-Signature-256')
  if (!appSecret) { console.warn('No app_secret configured - signature verification skipped'); return true }
  const decryptedSecret = await decryptCredential(appSecret)
  if (!signature || !signature.startsWith('sha256=')) return false
  const providedHash = signature.slice(7)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(decryptedSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText))
  const expectedHash = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  return providedHash === expectedHash
}

async function getNextSalesRep(supabase: any, tenantId: string) {
  const { data: salesReps } = await supabase.from('tenant_memberships').select('user_id').eq('tenant_id', tenantId).eq('role', 'sales').eq('is_active', true).order('created_at', { ascending: true })
  if (!salesReps || salesReps.length === 0) return null
  let { data: distribution } = await supabase.from('chat_distribution').select('*').eq('tenant_id', tenantId).single()
  if (!distribution) {
    const { data: newDist } = await supabase.from('chat_distribution').insert({ tenant_id: tenantId, assignment_index: 0 }).select().single()
    distribution = newDist || { assignment_index: 0 }
  }
  const nextIndex = distribution.assignment_index % salesReps.length
  const nextSalesRep = salesReps[nextIndex].user_id
  await supabase.from('chat_distribution').update({ assignment_index: distribution.assignment_index + 1, last_assigned_user_id: nextSalesRep, updated_at: new Date().toISOString() }).eq('id', distribution.id)
  return nextSalesRep
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenant_id')

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && tenantId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: channel } = await supabase.from('channels').select('config').eq('tenant_id', tenantId).eq('channel_type', 'messenger').single()
      let storedToken = (channel?.config as any)?.verify_token
      if (storedToken) storedToken = await decryptCredential(storedToken)
      if (token === storedToken) return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    if (!tenantId) return new Response(JSON.stringify({ error: 'Missing tenant_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const bodyText = await req.text()
    const { data: channel } = await supabase.from('channels').select('*').eq('tenant_id', tenantId).eq('channel_type', 'messenger').eq('is_active', true).single()

    if (!channel) return new Response(JSON.stringify({ error: 'Channel not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const appSecret = (channel.config as any)?.app_secret
    const isValid = await verifyFacebookSignature(req, bodyText, appSecret)
    if (!isValid) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const body = JSON.parse(bodyText)
    console.log('Messenger webhook received:', JSON.stringify(body, null, 2))

    if (body.object !== 'page') return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    for (const entry of body.entry || []) {
      for (const event of entry.messaging || []) {
        if (!event.message) continue

        const senderId = event.sender.id
        const text = event.message.text || '[Media message]'

        let { data: contact } = await supabase.from('contacts').select('*').eq('tenant_id', tenantId).eq('external_id', senderId).eq('channel_type', 'messenger').single()

        if (!contact) {
          const { data: newContact, error: contactError } = await supabase.from('contacts').insert({
            tenant_id: tenantId, external_id: senderId, channel_type: 'messenger', name: 'Messenger User', metadata: {}
          }).select().single()
          if (contactError) { console.error('Error creating contact:', contactError); continue }
          contact = newContact
        }

        const now = new Date()
        const ruleContext: RuleContext = {
          channel_type: 'messenger',
          message_content: text,
          message_language: 'en',
          contact_name: contact.name || '',
          contact_email: contact.email || '',
          contact_phone: contact.phone || '',
          hour: now.getHours(),
          day_of_week: now.getDay()
        }

        let { data: conversation } = await supabase.from('conversations').select('*').eq('tenant_id', tenantId).eq('contact_id', contact.id).in('status', ['open', 'assigned']).single()

        if (!conversation) {
          const ruleResult = await evaluateRoutingRules(supabase, tenantId, '', contact.id, ruleContext, channel.config, senderId)
          const assignedTo = ruleResult.assignedTo || await getNextSalesRep(supabase, tenantId)

          const { data: newConversation, error: convError } = await supabase.from('conversations').insert({
            tenant_id: tenantId, contact_id: contact.id, channel_id: channel?.id, status: assignedTo ? 'assigned' : 'open', assigned_to: assignedTo, assignment_seen_by_assignee: assignedTo ? false : true, last_message_at: new Date().toISOString(), last_message_preview: text.substring(0, 100)
          }).select().single()

          if (convError) { console.error('Error creating conversation:', convError); continue }
          conversation = newConversation

          await evaluateRoutingRules(supabase, tenantId, conversation.id, contact.id, ruleContext, channel.config, senderId)
        } else {
          await evaluateRoutingRules(supabase, tenantId, conversation.id, contact.id, ruleContext, channel.config, senderId)
          await supabase.from('conversations').update({ last_message_at: new Date().toISOString(), last_message_preview: text.substring(0, 100), unread_count: conversation.unread_count + 1 }).eq('id', conversation.id)
        }

        await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'contact', content: text, metadata: { messenger_message_id: event.message.mid } })
      }
    }

    console.log('Messenger message processed successfully')
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: unknown) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
