
# MVP Implementation Plan: Custom Business Objects & AI Assistant

This plan covers the complete implementation of the missing MVP features: Custom Business Objects, Object Data Import, Object-Conversation Linking, and the AI Assistant.

---

## Current State Summary

**Already Built:**
- Multi-tenant omnichannel inbox (Telegram, WhatsApp, Messenger, Instagram, Web Chat)
- Real-time messaging with channel-specific webhooks
- Contact management with linking and lead statuses
- Routing rules engine for automated lead distribution
- Role-based access control (Owner, Admin, Sales Rep)
- Lead import from CSV/Excel (for contacts only)

**Missing for MVP:**
1. Custom Business Objects (Object Types, Fields, Statuses)
2. Object Data Import (separate from contact import)
3. Object-Conversation Linking
4. AI Assistant (intent detection, structured search, suggestions)

---

## Implementation Phases

### Phase 1: Database Schema (Foundation)

Create the core tables for the business objects system.

**New Tables:**

| Table | Purpose |
|-------|---------|
| `object_types` | Define what types of items the tenant sells (Flat, Car, Parcel) |
| `object_type_fields` | Custom fields for each object type (text, number, price, select, relation) |
| `object_statuses` | Status definitions per object type (Available, Reserved, Sold) |
| `objects` | The actual business objects/inventory items |
| `object_field_values` | Field values for each object (EAV pattern for flexibility) |
| `conversation_objects` | Links between conversations and objects |

**Schema Design:**

```text
object_types
+------------------+----------+------------------------------------------+
| Column           | Type     | Description                              |
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| tenant_id        | uuid     | Tenant isolation                         |
| name             | text     | Singular name (e.g., "Flat")             |
| name_plural      | text     | Plural name (e.g., "Flats")              |
| icon             | text     | Icon name from lucide                    |
| is_archived      | boolean  | Soft delete                              |
| created_by       | uuid     | User who created                         |
| created_at       | timestamp|                                          |
| updated_at       | timestamp|                                          |
+------------------+----------+------------------------------------------+

object_type_fields
+------------------+----------+------------------------------------------+
| Column           | Type     | Description                              |
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| tenant_id        | uuid     | Tenant isolation                         |
| object_type_id   | uuid     | FK to object_types                       |
| name             | text     | Field name (e.g., "bedrooms")            |
| label            | text     | Display label (e.g., "Bedrooms")         |
| field_type       | text     | text, number, price, select, relation    |
| field_config     | jsonb    | Options for select, currency for price   |
| is_required      | boolean  | Validation flag                          |
| is_searchable    | boolean  | Available to AI and filters              |
| display_order    | integer  | Field ordering                           |
| created_at       | timestamp|                                          |
+------------------+----------+------------------------------------------+

object_statuses
+------------------+----------+------------------------------------------+
| Column           | Type     | Description                              |
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| tenant_id        | uuid     | Tenant isolation                         |
| object_type_id   | uuid     | FK to object_types                       |
| name             | text     | Status name (e.g., "Available")          |
| color            | text     | Status color                             |
| is_default       | boolean  | Default status for new objects           |
| display_order    | integer  | Status ordering                          |
| created_at       | timestamp|                                          |
+------------------+----------+------------------------------------------+

objects
+------------------+----------+------------------------------------------+
| Column           | Type     | Description                              |
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| tenant_id        | uuid     | Tenant isolation                         |
| object_type_id   | uuid     | FK to object_types                       |
| status_id        | uuid     | FK to object_statuses                    |
| display_name     | text     | Generated name for display               |
| is_archived      | boolean  | Soft delete                              |
| metadata         | jsonb    | Store all field values as JSON           |
| created_by       | uuid     | User who created                         |
| created_at       | timestamp|                                          |
| updated_at       | timestamp|                                          |
+------------------+----------+------------------------------------------+

conversation_objects
+------------------+----------+------------------------------------------+
| Column           | Type     | Description                              |
+------------------+----------+------------------------------------------+
| id               | uuid     | Primary key                              |
| tenant_id        | uuid     | Tenant isolation                         |
| conversation_id  | uuid     | FK to conversations                      |
| object_id        | uuid     | FK to objects                            |
| linked_by        | uuid     | User who linked                          |
| linked_at        | timestamp| When it was linked                       |
+------------------+----------+------------------------------------------+
```

**RLS Policies:**
- Object Types: Admins can CRUD, Sales can read non-archived
- Objects: Admins can CRUD all, Sales can read and update status only
- Conversation Objects: All tenant members can CRUD

---

### Phase 2: Object Types Management UI

Build the admin interface for creating and managing object types.

**New Files:**

