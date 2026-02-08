

# Feature Permissions Management for Tenants

## Overview

This plan implements a comprehensive feature permission system that allows the Super Admin to control which modules/features each tenant can access. This creates a flexible SaaS model where different tenants can have different feature sets based on their subscription or needs.

## Features to Control

Based on the current navigation structure, these features will be controllable per tenant:

| Feature Key | Display Name | Description |
|-------------|--------------|-------------|
| `inbox` | Inbox | Conversation management and chat |
| `contacts` | Contacts | Lead/contact management |
| `objects` | Inventory | Custom object types and records |
| `notes` | Notes | Team notes with Kanban board |
| `statuses` | Statuses | Lead status management |
| `rules` | Rules | Automation rules engine |
| `channels` | Channels | Channel configuration |

**Note:** Settings will always be available as it's essential for basic operations.

## Implementation Steps

### 1. Database Schema Update

Add a new `enabled_features` column to the `tenants` table:

```sql
ALTER TABLE public.tenants 
ADD COLUMN enabled_features text[] DEFAULT ARRAY['inbox', 'contacts', 'channels', 'settings']::text[];
```

This stores feature keys as an array with sensible defaults for new tenants.

### 2. Type Definitions

Update `src/lib/types.ts`:

- Add `TenantFeature` type with all controllable features
- Add `ALL_FEATURES` constant array
- Add `FEATURE_CONFIG` with display labels and icons
- Update `Tenant` interface to include `enabled_features`

### 3. Super Admin Dashboard Updates

#### A. TenantDetailsDialog Enhancement

Add a new "Features" tab to the tenant details dialog:
- Display all available features with checkboxes
- Show feature descriptions
- Allow toggling features on/off
- Save changes to the database

#### B. CreateTenantDialog Enhancement

Add a "Features" section:
- Let Super Admin select which features to enable when creating a tenant
- Default to core features (inbox, contacts, channels)

### 4. Sidebar Navigation Filtering

Update `src/components/layout/AppSidebar.tsx`:

- Access `currentTenant.enabled_features` from auth context
- Filter `navItems` to only show enabled features
- Settings always visible regardless of feature settings

### 5. Route Protection

Update each protected page to check feature access:

- If user navigates to a disabled feature route, redirect to first available feature
- Show appropriate message or redirect

### 6. Feature Access Hook (Optional Enhancement)

Create `src/hooks/useFeatureAccess.tsx`:
- Centralized logic for checking feature permissions
- `hasFeature(featureKey)` function
- `getAvailableFeatures()` function

---

## Technical Details

### Database Migration

```sql
-- Add enabled_features column with defaults
ALTER TABLE public.tenants 
ADD COLUMN enabled_features text[] DEFAULT ARRAY['inbox', 'contacts', 'channels']::text[];

-- Update existing tenants to have all features enabled
UPDATE public.tenants 
SET enabled_features = ARRAY['inbox', 'contacts', 'objects', 'notes', 'statuses', 'rules', 'channels']
WHERE enabled_features IS NULL OR enabled_features = '{}';
```

### Type Updates

```typescript
// In src/lib/types.ts
export type TenantFeature = 
  | 'inbox' 
  | 'contacts' 
  | 'objects' 
  | 'notes' 
  | 'statuses' 
  | 'rules' 
  | 'channels';

export const ALL_FEATURES: TenantFeature[] = [
  'inbox', 
  'contacts', 
  'objects', 
  'notes', 
  'statuses', 
  'rules', 
  'channels'
];

export const FEATURE_CONFIG: Record<TenantFeature, { 
  label: string; 
  description: string; 
  icon: string 
}> = {
  inbox: { 
    label: 'Inbox', 
    description: 'Conversation management', 
    icon: 'Inbox' 
  },
  contacts: { 
    label: 'Contacts', 
    description: 'Lead management', 
    icon: 'Users' 
  },
  // ... etc
};

export interface Tenant {
  // ... existing fields
  enabled_features?: TenantFeature[];
}
```

### Sidebar Filtering Logic

```typescript
// In AppSidebar.tsx
const enabledFeatures = currentTenant?.enabled_features || ['inbox', 'contacts', 'channels'];

const filteredNavItems = navItems.filter(item => {
  // Settings always visible
  if (item.href === '/settings') return true;
  
  // Check if feature is enabled
  const featureKey = item.href.replace('/', '');
  return enabledFeatures.includes(featureKey as TenantFeature);
});
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/types.ts` | Modify | Add TenantFeature type, ALL_FEATURES, FEATURE_CONFIG |
| `src/components/admin/TenantDetailsDialog.tsx` | Modify | Add Features tab with toggles |
| `src/components/admin/CreateTenantDialog.tsx` | Modify | Add Features section |
| `src/components/layout/AppSidebar.tsx` | Modify | Filter nav items by enabled features |
| `src/hooks/useFeatureAccess.tsx` | Create | Centralized feature access logic |
| Database migration | Create | Add enabled_features column |

---

## User Experience

### For Super Admin
1. When creating a tenant → select which features to enable
2. When editing a tenant → toggle features on/off in dedicated "Features" tab
3. Clear visual representation of enabled vs disabled features

### For Tenant Users
1. Sidebar only shows enabled features
2. Attempting to navigate to disabled feature → redirect to available feature
3. Seamless experience with no awareness of disabled features

