import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'sales';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is from an authenticated super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's token to verify they're super admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser } } = await userClient.auth.getUser();
    if (!requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is super admin
    const { data: superAdminRole } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!superAdminRole) {
      throw new Error('Only super admins can create users');
    }

    // Parse request body
    const { email, password, fullName, tenantId, role }: CreateUserRequest = await req.json();

    if (!email || !password || !fullName || !tenantId || !role) {
      throw new Error('Missing required fields');
    }

    // Create admin client for user creation
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create the user
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    const newUserId = userData.user.id;

    // Create profile (the trigger should do this, but let's ensure it exists)
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        user_id: newUserId,
        email,
        full_name: fullName,
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Create tenant membership
    const { error: membershipError } = await adminClient
      .from('tenant_memberships')
      .insert({
        user_id: newUserId,
        tenant_id: tenantId,
        role,
        is_active: true,
      });

    if (membershipError) {
      // Rollback: delete the user
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(`Failed to create membership: ${membershipError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUserId,
        message: 'User created successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error in create-user function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
