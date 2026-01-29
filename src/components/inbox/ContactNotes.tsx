import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StickyNote, Bell, Trash2, Plus, Clock, Pin } from 'lucide-react';
import { formatDistanceToNow, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContactNote {
  id: string;
  contact_id: string;
  tenant_id: string;
  created_by: string;
  content: string;
  color: string;
  reminder_at: string | null;
  reminder_shown: boolean;
  created_at: string;
}

interface ContactNotesProps {
  contactId: string;
  tenantId: string;
}

const REMINDER_OPTIONS = [
  { value: 'none', label: 'No reminder' },
  { value: '5', label: 'In 5 minutes' },
  { value: '10', label: 'In 10 minutes' },
  { value: '30', label: 'In 30 minutes' },
  { value: '60', label: 'In 1 hour' },
  { value: '1440', label: 'In 1 day' },
];

const NOTE_COLORS = [
  { value: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', pin: 'text-yellow-600', shadow: 'shadow-yellow-200/50' },
  { value: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', pin: 'text-pink-600', shadow: 'shadow-pink-200/50' },
  { value: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', pin: 'text-blue-600', shadow: 'shadow-blue-200/50' },
  { value: 'green', bg: 'bg-green-100', border: 'border-green-300', pin: 'text-green-600', shadow: 'shadow-green-200/50' },
  { value: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', pin: 'text-purple-600', shadow: 'shadow-purple-200/50' },
  { value: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', pin: 'text-orange-600', shadow: 'shadow-orange-200/50' },
];

const getColorClasses = (color: string) => {
  return NOTE_COLORS.find(c => c.value === color) || NOTE_COLORS[0];
};

export function ContactNotes({ contactId, tenantId }: ContactNotesProps) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [reminderOption, setReminderOption] = useState('none');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchNotes();
  }, [contactId, tenantId]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data as ContactNote[]);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setIsSaving(true);
    
    let reminderAt: string | null = null;
    if (reminderOption !== 'none') {
      const minutes = parseInt(reminderOption, 10);
      reminderAt = addMinutes(new Date(), minutes).toISOString();
    }

    const { error } = await supabase
      .from('contact_notes')
      .insert({
        contact_id: contactId,
        tenant_id: tenantId,
        created_by: user.id,
        content: newNote.trim(),
        color: selectedColor,
        reminder_at: reminderAt,
      });

    if (error) {
      console.error('Error adding note:', error);
    } else {
      setNewNote('');
      setReminderOption('none');
      setSelectedColor('yellow');
      setIsAdding(false);
      fetchNotes();
    }
    
    setIsSaving(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('contact_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
    } else {
      setNotes(notes.filter(n => n.id !== noteId));
    }
  };

  return (
    <div className="mt-6 px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Notes
          </h4>
        </div>
        {!isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 space-y-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-dashed border-yellow-300 dark:border-yellow-700">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write your note..."
            className="min-h-[80px] resize-none bg-transparent border-none focus-visible:ring-0 placeholder:text-yellow-600/50"
          />
          
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Color:</span>
            <div className="flex gap-1">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                    color.bg,
                    color.border,
                    selectedColor === color.value && 'ring-2 ring-offset-1 ring-foreground scale-110'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Select value={reminderOption} onValueChange={setReminderOption}>
              <SelectTrigger className="flex-1 h-8 bg-white/50 dark:bg-black/20">
                <SelectValue placeholder="Set reminder" />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewNote('');
                setReminderOption('none');
                setSelectedColor('yellow');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSaving}
            >
              Pin it!
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet
          </p>
        ) : (
          notes.map((note) => {
            const colorClasses = getColorClasses(note.color || 'yellow');
            
            return (
              <div
                key={note.id}
                className={cn(
                  'relative p-4 rounded-lg border-2 shadow-md transform transition-all hover:-rotate-1 hover:scale-[1.02]',
                  colorClasses.bg,
                  colorClasses.border,
                  colorClasses.shadow,
                  'dark:bg-opacity-30'
                )}
                style={{
                  transform: `rotate(${Math.random() * 2 - 1}deg)`,
                }}
              >
                {/* Pin */}
                <div className={cn(
                  'absolute -top-2 left-1/2 -translate-x-1/2',
                  colorClasses.pin
                )}>
                  <Pin className="h-5 w-5 fill-current drop-shadow-sm" style={{ transform: 'rotate(45deg)' }} />
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDeleteNote(note.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>

                {/* Content */}
                <p className="text-sm whitespace-pre-wrap pt-2 text-foreground/90 font-handwriting">
                  {note.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10">
                  <span className="text-[10px] text-foreground/60">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                  {note.reminder_at && (
                    <span className={cn(
                      'flex items-center gap-1 text-[10px]',
                      !note.reminder_shown ? 'text-orange-600 font-medium' : 'text-foreground/60'
                    )}>
                      <Clock className="h-3 w-3" />
                      {note.reminder_shown 
                        ? 'Reminded' 
                        : formatDistanceToNow(new Date(note.reminder_at), { addSuffix: true })
                      }
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
