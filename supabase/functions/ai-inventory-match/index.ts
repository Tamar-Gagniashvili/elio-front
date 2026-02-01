import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedIntent {
  object_type?: string;
  filters: {
    field: string;
    operator: "eq" | "gte" | "lte" | "contains";
    value: string | number;
  }[];
  keywords: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, tenantId } = await req.json();
    
    if (!messages || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: messages, tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch available object types and their fields for context
    const { data: objectTypes } = await supabase
      .from("object_types")
      .select("id, name, name_plural")
      .eq("tenant_id", tenantId)
      .eq("is_archived", false);

    const { data: objectFields } = await supabase
      .from("object_type_fields")
      .select("object_type_id, name, label, field_type")
      .in("object_type_id", objectTypes?.map(t => t.id) || []);

    // Build schema context for the AI
    const schemaContext = (objectTypes || []).map(type => {
      const fields = (objectFields || []).filter(f => f.object_type_id === type.id);
      return {
        type: type.name,
        typePlural: type.name_plural,
        fields: fields.map(f => `${f.label} (${f.name}): ${f.field_type}`)
      };
    });

    // Extract recent customer messages
    const customerMessages = messages
      .filter((m: any) => m.sender_type === "contact")
      .slice(-5)
      .map((m: any) => m.content)
      .join("\n");

    if (!customerMessages.trim()) {
      return new Response(
        JSON.stringify({ intent: null, matches: [], message: "No customer messages to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call AI to extract intent
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an intent extraction assistant for a sales inventory system. 
            
Available inventory types and their fields:
${JSON.stringify(schemaContext, null, 2)}

Extract the customer's intent from their messages. Identify:
1. What type of item they're looking for
2. Any specific requirements (price range, size, location, features)
3. Keywords that could help match items

Return structured data that can be used to search the inventory.`
          },
          {
            role: "user",
            content: `Extract the customer's inventory requirements from these messages:\n\n${customerMessages}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_intent",
              description: "Extract customer intent for inventory matching",
              parameters: {
                type: "object",
                properties: {
                  object_type: {
                    type: "string",
                    description: "The type of inventory item (e.g., 'Flat', 'Building', 'Parcel')"
                  },
                  filters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", description: "Field name to filter on" },
                        operator: { type: "string", enum: ["eq", "gte", "lte", "contains"] },
                        value: { type: ["string", "number"] }
                      },
                      required: ["field", "operator", "value"]
                    }
                  },
                  keywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Keywords for text search"
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary of what the customer is looking for"
                  }
                },
                required: ["filters", "keywords"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_intent" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ intent: null, matches: [], message: "Could not extract intent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const intent = JSON.parse(toolCall.function.arguments) as ExtractedIntent & { summary?: string };

    // Find matching object type
    const matchedType = objectTypes?.find(
      t => t.name.toLowerCase() === intent.object_type?.toLowerCase() ||
           t.name_plural.toLowerCase() === intent.object_type?.toLowerCase()
    );

    if (!matchedType) {
      return new Response(
        JSON.stringify({ 
          intent, 
          matches: [], 
          message: "No matching inventory type found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query inventory with filters
    let query = supabase
      .from("objects")
      .select("*, object_statuses(*)")
      .eq("tenant_id", tenantId)
      .eq("object_type_id", matchedType.id)
      .eq("is_archived", false);

    // We can't directly filter JSONB with dynamic fields via Supabase client easily,
    // so we'll fetch and filter in memory for now
    const { data: allObjects } = await query.limit(100);

    // Filter objects based on extracted intent
    const matches = (allObjects || []).filter(obj => {
      const metadata = (obj.metadata || {}) as Record<string, any>;
      
      for (const filter of intent.filters) {
        const value = metadata[filter.field];
        if (value === undefined) continue;
        
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        const filterNum = typeof filter.value === 'number' ? filter.value : parseFloat(String(filter.value));
        
        switch (filter.operator) {
          case "eq":
            if (String(value).toLowerCase() !== String(filter.value).toLowerCase()) return false;
            break;
          case "gte":
            if (!isNaN(numValue) && !isNaN(filterNum) && numValue < filterNum) return false;
            break;
          case "lte":
            if (!isNaN(numValue) && !isNaN(filterNum) && numValue > filterNum) return false;
            break;
          case "contains":
            if (!String(value).toLowerCase().includes(String(filter.value).toLowerCase())) return false;
            break;
        }
      }
      
      // Keyword matching in display_name or metadata
      if (intent.keywords.length > 0) {
        const searchText = [
          obj.display_name,
          ...Object.values(metadata).map(v => String(v))
        ].join(" ").toLowerCase();
        
        const hasKeyword = intent.keywords.some(kw => 
          searchText.includes(kw.toLowerCase())
        );
        // Keywords are optional boost, not strict filter
      }
      
      return true;
    }).slice(0, 10).map(obj => ({
      ...obj,
      status: obj.object_statuses
    }));

    return new Response(
      JSON.stringify({
        intent: {
          ...intent,
          objectType: matchedType
        },
        matches,
        message: intent.summary || `Found ${matches.length} matching items`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI inventory match error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});