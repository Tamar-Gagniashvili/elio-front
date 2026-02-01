import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AES-GCM encryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = Deno.env.get('CHANNEL_ENCRYPTION_KEY')
  if (!keyString) {
    throw new Error('CHANNEL_ENCRYPTION_KEY not configured')
  }
  
  // Create a consistent 256-bit key from the secret
  const encoder = new TextEncoder()
  const keyData = encoder.encode(keyString)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey()
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)
  
  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )
  
  // Combine IV + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey()
  
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

// Fields that contain sensitive credentials and should be encrypted
const SENSITIVE_FIELDS: Record<string, string[]> = {
  telegram: ['bot_token', 'secret_token'],
  whatsapp: ['access_token', 'verify_token'],
  messenger: ['page_access_token', 'app_secret', 'verify_token'],
  instagram: ['page_access_token', 'app_secret', 'verify_token'],
  sms: ['auth_token'],
  tiktok: ['access_token', 'app_secret'],
  email: ['email_password'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, channelType, config, tenantId } = await req.json()

    // Verify user is a tenant member
    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a tenant member' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Only admins/owners can manage channel config
    if (action === 'encrypt' && !['admin', 'owner'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const sensitiveFields = SENSITIVE_FIELDS[channelType] || []

    if (action === 'encrypt') {
      // Encrypt sensitive fields
      const encryptedConfig: Record<string, string> = {}
      
      for (const [key, value] of Object.entries(config)) {
        if (sensitiveFields.includes(key) && typeof value === 'string' && value) {
          // Skip if already encrypted (starts with specific pattern)
          if (value.startsWith('enc:')) {
            encryptedConfig[key] = value
          } else {
            const encrypted = await encrypt(value)
            encryptedConfig[key] = `enc:${encrypted}`
          }
        } else {
          encryptedConfig[key] = value as string
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        config: encryptedConfig 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('Encryption error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
