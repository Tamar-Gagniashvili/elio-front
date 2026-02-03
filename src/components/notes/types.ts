export interface NoteContact {
  id: string;
  name: string | null;
  avatar_url: string | null;
  channel_type: string;
}

export interface ContactNote {
  id: string;
  contact_id: string | null;
  tenant_id: string;
  created_by: string;
  content: string;
  color: string;
  reminder_at: string | null;
  reminder_shown: boolean;
  created_at: string;
  status_id: string | null;
  contact?: NoteContact | null;
}

export interface NoteStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  display_order: number;
  created_by: string | null;
  created_at: string;
}

export const NOTE_COLORS = [
  { value: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', pin: 'text-yellow-600', shadow: 'shadow-yellow-200/50' },
  { value: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', pin: 'text-pink-600', shadow: 'shadow-pink-200/50' },
  { value: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', pin: 'text-blue-600', shadow: 'shadow-blue-200/50' },
  { value: 'green', bg: 'bg-green-100', border: 'border-green-300', pin: 'text-green-600', shadow: 'shadow-green-200/50' },
  { value: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', pin: 'text-purple-600', shadow: 'shadow-purple-200/50' },
  { value: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', pin: 'text-orange-600', shadow: 'shadow-orange-200/50' },
];

export const getColorClasses = (color: string) => {
  return NOTE_COLORS.find(c => c.value === color) || NOTE_COLORS[0];
};

export const STATUS_COLORS = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];
