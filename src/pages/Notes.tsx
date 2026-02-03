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
import { StickyNote, Bell, Plus, Clock, Pencil, CalendarIcon, User, Coffee, LayoutGrid, Kanban, Settings2 } from 'lucide-react';
import { addMinutes, format, set } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Contact } from '@/lib/types';
import { NotesKanbanBoard } from '@/components/notes/NotesKanbanBoard';
import { ManageNoteStatusesDialog } from '@/components/notes/ManageNoteStatusesDialog';
import { ContactNote, NoteStatus, NOTE_COLORS, getColorClasses } from '@/components/notes/types';
import { useToast } from '@/hooks/use-toast';

// Note form component
import { NoteFormCard } from '@/components/notes/NoteFormCard';
import { NotesGridView } from '@/components/notes/NotesGridView';

const REMINDER_OPTIONS_KEYS = [
  { value: 'none', key: 'notes.reminder.none' },
  { value: '5', key: 'notes.reminder.5min' },
  { value: '10', key: 'notes.reminder.10min' },
  { value: '30', key: 'notes.reminder.30min' },
  { value: '60', key: 'notes.reminder.1hour' },
  { value: '1440', key: 'notes.reminder.1day' },
  { value: 'custom', key: 'notes.reminder.custom' },
];

export default function Notes() {
  const { t } = useTranslation();
  const { user, currentTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [statuses, setStatuses] = useState<NoteStatus[]>([]);
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
  const [selectedStatusId, setSelectedStatusId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [showStatusesDialog, setShowStatusesDialog] = useState(false);

  useEffect(() => {
    if (currentTenant && user) {
      fetchNotes();
      fetchStatuses();
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

  const fetchStatuses = async () => {
    if (!currentTenant) return;
    
    const { data, error } = await supabase
      .from('note_statuses')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('display_order');

    if (error) {
      console.error('Error fetching statuses:', error);
    } else {
      setStatuses(data as NoteStatus[]);
    }
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
        status_id: selectedStatusId === 'none' ? null : selectedStatusId,
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
        status_id: selectedStatusId === 'none' ? null : selectedStatusId,
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

  const handleMoveNote = async (noteId: string, newStatusId: string | null) => {
    const { error } = await supabase
      .from('contact_notes')
      .update({ status_id: newStatusId })
      .eq('id', noteId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to move note',
        variant: 'destructive',
      });
    } else {
      // Optimistic update
      setNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, status_id: newStatusId } : n
      ));
    }
  };

  const handleEditNote = (note: ContactNote) => {
    setEditingNote(note);
    setNewNote(note.content);
    setSelectedColor(note.color || 'yellow');
    setSelectedContactId(note.contact_id || 'none');
    setSelectedStatusId(note.status_id || 'none');
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
    setSelectedStatusId('none');
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
        <div className={cn(viewMode === 'kanban' ? 'max-w-full' : 'max-w-4xl mx-auto')}>
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
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center border rounded-lg p-0.5">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setViewMode('kanban')}
                >
                  <Kanban className="h-4 w-4" />
                  Board
                </Button>
              </div>

              {viewMode === 'kanban' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStatusesDialog(true)}
                  className="gap-1.5"
                >
                  <Settings2 className="h-4 w-4" />
                  Columns
                </Button>
              )}

              <Button onClick={() => { resetForm(); setIsAdding(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                {t('notes.newNote')}
              </Button>
            </div>
          </div>

          {/* Tabs - only show in grid view */}
          {viewMode === 'grid' && (
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
          )}

          {/* Add/Edit Note Form */}
          {(isAdding || editingNote) && (
            <NoteFormCard
              isEditing={!!editingNote}
              newNote={newNote}
              setNewNote={setNewNote}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
              selectedContactId={selectedContactId}
              setSelectedContactId={setSelectedContactId}
              selectedStatusId={selectedStatusId}
              setSelectedStatusId={setSelectedStatusId}
              reminderOption={reminderOption}
              setReminderOption={setReminderOption}
              customDate={customDate}
              setCustomDate={setCustomDate}
              customTime={customTime}
              setCustomTime={setCustomTime}
              contacts={contacts}
              statuses={statuses}
              isSaving={isSaving}
              onSave={editingNote ? handleUpdateNote : handleAddNote}
              onCancel={resetForm}
            />
          )}

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
          ) : viewMode === 'kanban' ? (
            <NotesKanbanBoard
              notes={filteredNotes}
              statuses={statuses}
              onMoveNote={handleMoveNote}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onNavigateToChat={navigateToChat}
              conversations={conversations}
            />
          ) : (
            <NotesGridView
              notes={filteredNotes}
              statuses={statuses}
              editingNoteId={editingNote?.id}
              onEditNote={handleEditNote}
              onDeleteNote={handleDeleteNote}
              onNavigateToChat={navigateToChat}
              activeTab={activeTab}
            />
          )}
        </div>
      </div>

      <ManageNoteStatusesDialog
        open={showStatusesDialog}
        onOpenChange={setShowStatusesDialog}
        statuses={statuses}
        onStatusesChanged={fetchStatuses}
      />
    </AppLayout>
  );
}
