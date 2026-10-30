import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMinutes, format, set } from 'date-fns';
import { Bell, CalendarIcon, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { Contact } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClientPicker } from '@/components/bookings/ClientPicker';
import { useDateLocale } from '@/components/bookings/calendarUtils';
import { NOTE_COLORS, type ContactNote } from '@/components/notes/noteTypes';

const REMINDER_OPTIONS = [
  { value: 'none', key: 'notes.reminder.none' },
  { value: '5', key: 'notes.reminder.5min' },
  { value: '10', key: 'notes.reminder.10min' },
  { value: '30', key: 'notes.reminder.30min' },
  { value: '60', key: 'notes.reminder.1hour' },
  { value: '1440', key: 'notes.reminder.1day' },
  { value: 'custom', key: 'notes.reminder.custom' },
];

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Note to edit; omit to write a new one */
  note?: ContactNote | null;
  contacts: Contact[];
  onSaved: () => void;
}

export function NoteDialog({ open, onOpenChange, note, contacts, onSaved }: NoteDialogProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { user, currentTenant } = useAuth();
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>('yellow');
  const [contactId, setContactId] = useState<string | null>(null);
  const [reminder, setReminder] = useState('none');
  const [customDate, setCustomDate] = useState<Date | undefined>();
  const [customTime, setCustomTime] = useState('12:00');
  const [isSaving, setIsSaving] = useState(false);

  // A pending reminder on the note being edited can be kept as is
  const pendingReminder = note?.reminder_at && !note.reminder_shown ? new Date(note.reminder_at) : null;

  useEffect(() => {
    if (!open) return;
    setContent(note?.content || '');
    setColor(note?.color || 'yellow');
    setContactId(note?.contact_id || null);
    setReminder(pendingReminder ? 'keep' : 'none');
    setCustomDate(undefined);
    setCustomTime('12:00');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, note]);

  const selectedContact = contacts.find((c) => c.id === contactId) || null;

  const reminderAt = (): string | null => {
    if (reminder === 'keep') return note?.reminder_at || null;
    if (reminder === 'none') return null;
    if (reminder === 'custom') {
      if (!customDate) return null;
      const [hours, minutes] = customTime.split(':').map(Number);
      return set(customDate, { hours, minutes, seconds: 0 }).toISOString();
    }
    return addMinutes(new Date(), parseInt(reminder, 10)).toISOString();
  };

  const handleSave = async () => {
    if (!content.trim() || !user || !currentTenant || isSaving) return;
    setIsSaving(true);
    const payload = {
      content: content.trim(),
      color,
      contact_id: contactId,
      reminder_at: reminderAt(),
    };
    try {
      if (note) {
        await api.put(`/contact-notes/${note.id}`, payload);
      } else {
        await api.post('/contact-notes', { ...payload, tenant_id: currentTenant.id, created_by: user.id });
      }
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const reminderChips = [
    ...(pendingReminder ? [{ value: 'keep', label: t('notes.keepReminder', { time: format(pendingReminder, 'd MMM, HH:mm', { locale }) }) }] : []),
    ...REMINDER_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{note ? t('notes.editNote') : t('notes.newNote')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('notes.whatOnMind')}
            className="min-h-[140px] resize-none text-[15px] leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
            }}
            autoFocus
          />

          <div className="space-y-1.5">
            <Label>{t('notes.aboutClient')}</Label>
            <ClientPicker
              contacts={contacts}
              selected={selectedContact}
              onSelect={(c) => setContactId(c?.id || null)}
              placeholder={t('notes.noClientPersonal')}
              noneLabel={t('notes.noClientPersonal')}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5" />
              {t('notes.reminderLabel')}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {reminderChips.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setReminder(chip.value)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    reminder === chip.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {reminder === 'custom' && (
              <div className="flex gap-2 pt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn('flex-1 justify-start font-normal', !customDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate ? format(customDate, 'PPP', { locale }) : t('notes.reminder.pickDate')}
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
                <Input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="h-9 w-28" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t('notes.color')}</Label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110',
                    color === c.value && 'ring-2 ring-offset-2 ring-offset-background',
                  )}
                  style={{ backgroundColor: c.dot, ...(color === c.value ? { ['--tw-ring-color' as string]: c.dot } : {}) }}
                  aria-label={c.value}
                >
                  {color === c.value && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!content.trim() || isSaving || (reminder === 'custom' && !customDate)}>
            {note ? t('notes.saveNote') : t('notes.addNoteBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
