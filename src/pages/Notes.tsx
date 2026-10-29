import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNowStrict } from 'date-fns';
import { Bell, Lock, MoreHorizontal, Pencil, Pin, Plus, Search, StickyNote, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Contact, Conversation } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDateLocale } from '@/components/bookings/calendarUtils';
import { NoteDialog } from '@/components/notes/NoteDialog';
import { getNoteColor, type ContactNote } from '@/components/notes/noteTypes';

type Filter = 'all' | 'personal' | 'clients' | 'reminders';

const hasPendingReminder = (note: ContactNote) => !!note.reminder_at && !note.reminder_shown;

export default function Notes() {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const navigate = useNavigate();
  const { user, currentTenant } = useAuth();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversationByContact, setConversationByContact] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContactNote | null>(null);
  const [deleting, setDeleting] = useState<ContactNote | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!currentTenant) return;
    try {
      const data = await api.get<ContactNote[]>(`/contact-notes?tenant_id=${currentTenant.id}&sort_by=created_at&sort_direction=desc`);
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
    setIsLoading(false);
  }, [currentTenant]);

  useEffect(() => {
    if (!currentTenant || !user) return;
    fetchNotes();

    api.get<Contact[]>(`/contacts?tenant_id=${currentTenant.id}&sort_by=name&sort_direction=asc`)
      .then((data) => setContacts(data || []))
      .catch((error) => console.error('Error fetching contacts:', error));

    api.get<Conversation[]>(`/conversations?tenant_id=${currentTenant.id}`)
      .then((data) => {
        const map: Record<string, string> = {};
        (data || []).forEach((conv) => { if (conv.contact_id) map[conv.contact_id] = conv.id; });
        setConversationByContact(map);
      })
      .catch((error) => console.error('Error fetching conversations:', error));
  }, [currentTenant, user, fetchNotes]);

  const counts = useMemo(() => ({
    all: notes.length,
    personal: notes.filter((n) => !n.contact_id).length,
    clients: notes.filter((n) => !!n.contact_id).length,
    reminders: notes.filter(hasPendingReminder).length,
  }), [notes]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = notes.filter((note) => {
      if (filter === 'personal' && note.contact_id) return false;
      if (filter === 'clients' && !note.contact_id) return false;
      if (filter === 'reminders' && !hasPendingReminder(note)) return false;
      if (!query) return true;
      return note.content.toLowerCase().includes(query) || !!note.contact?.name?.toLowerCase().includes(query);
    });
    // Reminders are listed soonest first
    return filter === 'reminders'
      ? [...list].sort((a, b) => (a.reminder_at || '').localeCompare(b.reminder_at || ''))
      : list;
  }, [notes, filter, searchQuery]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (note: ContactNote) => {
    setEditing(note);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const id = deleting.id;
    setDeleting(null);
    try {
      await api.delete(`/contact-notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const openClient = (contactId: string) => {
    const conversationId = conversationByContact[contactId];
    navigate(conversationId ? `/inbox?conversation=${conversationId}` : '/contacts');
  };

  const relative = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true, locale });

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: t('notes.allNotes') },
    { value: 'clients', label: t('notes.clientNotes') },
    { value: 'personal', label: t('notes.personal') },
    { value: 'reminders', label: t('notes.reminders') },
  ];

  const emptyText = searchQuery
    ? t('notes.noMatches')
    : filter === 'personal'
      ? t('notes.noPersonalNotes')
      : filter === 'clients'
        ? t('notes.noChatNotes')
        : filter === 'reminders'
          ? t('notes.noReminders')
          : t('notes.noNotesDesc');

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t('notes.title')}</h1>
              {!isLoading && (
                <span className="rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {notes.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{t('notes.subtitle')}</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t('notes.newNote')}
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-0.5 rounded-lg border bg-card p-0.5 overflow-x-auto self-start max-w-full">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                  filter === f.value
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.value === 'reminders' && <Bell className="h-3.5 w-3.5" />}
                {f.label}
                <span className="text-xs text-muted-foreground">{counts[f.value]}</span>
              </button>
            ))}
          </div>
          <div className="relative lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('notes.searchNotes')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-8 bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={t('common.clearFilter')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        {isLoading ? (
          <div className="flex flex-wrap gap-x-4 gap-y-6 pt-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-[calc(50%-0.5rem)] sm:w-60 rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-card py-6">
            <EmptyState
              icon={searchQuery ? Search : StickyNote}
              title={searchQuery ? t('notes.noMatches') : t('notes.noNotes')}
              description={searchQuery ? undefined : emptyText}
              action={searchQuery ? undefined : { label: t('notes.newNote'), onClick: openNew, icon: Plus }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-start gap-x-4 gap-y-6 pt-2.5">
            {filtered.map((note) => {
              const color = getNoteColor(note.color);
              const pending = hasPendingReminder(note);
              const overdue = pending && new Date(note.reminder_at!) < new Date();
              return (
                <article
                  key={note.id}
                  className={cn(
                    'group relative flex min-h-36 w-[calc(50%-0.5rem)] sm:w-60 flex-col rounded-lg border-2 p-3 pt-4 shadow-md transition-shadow hover:shadow-lg dark:bg-opacity-30',
                    color.card,
                  )}
                >
                  {/* Paper pin */}
                  <Pin
                    className={cn('absolute -top-2.5 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 fill-current drop-shadow-sm', color.pin)}
                    aria-hidden
                  />
                  <header className="flex items-center justify-between gap-2 mb-2">
                    {note.contact_id ? (
                      <button
                        onClick={() => openClient(note.contact_id!)}
                        className="flex min-w-0 items-center gap-2 rounded-full bg-background/70 py-0.5 pl-0.5 pr-2.5 text-xs font-medium hover:bg-background transition-colors"
                      >
                        <Avatar src={note.contact?.avatar_url || undefined} name={note.contact?.name || undefined} size="sm" className="h-5 w-5 text-[9px]" />
                        <span className="truncate">{note.contact?.name || t('contacts.unknown')}</span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        {t('notes.personal')}
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 -mr-1.5 flex-shrink-0 text-muted-foreground sm:opacity-0 sm:group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label={t('notes.edit')}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(note)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          {t('notes.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleting(note)} className="gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="h-4 w-4" />
                          {t('notes.deleteNote')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </header>

                  <button onClick={() => openEdit(note)} className="block w-full flex-1 text-left">
                    <p className="text-[13px] leading-snug whitespace-pre-wrap break-words line-clamp-6 text-foreground/90">{note.content}</p>
                  </button>

                  <footer className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground">
                    <span>{relative(note.created_at)}</span>
                    {note.reminder_at && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                          pending
                            ? overdue
                              ? 'bg-destructive/10 text-destructive font-medium'
                              : 'bg-background/80 text-foreground font-medium'
                            : 'text-muted-foreground',
                        )}
                      >
                        <Bell className="h-3 w-3" />
                        {pending
                          ? t(overdue ? 'notes.overdue' : 'notes.remindsAt', { time: relative(note.reminder_at) })
                          : t('notes.reminded')}
                      </span>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editing}
        contacts={contacts}
        onSaved={fetchNotes}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notes.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{t('notes.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('notes.deleteNote')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
