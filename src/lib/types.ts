export type ChannelType = 'web_chat' | 'telegram' | 'whatsapp' | 'messenger' | 'instagram' | 'sms' | 'offline' | 'tiktok' | 'email';
export type ConversationStatus = 'open' | 'assigned' | 'resolved' | 'archived';
export type MessageSenderType = 'contact' | 'agent' | 'system';
export type AppRole = 'super_admin' | 'owner' | 'admin' | 'sales';

// Feature permissions for tenants
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
    description: 'Conversation management and chat', 
    icon: 'Inbox' 
  },
  contacts: { 
    label: 'Contacts', 
    description: 'Lead and contact management', 
    icon: 'Users' 
  },
  objects: { 
    label: 'Inventory', 
    description: 'Custom object types and records', 
    icon: 'Package' 
  },
  notes: { 
    label: 'Notes', 
    description: 'Team notes with Kanban board', 
    icon: 'StickyNote' 
  },
  statuses: { 
    label: 'Statuses', 
    description: 'Lead status management', 
    icon: 'Tag' 
  },
  rules: { 
    label: 'Rules', 
    description: 'Automation rules engine', 
    icon: 'Zap' 
  },
  channels: { 
    label: 'Channels', 
    description: 'Channel configuration', 
    icon: 'Plug' 
  },
};

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  pricing_monthly?: number;
  enabled_channels?: ChannelType[];
  enabled_features?: TenantFeature[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: AppRole;
  position?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  profile?: Profile;
}

export interface Channel {
  id: string;
  tenant_id: string;
  channel_type: ChannelType;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  external_id?: string;
  channel_type: ChannelType;
  name?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_id: string;
  channel_id?: string;
  assigned_to?: string;
  status: ConversationStatus;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count: number;
  assignment_seen_by_assignee: boolean;
  assignment_reason?: string | null;
  reassigned_by?: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  channel?: Channel;
  assigned_profile?: Profile;
  reassigned_by_profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id?: string;
  content: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface ContactLinkGroup {
  id: string;
  tenant_id: string;
  display_name?: string;
  created_at: string;
  created_by?: string;
}

export interface ContactLink {
  id: string;
  tenant_id: string;
  contact_id: string;
  link_group_id: string;
  created_at: string;
  created_by?: string;
  contact?: Contact;
}

// Unified view of linked contacts with their conversations
export interface UnifiedContact {
  groupId: string;
  displayName: string;
  contacts: Contact[];
  conversations: Conversation[];
  totalUnreadCount: number;
  lastMessageAt?: string;
}

export interface LeadStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon?: string | null;
  created_at: string;
  created_by?: string;
}

export interface ContactStatus {
  id: string;
  tenant_id: string;
  contact_id: string;
  status_id: string;
  created_at: string;
  created_by?: string;
  status?: LeadStatus;
}

export interface ContactNote {
  id: string;
  tenant_id: string;
  contact_id: string;
  created_by: string;
  content: string;
  color: string;
  reminder_at?: string;
  reminder_shown: boolean;
  created_at: string;
  updated_at: string;
}

export const CHANNEL_CONFIG: Record<ChannelType, { label: string; icon: string; color: string }> = {
  web_chat: { label: 'Web Chat', icon: 'MessageCircle', color: 'channel-web' },
  telegram: { label: 'Telegram', icon: 'Send', color: 'channel-telegram' },
  whatsapp: { label: 'WhatsApp', icon: 'MessageSquare', color: 'channel-whatsapp' },
  messenger: { label: 'Messenger', icon: 'Facebook', color: 'channel-messenger' },
  instagram: { label: 'Instagram', icon: 'Instagram', color: 'channel-instagram' },
  sms: { label: 'SMS', icon: 'Phone', color: 'channel-sms' },
  offline: { label: 'Offline', icon: 'FileSpreadsheet', color: 'channel-offline' },
  tiktok: { label: 'TikTok', icon: 'Music2', color: 'channel-tiktok' },
  email: { label: 'Email', icon: 'Mail', color: 'channel-email' },
};

export const ALL_CHANNELS: ChannelType[] = ['web_chat', 'telegram', 'whatsapp', 'messenger', 'instagram', 'sms', 'offline', 'tiktok', 'email'];
