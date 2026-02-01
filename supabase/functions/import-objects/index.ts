import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  tenant_id: string;
  object_type_id: string;
  rows: Record<string, string>[];
  column_mapping: Record<string, string>;
  unique_field: string;
  deduplication_strategy: 'skip' | 'update';
  default_status_id?: string;
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
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ImportRequest = await req.json();
    const {
      tenant_id,
      object_type_id,
      rows,
      column_mapping,
      unique_field,
      deduplication_strategy,
      default_status_id,
    } = body;

    console.log(`Starting object import for tenant ${tenant_id}, type ${object_type_id}`);
    console.log(`${rows.length} rows, unique field: ${unique_field}, strategy: ${deduplication_strategy}`);

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has admin/owner role
    const { data: membership } = await supabaseAdmin
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Only admins can import objects' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing objects for deduplication
    const { data: existingObjects } = await supabaseAdmin
      .from('objects')
      .select('id, display_name, metadata')
      .eq('tenant_id', tenant_id)
      .eq('object_type_id', object_type_id)
      .eq('is_archived', false);

    // Build a map for quick lookup
    const existingMap = new Map<string, { id: string; display_name: string; metadata: Record<string, unknown> }>();
    if (existingObjects) {
      for (const obj of existingObjects) {
        let key: string;
        if (unique_field === 'display_name') {
          key = obj.display_name?.toLowerCase() || '';
        } else {
          key = String(obj.metadata?.[unique_field] || '').toLowerCase();
        }
        if (key) {
          existingMap.set(key, obj);
        }
      }
    }

    console.log(`Found ${existingMap.size} existing objects for deduplication`);

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // Get display_name from mapping
        const displayNameColumn = column_mapping['display_name'];
        const displayName = displayNameColumn ? row[displayNameColumn]?.trim() : '';

        if (!displayName) {
          results.errors.push(`Row ${i + 1}: Missing display name`);
          continue;
        }

        // Build metadata from mapped fields
        const metadata: Record<string, unknown> = {
          import_source: 'excel',
          imported_at: new Date().toISOString(),
          imported_by: user.id,
        };

        for (const [fieldName, columnName] of Object.entries(column_mapping)) {
          if (fieldName === 'display_name' || !columnName) continue;

          const value = row[columnName]?.trim();
          if (value) {
            // Try to parse numbers
            const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
            metadata[fieldName] = !isNaN(numValue) ? numValue : value;
          }
        }

        // Check for duplicates
        let uniqueKey: string;
        if (unique_field === 'display_name') {
          uniqueKey = displayName.toLowerCase();
        } else {
          uniqueKey = String(metadata[unique_field] || '').toLowerCase();
        }

        const existingObject = uniqueKey ? existingMap.get(uniqueKey) : null;

        if (existingObject) {
          if (deduplication_strategy === 'skip') {
            results.skipped++;
            continue;
          } else {
            // Update existing
            const { error: updateError } = await supabaseAdmin
              .from('objects')
              .update({
                display_name: displayName,
                metadata: { ...existingObject.metadata, ...metadata },
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingObject.id);

            if (updateError) {
              console.error(`Error updating row ${i}:`, updateError);
              results.errors.push(`Row ${i + 1}: ${updateError.message}`);
              continue;
            }

            results.updated++;
          }
        } else {
          // Insert new object
          const { data: newObject, error: insertError } = await supabaseAdmin
            .from('objects')
            .insert({
              tenant_id,
              object_type_id,
              display_name: displayName,
              metadata,
              status_id: default_status_id || null,
              created_by: user.id,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`Error inserting row ${i}:`, insertError);
            results.errors.push(`Row ${i + 1}: ${insertError.message}`);
            continue;
          }

          // Add to existing map to prevent duplicates within same import
          if (uniqueKey && newObject) {
            existingMap.set(uniqueKey, {
              id: newObject.id,
              display_name: displayName,
              metadata,
            });
          }

          results.imported++;
        }
      } catch (rowError: unknown) {
        const errorMessage = rowError instanceof Error ? rowError.message : 'Unknown error';
        console.error(`Error processing row ${i}:`, rowError);
        results.errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    console.log('Import complete:', results);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
