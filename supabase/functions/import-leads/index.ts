import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  tenant_id: string;
  rows: Record<string, string>[];
  column_mapping: {
    name?: string;
    email?: string;
    phone?: string;
    external_id?: string;
  };
  assignment_strategy: 'none' | 'round_robin' | 'single_user' | 'routing_rule';
  assignment_config?: {
    user_ids?: string[]; // For round_robin or single_user
    rule_id?: string;    // For routing_rule
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ImportRequest = await req.json();
    const { tenant_id, rows, column_mapping, assignment_strategy, assignment_config } = body;

    console.log(`Starting import for tenant ${tenant_id}, ${rows.length} rows`);
    console.log('Column mapping:', column_mapping);
    console.log('Assignment strategy:', assignment_strategy);

    // Verify user is admin/owner for this tenant
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: membership } = await supabaseAdmin
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Only admins can import leads' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get assignment target users for round-robin
    let assignmentUsers: string[] = [];
    let currentAssignmentIndex = 0;

    if (assignment_strategy === 'round_robin' && assignment_config?.user_ids?.length) {
      assignmentUsers = assignment_config.user_ids;
    } else if (assignment_strategy === 'single_user' && assignment_config?.user_ids?.[0]) {
      assignmentUsers = [assignment_config.user_ids[0]];
    }

    // Get routing rule if specified
    let routingRule: { conditions: unknown; actions: unknown } | null = null;
    if (assignment_strategy === 'routing_rule' && assignment_config?.rule_id) {
      const { data: rule } = await supabaseAdmin
        .from('routing_rules')
        .select('conditions, actions')
        .eq('id', assignment_config.rule_id)
        .eq('tenant_id', tenant_id)
        .single();
      
      routingRule = rule;
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        // Build contact data from mapping
        const contactData: Record<string, unknown> = {
          tenant_id,
          channel_type: 'offline',
          metadata: { 
            import_source: 'excel',
            imported_at: new Date().toISOString(),
            imported_by: user.id,
            original_row: row, // Store original data
          },
        };

        // Map columns
        if (column_mapping.name && row[column_mapping.name]) {
          contactData.name = row[column_mapping.name].trim();
        }
        if (column_mapping.email && row[column_mapping.email]) {
          contactData.email = row[column_mapping.email].trim().toLowerCase();
        }
        if (column_mapping.phone && row[column_mapping.phone]) {
          contactData.phone = row[column_mapping.phone].trim();
        }
        if (column_mapping.external_id && row[column_mapping.external_id]) {
          contactData.external_id = row[column_mapping.external_id].trim();
        }

        // Skip if no identifying info
        if (!contactData.name && !contactData.email && !contactData.phone) {
          results.skipped++;
          continue;
        }

        // Check for duplicate (by email or phone)
        let existingContact = null;
        if (contactData.email) {
          const { data } = await supabaseAdmin
            .from('contacts')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('email', contactData.email)
            .single();
          existingContact = data;
        }
        if (!existingContact && contactData.phone) {
          const { data } = await supabaseAdmin
            .from('contacts')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('phone', contactData.phone)
            .single();
          existingContact = data;
        }

        if (existingContact) {
          results.skipped++;
          continue;
        }

        // Insert contact
        const { data: newContact, error: insertError } = await supabaseAdmin
          .from('contacts')
          .insert(contactData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error inserting row ${i}:`, insertError);
          results.errors.push(`Row ${i + 1}: ${insertError.message}`);
          continue;
        }

        // Handle assignment based on strategy
        let assignedTo: string | null = null;

        if (assignment_strategy === 'round_robin' && assignmentUsers.length > 0) {
          assignedTo = assignmentUsers[currentAssignmentIndex % assignmentUsers.length];
          currentAssignmentIndex++;
        } else if (assignment_strategy === 'single_user' && assignmentUsers.length > 0) {
          assignedTo = assignmentUsers[0];
        } else if (assignment_strategy === 'routing_rule' && routingRule) {
          // Extract assign_user action from rule
          const actions = routingRule.actions as { actions: Array<{ type: string; user_id?: string }> };
          const assignAction = actions?.actions?.find(a => a.type === 'assign_user');
          if (assignAction?.user_id) {
            assignedTo = assignAction.user_id;
          }
        }

        // If assigned, create a conversation for this contact
        if (assignedTo) {
          await supabaseAdmin
            .from('conversations')
            .insert({
              tenant_id,
              contact_id: newContact.id,
              assigned_to: assignedTo,
              status: 'assigned',
              last_message_preview: 'Imported lead',
              last_message_at: new Date().toISOString(),
            });
        }

        // Apply status from routing rule if applicable
        if (assignment_strategy === 'routing_rule' && routingRule) {
          const actions = routingRule.actions as { actions: Array<{ type: string; status_id?: string }> };
          const statusAction = actions?.actions?.find(a => a.type === 'apply_status');
          if (statusAction?.status_id) {
            await supabaseAdmin
              .from('contact_statuses')
              .insert({
                tenant_id,
                contact_id: newContact.id,
                status_id: statusAction.status_id,
                created_by: user.id,
              });
          }
        }

        results.imported++;
      } catch (rowError: unknown) {
        const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error';
        console.error(`Error processing row ${i}:`, rowError);
        results.errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    console.log('Import complete:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
