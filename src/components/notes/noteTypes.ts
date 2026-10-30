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
  contact?: NoteContact | null;
}

/** Note colours: the paper, its edge, the pin, and a solid dot for the picker */
export const NOTE_COLORS = [
  { value: 'yellow', dot: '#eab308', card: 'bg-yellow-100 border-yellow-300 shadow-yellow-200/50', pin: 'text-yellow-600' },
  { value: 'pink', dot: '#ec4899', card: 'bg-pink-100 border-pink-300 shadow-pink-200/50', pin: 'text-pink-600' },
  { value: 'blue', dot: '#3b82f6', card: 'bg-blue-100 border-blue-300 shadow-blue-200/50', pin: 'text-blue-600' },
  { value: 'green', dot: '#22c55e', card: 'bg-green-100 border-green-300 shadow-green-200/50', pin: 'text-green-600' },
  { value: 'purple', dot: '#a855f7', card: 'bg-purple-100 border-purple-300 shadow-purple-200/50', pin: 'text-purple-600' },
  { value: 'orange', dot: '#f97316', card: 'bg-orange-100 border-orange-300 shadow-orange-200/50', pin: 'text-orange-600' },
] as const;

export const getNoteColor = (color: string | null | undefined) =>
  NOTE_COLORS.find((c) => c.value === color) || NOTE_COLORS[0];
