import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type MetaError = {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
  fbtrace_id?: string
}

type MetaSendResponse = {
  message_id?: string
  error?: MetaError
}

type MetaAccountsResponse = {
  data?: Array<{
    id: string
    name?: string
    access_token?: string
  }>
  error?: MetaError
}

async function postMessengerMessage(params: {
  target: string
  pageToken: string
  recipientId: string
  content: string
}): Promise<{ ok: boolean; result: MetaSendResponse; status: number }> {
  const { target, pageToken, recipientId, content } = params
  const url = `https://graph.facebook.com/v25.0/${target}/messages?access_token=${encodeURIComponent(pageToken)}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text: content },
    }),
  })

  const result = (await response.json()) as MetaSendResponse
  return { ok: response.ok, result, status: response.status }
}

async function resolvePageTokenFromUserToken(params: {
  token: string
  preferredPageId?: string
}): Promise<{ pageId: string; pageToken: string } | null> {
  const { token, preferredPageId } = params

  const response = await fetch(
    `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(token)}`
  )

  const result = (await response.json()) as MetaAccountsResponse
  if (!response.ok || !result.data?.length) return null

  const matched = preferredPageId
    ? result.data.find((page) => page.id === preferredPageId)
    : result.data[0]

  if (!matched?.access_token) return null

  return {
    pageId: matched.id,
    pageToken: matched.access_token,
  }
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

    const configuredPageId = ((channel.config as any)?.page_id || '').trim()
    const sendTargets = Array.from(new Set(['me', configuredPageId].filter(Boolean)))
    let lastFailure: { target: string; status: number; result: MetaSendResponse } | null = null

    for (const target of sendTargets) {
      console.log(`Sending message via target: ${target} to recipient: ${recipientId}`)
      const attempt = await postMessengerMessage({
        target,
        pageToken,
        recipientId,
        content,
      })

      console.log(`Facebook API response (${target}):`, attempt.result)

      if (attempt.ok) {
        return new Response(JSON.stringify({ success: true, message_id: attempt.result.message_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      lastFailure = { target, status: attempt.status, result: attempt.result }
    }

    const resolved = await resolvePageTokenFromUserToken({
      token: pageToken,
      preferredPageId: configuredPageId || undefined,
    })

    if (resolved) {
      console.log(`Resolved page token from /me/accounts for page_id: ${resolved.pageId}`)
      const recoveredAttempt = await postMessengerMessage({
        target: resolved.pageId,
        pageToken: resolved.pageToken,
        recipientId,
        content,
      })

      console.log(`Facebook API response (resolved:${resolved.pageId}):`, recoveredAttempt.result)

      if (recoveredAttempt.ok) {
        return new Response(JSON.stringify({ success: true, message_id: recoveredAttempt.result.message_id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      lastFailure = { target: resolved.pageId, status: recoveredAttempt.status, result: recoveredAttempt.result }
    }

    const fallbackMessage = lastFailure?.result?.error?.message || 'Failed to send message'
    const errorContext = {
      target: lastFailure?.target,
      code: lastFailure?.result?.error?.code,
      subcode: lastFailure?.result?.error?.error_subcode,
      type: lastFailure?.result?.error?.type,
      trace: lastFailure?.result?.error?.fbtrace_id,
    }

    return new Response(JSON.stringify({ error: fallbackMessage, meta: errorContext }), {
      status: 500,
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
