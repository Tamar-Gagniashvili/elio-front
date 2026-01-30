

# Lead Routing Rules Engine

## Overview

Build a flexible rules engine that allows tenant admins to define custom conditions for how incoming leads are automatically routed, assigned, and handled. This transforms the current simple round-robin distribution into a sophisticated, configurable workflow system.

## What You'll Get

### Rules Management Page (`/rules`)
A dedicated page where admins can create, edit, and prioritize routing rules with a visual rule builder.

### Rule Types
- **Assignment Rules** - Route leads to specific team members based on conditions
- **Auto-Reply Rules** - Send automatic responses based on channel or message content
- **Status Rules** - Automatically apply lead statuses based on criteria
- **Escalation Rules** - Route to managers when conditions are met

### Condition Builder
Match leads based on:
- **Channel** - Telegram, WhatsApp, Web Chat, etc.
- **Contact properties** - Name contains, email domain, phone prefix
- **Message content** - Keywords, language detection
- **Time-based** - Business hours, day of week
- **Lead status** - Has/doesn't have specific statuses

### Actions
- Assign to specific sales rep
- Assign to sales rep pool (round-robin within subset)
- Apply lead status
- Send auto-reply message
- Set priority level

## Visual Preview

```text
+------------------------------------------+
|  Routing Rules                     [+ New Rule]  |
+------------------------------------------+
| Priority | Rule Name          | Status   |
|----------|-------------------|----------|
| 1        | VIP WhatsApp      | Active   |
| 2        | Spanish Speakers  | Active   |
| 3        | Business Hours    | Active   |
| 4        | Default Round-Robin| Active  |
+------------------------------------------+

Rule Editor:
+------------------------------------------+
| IF channel = "whatsapp"                  |
| AND message contains "urgent"            |
| THEN assign to: Senior Sales Team        |
|      apply status: "VIP Lead"            |
+------------------------------------------+
```

---

## Technical Implementation

### Database Schema

**`routing_rules`** - Core rules table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Tenant isolation |
| name | text | Human-readable rule name |
| description | text | Optional description |
| priority | integer | Execution order (lower = first) |
| is_active | boolean | Enable/disable rule |
| conditions | jsonb | Rule conditions (structured JSON) |
| actions | jsonb | Actions to execute |
| created_by | uuid | User who created |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last modified |

**`rule_action_logs`** - Audit trail for rule executions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | Tenant isolation |
| rule_id | uuid | Which rule fired |
| conversation_id | uuid | Affected conversation |
| contact_id | uuid | Affected contact |
| action_type | text | What action was taken |
| action_details | jsonb | Action parameters |
| created_at | timestamp | When it fired |

### Condition Schema (JSONB)

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "channel_type", "operator": "equals", "value": "whatsapp" },
    { "field": "message_content", "operator": "contains", "value": "urgent" },
    { "field": "contact.email", "operator": "ends_with", "value": "@enterprise.com" }
  ]
}
```

### Action Schema (JSONB)

```json
{
  "actions": [
    { "type": "assign_to_user", "user_id": "uuid-here" },
    { "type": "assign_to_pool", "user_ids": ["uuid1", "uuid2"] },
    { "type": "apply_status", "status_id": "uuid-here" },
    { "type": "send_message", "content": "Thanks for reaching out!" }
  ]
}
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Rules.tsx` | Main rules management page |
| `src/components/rules/RuleCard.tsx` | Display individual rule with actions |
| `src/components/rules/RuleEditor.tsx` | Create/edit rule dialog |
| `src/components/rules/ConditionBuilder.tsx` | Visual condition builder |
| `src/components/rules/ActionBuilder.tsx` | Action configuration |
| `src/lib/ruleTypes.ts` | TypeScript interfaces for rules |
| `supabase/functions/evaluate-rules/index.ts` | Shared rule evaluation logic |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add RoutingRule, RuleCondition, RuleAction interfaces |
| `src/components/layout/AppSidebar.tsx` | Add Rules navigation item |
| `src/App.tsx` | Add /rules route |
| `supabase/functions/webhook-telegram/index.ts` | Replace getNextSalesRep with rule evaluation |
| `supabase/functions/webhook-whatsapp/index.ts` | Replace getNextSalesRep with rule evaluation |
| `supabase/functions/webchat/index.ts` | Replace getNextSalesRep with rule evaluation |

### Rule Evaluation Flow

```text
1. New message arrives via webhook
           |
           v
2. Load active rules for tenant (ordered by priority)
           |
           v
3. For each rule:
   - Evaluate conditions against contact/message
   - If match: execute actions, stop (or continue based on config)
           |
           v
4. If no rules match: fall back to round-robin
           |
           v
5. Log rule execution to rule_action_logs
```

### Shared Rule Evaluator (Edge Function Helper)

```typescript
interface EvaluationContext {
  contact: Contact;
  message: { content: string; metadata: any };
  channel_type: string;
  tenant_id: string;
}

async function evaluateRules(
  supabase: any, 
  context: EvaluationContext
): Promise<{ assignedTo: string | null; statusId: string | null; autoReply: string | null }> {
  // Fetch rules ordered by priority
  const { data: rules } = await supabase
    .from('routing_rules')
    .select('*')
    .eq('tenant_id', context.tenant_id)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  for (const rule of rules) {
    if (evaluateConditions(rule.conditions, context)) {
      return executeActions(supabase, rule.actions, context, rule.id);
    }
  }
  
  // Fallback to round-robin
  return { assignedTo: await getNextSalesRep(supabase, context.tenant_id), statusId: null, autoReply: null };
}
```

### Security (RLS)

- Admins/Owners can create, edit, delete rules
- All tenant members can view rules (read-only for sales reps)
- Rule action logs are viewable by admins

---

## Implementation Phases

### Phase 1: Database & Types
- Create migration for routing_rules and rule_action_logs tables
- Add RLS policies
- Define TypeScript interfaces

### Phase 2: Rules Page UI
- Build Rules.tsx management page
- Create RuleCard component with enable/disable toggle
- Add drag-and-drop priority reordering

### Phase 3: Rule Builder
- Build ConditionBuilder with visual condition rows
- Build ActionBuilder for selecting actions
- Create RuleEditor dialog combining both

### Phase 4: Backend Integration
- Create evaluate-rules edge function logic
- Update all webhook handlers to use rule evaluation
- Implement action execution (assign, status, auto-reply)

### Phase 5: Logging & Analytics
- Log all rule executions
- Show rule activity on Rules page
- Add "Why was this assigned?" indicator in inbox

---

## Admin-Only Access

The Rules page and management will be restricted to Admin/Owner roles, matching the same permission model used for Status definitions and team management.

