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
import { StickyNote, Bell, Trash2, Plus, Clock } from 'lucide-react';
import { formatDistanceToNow, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContactNote {
  id: string;
  contact_id: string;
  tenant_id: string;
  created_by: string;
  content: string;
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

export function ContactNotes({ contactId, tenantId }: ContactNotesProps) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
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
        reminder_at: reminderAt,
      });

    if (error) {
      console.error('Error adding note:', error);
    } else {
      setNewNote('');
      setReminderOption('none');
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
    <div className="mt-6 px-4">
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
        <div className="mb-4 space-y-3 p-3 rounded-lg bg-muted/50 border">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="min-h-[80px] resize-none"
          />
          
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Select value={reminderOption} onValueChange={setReminderOption}>
              <SelectTrigger className="flex-1 h-8">
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
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSaving}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'p-3 rounded-lg border bg-card',
                note.reminder_at && !note.reminder_shown && 'border-warning/50'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                  {note.reminder_at && (
                    <span className={cn(
                      'flex items-center gap-1',
                      !note.reminder_shown && 'text-warning'
                    )}>
                      <Clock className="h-3 w-3" />
                      {note.reminder_shown 
                        ? 'Reminded' 
                        : `Reminder ${formatDistanceToNow(new Date(note.reminder_at), { addSuffix: true })}`
                      }
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleDeleteNote(note.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