| File | Purpose |
|------|---------|
| `src/pages/Objects.tsx` | Main objects management page with tabs |
| `src/components/objects/ObjectTypeList.tsx` | List of object types |
| `src/components/objects/ObjectTypeEditor.tsx` | Create/edit object type dialog |
| `src/components/objects/FieldBuilder.tsx` | Visual field configuration |
| `src/components/objects/ObjectStatusEditor.tsx` | Manage statuses per type |
| `src/lib/objectTypes.ts` | TypeScript interfaces and constants |

**UI Flow:**
1. Objects page shows tabs: "Types" (admin only) | "Inventory" (all)
2. Object Type List shows cards for each type with field count and object count
3. Clicking a type opens the editor with:
   - Name (singular/plural)
   - Icon selector
   - Fields section with drag-and-drop ordering
   - Statuses section with color/default configuration

**Field Type Configuration:**
- Text: max length option
- Number: min/max/decimal options
- Price: currency selector (USD, EUR, GEL, etc.)
- Select: options list with add/remove
- Relation to Contact: links to existing contacts

---

### Phase 3: Object Inventory Management

Build the interface for viewing and managing actual objects.

**New Files:**

| File | Purpose |
|------|---------|
| `src/components/objects/ObjectsTable.tsx` | Data table with dynamic columns |
| `src/components/objects/ObjectEditor.tsx` | Create/edit object dialog |
| `src/components/objects/ObjectFilters.tsx` | Filter panel for status and fields |
| `src/components/objects/DynamicFieldInput.tsx` | Render input based on field type |

**Features:**
- Table view with columns based on object type fields
- Quick status change via dropdown in table row
- Search across searchable fields
- Filter by status and field values
- Bulk select and archive
- Click row to open detail editor

---

### Phase 4: Object Data Import

Extend the existing import system to support custom objects.

**Modified Files:**

| File | Changes |
|------|---------|
| `src/components/objects/ImportObjectsDialog.tsx` | New dialog for object import |
| `supabase/functions/import-objects/index.ts` | New edge function for object import |

**Import Flow:**
1. Select Object Type (dropdown of available types)
2. Upload CSV/XLSX file
3. Map columns to object type fields
4. Select unique identifier field for deduplication
5. Choose deduplication strategy: Skip existing OR Update existing
6. Preview with validation errors (missing required fields, invalid values)
7. Import with progress indicator
8. Results summary with success/skip/error counts

**Validation:**
- Required fields must be mapped
- Select fields validate against defined options
- Price fields validate as numeric
- Relation fields match against existing contact emails/phones

---

### Phase 5: Object-Conversation Linking

Enable sales reps to attach objects to conversations.

**New Files:**

| File | Purpose |
|------|---------|
| `src/components/inbox/LinkedObjectsPanel.tsx` | Sidebar panel showing linked objects |
| `src/components/inbox/LinkObjectDialog.tsx` | Dialog to search and link objects |
| `src/components/inbox/ObjectPreviewCard.tsx` | Compact object display with status |

**Modified Files:**

| File | Changes |
|------|---------|
| `src/components/inbox/ChatView.tsx` | Add linked objects panel to sidebar |
| `src/pages/Inbox.tsx` | Fetch and manage linked objects state |

**Features:**
- Linked objects visible in chat sidebar (below contact details)
- Object preview shows: name, key fields (price, status), current status
- Quick status change from the preview card
- "Link Object" button opens search dialog
- Search filters by object type and status
- Unlink object with confirmation
- "Create Object" option in dialog for manual creation

---

### Phase 6: AI Assistant Backend

Build the AI-powered intent detection and object search.

**New Edge Functions:**

| Function | Purpose |
|----------|---------|
| `supabase/functions/ai-analyze-message/index.ts` | Detect intent and extract filters |
| `supabase/functions/ai-search-objects/index.ts` | Query objects with extracted filters |
| `supabase/functions/ai-generate-reply/index.ts` | Generate draft reply with object references |

**AI Analyze Message Flow:**
```text
Input: { message: "I need a 2-bedroom under $120k", tenant_id, object_types }

1. Call Lovable AI (google/gemini-3-flash-preview) with structured output
2. Extract:
   - object_type: "Flat" (or null if unclear)
   - filters: { bedrooms: 2, price_max: 120000 }
   - confidence: 0.85

Output: { object_type_id, filters, confidence }
```

**AI Search Objects Flow:**
```text
Input: { tenant_id, object_type_id, filters }

1. Build dynamic query against objects table
2. Filter by status = Available (or valid statuses)
3. Match filters against metadata fields
4. Limit to top 5 matches
5. Score by relevance

Output: { objects: [...], explanation: "Found 3 flats matching your criteria" }
```

**AI Generate Reply Flow:**
```text
Input: { customer_message, matched_objects, tenant_context }

1. Call Lovable AI with objects data
2. Generate professional sales response
3. Reference real object data (no hallucination)

Output: { draft_message, referenced_object_ids }
```

