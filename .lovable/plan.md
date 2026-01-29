
# Link Contacts Feature

## Status: ✅ Implemented (v2 - Unified View)

## Overview
Contacts from different channels (Web Chat, Telegram, WhatsApp, etc.) can be linked together under a single identity. When linked, they appear as ONE unified contact in the conversation list with:
- A custom display name (auto-generated from first contact, editable)
- Channel icons showing which platforms they use
- Per-channel unread message badges
- Click a channel icon to switch between conversations

## What You Will See

### Conversation List
- Linked contacts show as a single entry with a link indicator badge
- Multiple channel icons appear below the contact name
- Each channel icon shows its own unread count badge
- Click a channel icon to open that specific conversation

### Contact Details Panel
- Shows the unified display name
- Clickable channel icons to switch between conversations
- "All Channels" section listing every linked channel with active state

### Link Contact Dialog
- Set/edit the display name for the unified contact
- See all currently linked channels
- Search and add new contacts to link
- Unlink contacts as needed

---

## Technical Implementation

### Database Tables

**`contact_link_groups`** (NEW)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | For tenant isolation |
| display_name | text | Custom name for the unified contact |
| created_at | timestamp | When created |
| created_by | uuid | User who created |

**`contact_links`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid | For tenant isolation (RLS) |
| contact_id | uuid | Reference to contacts table |
| link_group_id | uuid | FK to contact_link_groups |
| created_at | timestamp | When link was created |
| created_by | uuid | User who created the link |

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useUnifiedContacts.tsx` | Hook to group conversations by linked contacts |
| `src/components/inbox/UnifiedConversationList.tsx` | Unified conversation list with channel icons |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/types.ts` | Added `ContactLinkGroup`, `UnifiedContact` interfaces |
| `src/components/inbox/LinkContactDialog.tsx` | Creates groups, manages display names |
| `src/components/inbox/ChatView.tsx` | Channel switching in details panel |
| `src/pages/Inbox.tsx` | Uses unified contacts hook, channel selection |

