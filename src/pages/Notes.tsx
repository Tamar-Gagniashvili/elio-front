import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickyNote, Bell, Trash2, Plus, Clock, Pin, Pencil, CalendarIcon, User, Coffee, MessageSquare } from 'lucide-react';
import { formatDistanceToNow, addMinutes, format, set } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Contact } from '@/lib/types';

interface NoteContact {
  id: string;
  name: string | null;
  avatar_url: string | null;
  channel_type: string;
}

interface ContactNote {
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

export default function Notes() {
  const { t } = useTranslation();
  const { user, currentTenant } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversations, setConversations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<ContactNote | null>(null);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [reminderOption, setReminderOption] = useState('none');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [customTime, setCustomTime] = useState('12:00');
  const [selectedContactId, setSelectedContactId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (currentTenant && user) {
      fetchNotes();
      fetchContacts();
      fetchConversations();
    }
  }, [currentTenant, user]);

  const fetchNotes = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contact_notes')
      .select(`
        *,
        contact:contacts(id, name, avatar_url, channel_type)
      `)
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      setNotes(data as ContactNote[]);
    }
    setIsLoading(false);
  };

  const fetchContacts = async () => {
    if (!currentTenant) return;
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('name');

    if (error) {
      console.error('Error fetching contacts:', error);
    } else {
      setContacts(data as Contact[]);
    }
  };

  const fetchConversations = async () => {
    if (!currentTenant) return;
    
    const { data, error } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .eq('tenant_id', currentTenant.id);

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      // Map contact_id -> conversation_id for quick lookup
      const convMap: Record<string, string> = {};
      data?.forEach(conv => {
        if (conv.contact_id) {
          convMap[conv.contact_id] = conv.id;
        }
      });
      setConversations(convMap);
    }
  };

  const navigateToChat = (contactId: string) => {
    const conversationId = conversations[contactId];
    if (conversationId) {
      navigate(`/inbox?conversation=${conversationId}`);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user || !currentTenant) return;

    setIsSaving(true);
    
    let reminderAt: string | null = null;
    if (reminderOption === 'custom' && customDate) {
      const [hours, minutes] = customTime.split(':').map(Number);
      reminderAt = set(customDate, { hours, minutes, seconds: 0 }).toISOString();
    } else if (reminderOption !== 'none' && reminderOption !== 'custom') {
      const mins = parseInt(reminderOption, 10);
      reminderAt = addMinutes(new Date(), mins).toISOString();
    }

    const { error } = await supabase
      .from('contact_notes')
      .insert({
        contact_id: selectedContactId === 'none' ? null : selectedContactId,
        tenant_id: currentTenant.id,
        created_by: user.id,
        content: newNote.trim(),
        color: selectedColor,
        reminder_at: reminderAt,
      });

    if (error) {
      console.error('Error adding note:', error);
    } else {
      resetForm();
      fetchNotes();
    }
    
    setIsSaving(false);
  };

  const handleUpdateNote = async () => {
    if (!newNote.trim() || !editingNote) return;

    setIsSaving(true);
    
    let reminderAt: string | null = editingNote.reminder_at || null;
    if (reminderOption === 'custom' && customDate) {
      const [hours, minutes] = customTime.split(':').map(Number);
      reminderAt = set(customDate, { hours, minutes, seconds: 0 }).toISOString();
    } else if (reminderOption !== 'none' && reminderOption !== 'custom') {
      const mins = parseInt(reminderOption, 10);
      reminderAt = addMinutes(new Date(), mins).toISOString();
    }

    const { error } = await supabase
      .from('contact_notes')
      .update({
        content: newNote.trim(),
        color: selectedColor,
        reminder_at: reminderAt,
        contact_id: selectedContactId === 'none' ? null : selectedContactId,
      })
      .eq('id', editingNote.id);

    if (error) {
      console.error('Error updating note:', error);
    } else {
      resetForm();
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

  const handleEditNote = (note: ContactNote) => {
    setEditingNote(note);
    setNewNote(note.content);
    setSelectedColor(note.color || 'yellow');
    setSelectedContactId(note.contact_id || 'none');
    setReminderOption('none');
    setCustomDate(undefined);
    setCustomTime('12:00');
    setIsAdding(false);
  };

  const resetForm = () => {
    setNewNote('');
    setReminderOption('none');
    setCustomDate(undefined);
    setCustomTime('12:00');
    setSelectedColor('yellow');
    setSelectedContactId('none');
    setIsAdding(false);
    setEditingNote(null);
  };

  const filteredNotes = notes.filter(note => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return !note.contact_id;
    if (activeTab === 'chat') return !!note.contact_id;
    return true;
  });

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <StickyNote className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('notes.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('notes.subtitle')}</p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setIsAdding(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('notes.newNote')}
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">{t('notes.allNotes')}</TabsTrigger>
              <TabsTrigger value="personal" className="gap-2">
                <Coffee className="h-4 w-4" />
                {t('notes.personal')}
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <User className="h-4 w-4" />
                {t('notes.chatNotes')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Add/Edit Note Form */}
          {(isAdding || editingNote) && (() => {
            const formColorClasses = getColorClasses(selectedColor);
            return (
              <div className={cn(
                "mb-6 p-6 rounded-lg border-2 border-dashed transition-colors",
                formColorClasses.bg,
                formColorClasses.border,
                "dark:bg-opacity-30"
              )}>
                <h3 className="font-semibold mb-4">{editingNote ? t('notes.editNote') : t('notes.newNote')}</h3>
              
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('notes.whatOnMind')}
                className="min-h-[100px] resize-none bg-transparent border-none focus-visible:ring-0 text-base mb-4"
                autoFocus
              />

              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                  <SelectTrigger className="flex-1 bg-background/50">
                    <SelectValue placeholder={t('notes.assignToContact')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('notes.personalNote')}</SelectItem>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name || contact.external_id || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Color picker */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">{t('notes.color')}:</span>
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

              {/* Reminder */}
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Select value={reminderOption} onValueChange={setReminderOption}>
                  <SelectTrigger className="flex-1 bg-background/50">
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
                <div className="flex flex-col gap-2 p-3 rounded-md bg-background/50 border border-border mb-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
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
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="flex-1 bg-background"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={editingNote ? handleUpdateNote : handleAddNote}
                  disabled={!newNote.trim() || isSaving}
                >
                  {editingNote ? t('common.update') : t('notes.pinIt')}
                </Button>
              </div>
            </div>
            );
          })()}

          {/* Notes Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12">
              <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {activeTab === 'personal' 
                  ? "No personal notes yet. Add one for yourself!" 
                  : activeTab === 'chat'
                  ? "No chat notes yet. Add notes to conversations!"
                  : "No notes yet. Click 'New Note' to get started!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => {
                const colorClasses = getColorClasses(note.color || 'yellow');
                const isEditing = editingNote?.id === note.id;
                
                if (isEditing) return null; // Hide while editing in form
                
                return (
                  <div
                    key={note.id}
                    className={cn(
                      'relative p-4 rounded-lg border-2 shadow-md transition-all hover:-rotate-1 hover:scale-[1.02]',
                      colorClasses.bg,
                      colorClasses.border,
                      colorClasses.shadow,
                      'dark:bg-opacity-30'
                    )}
                    style={{
                      transform: `rotate(${(Math.random() - 0.5) * 2}deg)`,
                    }}
                  >
                    {/* Pin */}
                    <div className={cn(
                      'absolute -top-2 left-1/2 -translate-x-1/2',
                      colorClasses.pin
                    )}>
                      <Pin className="h-5 w-5 fill-current drop-shadow-sm" style={{ transform: 'rotate(45deg)' }} />
                    </div>

                    {/* Action buttons */}
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
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

                    {/* Contact badge - clickable to go to chat */}
                    {note.contact && note.contact_id && (
                      <button
                        onClick={() => navigateToChat(note.contact_id!)}
                        className="mb-2 flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground hover:underline transition-colors"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>{note.contact.name || 'Unknown'}</span>
                      </button>
                    )}
                    
                    {!note.contact_id && (
                      <div className="mb-2 flex items-center gap-1 text-xs text-foreground/70">
                        <Coffee className="h-3 w-3" />
                        <span>Personal</span>
                      </div>
                    )}

                    {/* Content */}
                    <p className="text-sm whitespace-pre-wrap pt-1 text-foreground/90">
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
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
