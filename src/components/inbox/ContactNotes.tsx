import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLinkedContacts } from '@/hooks/useLinkedContacts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { StickyNote, Bell, Trash2, Plus, Clock, Pin, Pencil, CalendarIcon, Link2 } from 'lucide-react';
import { formatDistanceToNow, addMinutes, format, set } from 'date-fns';
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

const REMINDER_OPTIONS_KEYS = [
  { value: 'none', key: 'notes.reminder.none' },
  { value: '5', key: 'notes.reminder.5min' },
  { value: '10', key: 'notes.reminder.10min' },
  { value: '30', key: 'notes.reminder.30min' },
  { value: '60', key: 'notes.reminder.1hour' },
  { value: '1440', key: 'notes.reminder.1day' },
  { value: 'custom', key: 'notes.reminder.custom' },
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
  const { t } = useTranslation();
  const { linkedContactIds, isLinked, isLoading: isLoadingLinks } = useLinkedContacts(contactId, tenantId);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<ContactNote | null>(null);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [reminderOption, setReminderOption] = useState('none');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customTime, setCustomTime] = useState('12:00');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!isLoadingLinks && linkedContactIds.length > 0) {
      fetchNotes();
    }
  }, [linkedContactIds, isLoadingLinks, tenantId]);

  const fetchNotes = async () => {
    if (linkedContactIds.length === 0) return;
    try {
      const data = await api.get<ContactNote[]>(`/contact-notes`);
      const filtered = data.filter((n: any) => linkedContactIds.includes(n.contact_id));
      filtered.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotes(filtered as ContactNote[]);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;

    setIsSaving(true);
    
    let reminderAt: string | null = null;
    if (reminderOption === 'custom' && customDate) {
      const [hours, minutes] = customTime.split(':').map(Number);
      reminderAt = set(customDate, { hours, minutes, seconds: 0 }).toISOString();
    } else if (reminderOption !== 'none' && reminderOption !== 'custom') {
      const minutes = parseInt(reminderOption, 10);
      reminderAt = addMinutes(new Date(), minutes).toISOString();
    }

    try {
      await api.post('/contact-notes', {
        contact_id: contactId,
        created_by: user.id,
        content: newNote.trim(),
        color: selectedColor,
        reminder_at: reminderAt,
      });
      setNewNote('');
      setReminderOption('none');
      setCustomDate(undefined);
      setCustomTime('12:00');
      setSelectedColor('yellow');
      setIsAdding(false);
      fetchNotes();
    } catch (error) {
      console.error('Error adding note:', error);
    }
    
    setIsSaving(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/contact-notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleEditNote = (note: ContactNote) => {
    setEditingNote(note);
    setNewNote(note.content);
    setSelectedColor(note.color || 'yellow');
    setReminderOption('none');
    setCustomDate(undefined);
    setCustomTime('12:00');
    setIsAdding(false);
  };

  const handleUpdateNote = async () => {
    if (!newNote.trim() || !editingNote) return;

    setIsSaving(true);
    
    let reminderAt: string | null = editingNote.reminder_at || null;
    if (reminderOption === 'custom' && customDate) {
      const [hours, minutes] = customTime.split(':').map(Number);
      reminderAt = set(customDate, { hours, minutes, seconds: 0 }).toISOString();
    } else if (reminderOption !== 'none' && reminderOption !== 'custom') {
      const minutes = parseInt(reminderOption, 10);
      reminderAt = addMinutes(new Date(), minutes).toISOString();
    }

    try {
      await api.put(`/contact-notes/${editingNote.id}`, {
        content: newNote.trim(),
        color: selectedColor,
        reminder_at: reminderAt,
      });

      setNewNote('');
      setReminderOption('none');
      setCustomDate(undefined);
      setCustomTime('12:00');
      setSelectedColor('yellow');
      setEditingNote(null);
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
    }
    
    setIsSaving(false);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setNewNote('');
    setReminderOption('none');
    setCustomDate(undefined);
    setCustomTime('12:00');
    setSelectedColor('yellow');
  };

  return (
    <div className="mt-6 px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            {t('common.notes')}
          </h4>
          {isLinked && (
            <span title={t('notes.sharedAcrossLinked')}>
              <Link2 className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
        </div>
        {!isAdding && !editingNote && (
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
            placeholder={t('notes.whatOnMind')}
            className="min-h-[80px] resize-none bg-transparent border-none focus-visible:ring-0 placeholder:text-yellow-600/50"
          />
          
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('notes.color')}:</span>
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
              <SelectTrigger className="flex-1 h-8 bg-background/50">
                <SelectValue placeholder={t('notes.setReminder')} />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS_KEYS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom date/time picker */}
          {reminderOption === 'custom' && (
            <div className="flex flex-col gap-2 p-3 rounded-md bg-background/50 border border-border">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-8",
                        !customDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate ? format(customDate, "PPP") : t('notes.reminder.pickDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={setCustomDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="flex-1 h-8 bg-background"
                />
              </div>
              {customDate && (
                <p className="text-xs text-muted-foreground">
                  {t('notes.reminderPreview', { datetime: format(set(customDate, { 
                    hours: parseInt(customTime.split(':')[0]), 
                    minutes: parseInt(customTime.split(':')[1]) 
                  }), "PPP p") })}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewNote('');
                setReminderOption('none');
                setCustomDate(undefined);
                setCustomTime('12:00');
                setSelectedColor('yellow');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || isSaving}
            >
              {t('notes.pinIt')}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('notes.noNotes')}
          </p>
        ) : (
          notes.map((note) => {
            const colorClasses = getColorClasses(note.color || 'yellow');
            const isEditing = editingNote?.id === note.id;
            
            return (
              <div
                key={note.id}
                className={cn(
                  'relative p-4 rounded-lg border-2 shadow-md transition-all',
                  !isEditing && 'transform hover:-rotate-1 hover:scale-[1.02]',
                  isEditing ? getColorClasses(selectedColor).bg : colorClasses.bg,
                  isEditing ? getColorClasses(selectedColor).border : colorClasses.border,
                  colorClasses.shadow,
                  'dark:bg-opacity-30'
                )}
                style={{
                  transform: isEditing ? 'none' : `rotate(${Math.random() * 2 - 1}deg)`,
                }}
              >
                {/* Pin */}
                <div className={cn(
                  'absolute -top-2 left-1/2 -translate-x-1/2',
                  isEditing ? getColorClasses(selectedColor).pin : colorClasses.pin
                )}>
                  <Pin className="h-5 w-5 fill-current drop-shadow-sm" style={{ transform: 'rotate(45deg)' }} />
                </div>

                {isEditing ? (
                  /* Inline editing mode */
                  <div className="space-y-3 pt-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={t('notes.whatOnMind')}
                      className="min-h-[80px] resize-none bg-transparent border-none focus-visible:ring-0 text-sm"
                      autoFocus
                    />
                    
                    {/* Color picker */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t('notes.color')}:</span>
                      <div className="flex gap-1">
                        {NOTE_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => setSelectedColor(color.value)}
                            className={cn(
                              'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                              color.bg,
                              color.border,
                              selectedColor === color.value && 'ring-2 ring-offset-1 ring-foreground scale-110'
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Reminder select */}
                    <div className="flex items-center gap-2">
                      <Bell className="h-3 w-3 text-muted-foreground" />
                      <Select value={reminderOption} onValueChange={setReminderOption}>
                        <SelectTrigger className="flex-1 h-7 text-xs bg-background/50">
                          <SelectValue placeholder={t('notes.setReminder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {REMINDER_OPTIONS_KEYS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom date/time picker */}
                    {reminderOption === 'custom' && (
                      <div className="flex flex-col gap-2 p-2 rounded-md bg-background/50 border border-border">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "justify-start text-left font-normal h-7 text-xs",
                                !customDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-3 w-3" />
                              {customDate ? format(customDate, "PPP") : t('notes.reminder.pickDate')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customDate}
                              onSelect={setCustomDate}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <Input
                            type="time"
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            className="flex-1 h-7 text-xs bg-background"
                          />
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 justify-end pt-2 border-t border-current/10">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={cancelEdit}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleUpdateNote}
                        disabled={!newNote.trim() || isSaving}
                      >
                        {t('common.update')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    {/* Action buttons */}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEditNote(note)}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>

                    {/* Content */}
                    <p className="text-sm whitespace-pre-wrap pt-2 text-foreground/90 font-handwriting">
                      {note.content}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10">
                      <span className="text-[10px] text-foreground/60">
                        {formatDistanceToNow(new Date(note.created_at.endsWith('Z') ? note.created_at : note.created_at + 'Z'), { addSuffix: true })}
                      </span>
                      {note.reminder_at && (
                        <span className={cn(
                          'flex items-center gap-1 text-[10px]',
                          !note.reminder_shown ? 'text-orange-600 font-medium' : 'text-foreground/60'
                        )}>
                          <Clock className="h-3 w-3" />
                          {note.reminder_shown 
                            ? t('notes.reminded')
                            : formatDistanceToNow(new Date(note.reminder_at.endsWith('Z') ? note.reminder_at : note.reminder_at + 'Z'), { addSuffix: true })
                          }
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
