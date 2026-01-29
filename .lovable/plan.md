
# Link Contacts Feature

## Status: ✅ Implemented

## Overview
Add the ability for sales reps and admins to link contacts across different channels (Web Chat, Telegram, WhatsApp, etc.) to indicate they represent the same person. This preserves all original contacts and conversations while creating a relationship between them for better customer tracking.

## What You Will See

When viewing a conversation, a new "Link Contact" option will appear in the menu (the three dots). Clicking it opens a dialog where you can:
- See all contacts currently linked to this person
- Search for other contacts to link
- Unlink contacts if needed

The Contact Details panel on the right side of the chat will also show a "Linked Contacts" section displaying all related contacts with their channel badges (Telegram, WhatsApp, etc.), so sales can immediately see all the ways a customer has contacted you.

---

## Technical Implementation

### 1. Database Changes ✅

**New Table: `contact_links`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | For tenant isolation (RLS) |
| contact_id | uuid | Reference to contacts table |
| link_group_id | uuid | Shared ID for all linked contacts |
| created_at | timestamp | When link was created |
| created_by | uuid | User who created the link |

**How It Works:**
- All contacts that are linked together share the same `link_group_id`
- When linking Contact A to Contact B:
  - If neither has a link group: create new group ID for both
  - If one has a group: add the other to that group
  - If both have different groups: merge the groups into one

**Security (RLS Policies):**
- Tenant members can view, create, and delete links within their tenant
- Super admins have full access

### 2. New Files ✅

| File | Purpose |
|------|---------|
| `src/components/inbox/LinkContactDialog.tsx` | Modal for linking/unlinking contacts |

### 3. Modified Files ✅

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Add `ContactLink` interface |
| `src/components/inbox/ChatView.tsx` | Add menu option + linked contacts display |
| `src/pages/Inbox.tsx` | Fetch linked contacts, handle state refresh |

---

## User Interface Flow

**Step 1: Open Link Dialog**
From the chat header dropdown menu, click "Link Contact"

**Step 2: Link Contacts**
- See currently linked contacts (with option to unlink)
- Search for other contacts by name
- Click "+" to link a contact

**Step 3: View Linked Contacts**
The Contact Details panel shows all linked contacts with their respective channel badges

---

## Implementation Steps

1. ✅ Create database migration for `contact_links` table with RLS policies
2. ✅ Add `ContactLink` type to `src/lib/types.ts`
3. ✅ Create `LinkContactDialog.tsx` component with:
   - Search/filter contacts
   - Display linked contacts with unlink option
   - Add new links
4. ✅ Update `ChatView.tsx`:
   - Add "Link Contact" menu item
   - Add "Linked Contacts" section to ContactDetails
5. ✅ Update `Inbox.tsx`:
   - Fetch linked contacts when conversation is selected
   - Handle link/unlink callbacks to refresh state