---

### Phase 7: AI Assistant UI

Integrate AI suggestions into the chat interface.

**New Files:**

| File | Purpose |
|------|---------|
| `src/components/inbox/AISuggestionsPanel.tsx` | AI suggestions display |
| `src/components/inbox/ObjectMatchCard.tsx` | Object match with explanation |
| `src/components/inbox/DraftReplyEditor.tsx` | Editable AI draft with send button |
| `src/hooks/useAIAssistant.tsx` | Hook for AI state management |

**Modified Files:**

| File | Changes |
|------|---------|
| `src/components/inbox/ChatView.tsx` | Add AI panel below messages |
| `src/pages/Inbox.tsx` | Trigger AI analysis on new customer messages |

**UI Behavior:**
1. When a new customer message arrives, automatically analyze (debounced)
2. If intent detected with confidence > 0.6:
   - Show "AI Suggestions" panel below chat
   - Display matched objects as cards
   - Show draft reply in editable textarea
3. Sales rep can:
   - Click object card to link to conversation
   - Edit the draft reply
   - Click "Send" to send the message (manual confirmation required)
   - Click "Dismiss" to hide suggestions
4. AI cannot:
   - Modify object data
   - Change object status
   - Send messages automatically

**Guardrails Implementation:**
- All AI actions are read-only by default
- Object status changes require explicit user click
- Messages must be sent manually via button
- AI responses include disclaimer: "Suggested by AI - verify before sending"
- All AI actions logged for audit

---

### Phase 8: Navigation & Permissions

Update the sidebar and routing.

**Modified Files:**

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Add "Objects" nav item |
| `src/App.tsx` | Add `/objects` route |
| `src/lib/types.ts` | Add new interfaces |

**Navigation:**
- New "Objects" item with Package icon
- Available to all roles (admin sees Types tab, sales sees Inventory only)

---

## File Summary

**New Files (22 total):**
- `src/pages/Objects.tsx`
- `src/components/objects/ObjectTypeList.tsx`
- `src/components/objects/ObjectTypeEditor.tsx`
- `src/components/objects/FieldBuilder.tsx`
- `src/components/objects/ObjectStatusEditor.tsx`
- `src/components/objects/ObjectsTable.tsx`
- `src/components/objects/ObjectEditor.tsx`
- `src/components/objects/ObjectFilters.tsx`
- `src/components/objects/DynamicFieldInput.tsx`
- `src/components/objects/ImportObjectsDialog.tsx`
- `src/components/inbox/LinkedObjectsPanel.tsx`
- `src/components/inbox/LinkObjectDialog.tsx`
- `src/components/inbox/ObjectPreviewCard.tsx`
- `src/components/inbox/AISuggestionsPanel.tsx`
- `src/components/inbox/ObjectMatchCard.tsx`
- `src/components/inbox/DraftReplyEditor.tsx`
- `src/hooks/useAIAssistant.tsx`
- `src/lib/objectTypes.ts`
- `supabase/functions/import-objects/index.ts`
- `supabase/functions/ai-analyze-message/index.ts`
- `supabase/functions/ai-search-objects/index.ts`
- `supabase/functions/ai-generate-reply/index.ts`

**Modified Files (5 total):**
- `src/App.tsx` - Add route
- `src/components/layout/AppSidebar.tsx` - Add nav item
- `src/components/inbox/ChatView.tsx` - Add linked objects and AI panels
- `src/pages/Inbox.tsx` - Add AI state management
- `src/lib/types.ts` - Add interfaces

**Database Migrations (1 total):**
- 6 new tables with RLS policies

---

## Recommended Build Order

1. **Phase 1**: Database schema (all tables in one migration)
2. **Phase 2**: Object Types Management (admin can define object types)
3. **Phase 3**: Objects Table & Editor (can manually create objects)
4. **Phase 4**: Object Import (bulk data loading)
5. **Phase 5**: Object-Conversation Linking (connect objects to chats)
6. **Phase 6**: AI Backend (edge functions for analysis)
7. **Phase 7**: AI UI (integrate suggestions into chat)
8. **Phase 8**: Final polish and testing

Each phase is independently testable and provides incremental value.

---

## Estimated Effort

| Phase | Complexity | Description |
|-------|------------|-------------|
| 1 | Medium | Database schema design and migration |
| 2 | High | Object type management with field builder |
| 3 | Medium | Dynamic table and object CRUD |
| 4 | Medium | Import with field mapping and validation |
| 5 | Low | Linking UI and sidebar integration |
| 6 | High | AI integration with structured output |
| 7 | Medium | AI UI components and state management |
| 8 | Low | Navigation and final integration |

Total: Approximately 8-10 implementation sessions.
