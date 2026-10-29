import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMinutes, differenceInMinutes, format, set } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Clock, Loader2, Mail, MessageSquare, Phone, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BOOKING_STATUSES, type Booking, type BookingStatus, type Contact, type TenantMembership } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { BOOKINGS_CHANGED_EVENT, useDateLocale } from './calendarUtils';
import { ClientPicker } from './ClientPicker';
import { saveContactDetails } from '@/lib/contactEvents';

const DURATION_OPTIONS = [30, 45, 50, 60, 90, 120];

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Booking to edit; omit to create a new one */
  booking?: Booking | null;
  /** Pre-selects (and locks) the client, e.g. when booking from a chat */
  contact?: Contact | null;
  conversationId?: string | null;
  /** Initial date for new bookings; its time is used too unless it is midnight */
  defaultDate?: Date;
  defaultStaffUserId?: string;
  onSaved?: (booking: Booking) => void;
  onDeleted?: (booking: Booking) => void;
  /** When set, new bookings can post a confirmation message to the client's chat */
  onSendConfirmation?: (message: string) => void;
}

const notifyBookingsChanged = () => window.dispatchEvent(new Event(BOOKINGS_CHANGED_EVENT));

/** Parses the JSON body the api helper puts into Error.message */
const parseApiError = (error: unknown): { message?: string; conflict?: Booking } => {
  try {
    return JSON.parse((error as Error).message);
  } catch {
    return {};
  }
};

export function BookingDialog({
  open,
  onOpenChange,
  booking,
  contact,
  conversationId,
  defaultDate,
  defaultStaffUserId,
  onSaved,
  onDeleted,
  onSendConfirmation,
}: BookingDialogProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { user, currentTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [members, setMembers] = useState<TenantMembership[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [staffUserId, setStaffUserId] = useState<string>('');
  const [contactId, setContactId] = useState<string>('none');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('50');
  const [status, setStatus] = useState<BookingStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sendConfirmation, setSendConfirmation] = useState(true);
  // Client details: "new" creates an offline contact (walk-in / phone client) on save
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [newClientName, setNewClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Reset the form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSendConfirmation(true);
    setClientMode('existing');
    setNewClientName('');
    const initialContact = booking?.contact ?? contact ?? null;
    setPhone(initialContact?.phone ?? '');
    setEmail(initialContact?.email ?? '');

    if (booking) {
      const start = new Date(booking.starts_at);
      setStaffUserId(String(booking.staff_user_id));
      setContactId(booking.contact_id || 'none');
      setTitle(booking.title || '');
      setDate(start);
      setTime(format(start, 'HH:mm'));
      setDuration(String(differenceInMinutes(new Date(booking.ends_at), start)));
      setStatus(booking.status);
      setNotes(booking.notes || '');
    } else {
      setStaffUserId(defaultStaffUserId ?? (user?.id ? String(user.id) : ''));
      setContactId(contact?.id || 'none');
      setTitle('');
      setDate(defaultDate ?? new Date());
      setTime(defaultDate && (defaultDate.getHours() || defaultDate.getMinutes()) ? format(defaultDate, 'HH:mm') : '10:00');
      setDuration('50');
      setStatus('scheduled');
      setNotes('');
    }
  }, [open, booking, contact, defaultDate, defaultStaffUserId, user]);

  useEffect(() => {
    if (!open || !currentTenant) return;

    api.get<TenantMembership[]>(`/tenant-memberships?is_active=1`)
      .then((data) => setMembers((data || []).filter((m) => m.profile)))
      .catch((err) => console.error('Error fetching team members:', err));

    if (!contact) {
      api.get<Contact[]>(`/contacts?tenant_id=${currentTenant.id}&sort_by=name&sort_direction=asc`)
        .then((data) => setContacts(data || []))
        .catch((err) => console.error('Error fetching contacts:', err));
    }
  }, [open, currentTenant, contact]);

  // Make sure the current duration is selectable even if it isn't a preset
  const durationOptions = DURATION_OPTIONS.includes(Number(duration))
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, Number(duration)].sort((a, b) => a - b);

  const selectedContact =
    contact ?? contacts.find((c) => c.id === contactId) ?? (booking?.contact_id === contactId ? booking?.contact : null) ?? null;

  const selectClient = (c: Contact | null) => {
    setContactId(c?.id ?? 'none');
    setPhone(c?.phone ?? '');
    setEmail(c?.email ?? '');
  };

  const startNewClient = (name: string) => {
    setClientMode('new');
    setNewClientName(name);
    setPhone('');
    setEmail('');
  };

  const getStart = () => {
    if (!date) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
  };

  const staffName = (() => {
    const member = members.find((m) => String(m.user_id) === staffUserId);
    return member?.profile?.full_name || member?.profile?.email || '';
  })();

  const canSendConfirmation = !booking && !!onSendConfirmation;
  const confirmationStart = getStart();
  const confirmationMessage = confirmationStart
    ? t('bookings.confirmationMessage', {
        name: staffName,
        date: format(confirmationStart, 'EEEE, d MMMM', { locale }),
        time: format(confirmationStart, 'HH:mm'),
      })
    : '';

  const handleSave = async () => {
    const startsAt = getStart();
    if (!staffUserId || !startsAt) return;
    const endsAt = addMinutes(startsAt, Number(duration));

    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('contacts.invalidEmail'));
      return;
    }

    setIsSaving(true);
    setError(null);

    let clientId = contactId === 'none' ? null : contactId;
    try {
      const details = { phone: phone.trim() || null, email: email.trim() || null };
      if (clientMode === 'new') {
        const created = await api.post<Contact>('/contacts', {
          tenant_id: currentTenant?.id,
          channel_type: 'offline',
          name: newClientName.trim(),
          ...details,
        });
        // Keep it selected so a retry (e.g. after a time conflict) doesn't create a duplicate
        setContacts((prev) => [created, ...prev]);
        setContactId(created.id);
        setClientMode('existing');
        clientId = created.id;
      } else if (
        selectedContact &&
        (details.phone !== (selectedContact.phone || null) || details.email !== (selectedContact.email || null))
      ) {
        const updated = await saveContactDetails(api, selectedContact.id, details);
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } catch (err) {
      setError(parseApiError(err).message || t('errors.somethingWentWrong'));
      setIsSaving(false);
      return;
    }

    const payload = {
      staff_user_id: Number(staffUserId),
      contact_id: clientId,
      conversation_id: booking ? booking.conversation_id : conversationId ?? null,
      title: title.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status,
      notes: notes.trim() || null,
    };

    try {
      const saved = booking
        ? await api.put<Booking>(`/bookings/${booking.id}`, payload)
        : await api.post<Booking>('/bookings', payload);

      toast({
        title: booking ? t('bookings.updated') : t('bookings.created'),
        description: format(startsAt, 'PPP p'),
      });
      if (canSendConfirmation && sendConfirmation) onSendConfirmation(confirmationMessage);
      notifyBookingsChanged();
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      const body = parseApiError(err);
      if (body.conflict) {
        const c = body.conflict;
        setError(t('bookings.conflict', {
          start: format(new Date(c.starts_at), 'p'),
          end: format(new Date(c.ends_at), 'p'),
        }));
      } else {
        setError(body.message || t('errors.somethingWentWrong'));
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!booking || !window.confirm(t('bookings.confirmDelete'))) return;
    try {
      await api.delete(`/bookings/${booking.id}`);
      notifyBookingsChanged();
      onDeleted?.(booking);
      onOpenChange(false);
    } catch (err) {
      setError(parseApiError(err).message || t('errors.somethingWentWrong'));
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{booking ? t('bookings.editBooking') : t('bookings.newBooking')}</DialogTitle>
          <DialogDescription>{t('bookings.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>{t('bookings.client')}</Label>
            {contact ? (
              <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm">
                {contact.name || contact.external_id || t('common.unknown')}
              </div>
            ) : clientMode === 'new' ? (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <UserPlus className="h-4 w-4" />
                    {t('bookings.newClient')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setClientMode('existing')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('bookings.chooseExisting')}
                  </button>
                </div>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder={t('bookings.clientName')}
                  autoFocus
                />
              </div>
            ) : (
              <ClientPicker
                contacts={contacts}
                selected={selectedContact}
                onSelect={selectClient}
                onCreateNew={startNewClient}
              />
            )}

            {(contact || clientMode === 'new' || selectedContact) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('contacts.addPhone')}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('contacts.addEmail')}
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Psychologist */}
          <div className="space-y-2">
            <Label>{t('bookings.psychologist')}</Label>
            <Select value={staffUserId} onValueChange={setStaffUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t('bookings.selectPsychologist')} />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={String(m.user_id)}>
                    {m.profile?.full_name || m.profile?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session type */}
          <div className="space-y-2">
            <Label>{t('bookings.sessionType')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('bookings.sessionTypePlaceholder')}
            />
          </div>

          {/* Date / time / duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>{t('common.date')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'MMM d, yyyy') : t('bookings.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t('common.time')}</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('bookings.duration')}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((mins) => (
                    <SelectItem key={mins} value={String(mins)}>
                      {t('bookings.minutes', { count: mins })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status (edit only) */}
          {booking && (
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{t(`bookings.status.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('bookings.notesPlaceholder')}
              className="min-h-[80px] resize-none"
            />
          </div>

          {canSendConfirmation && (
            <label className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 cursor-pointer">
              <Checkbox
                checked={sendConfirmation}
                onCheckedChange={(checked) => setSendConfirmation(checked === true)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t('bookings.sendConfirmation')}</span>
                {sendConfirmation && confirmationMessage && (
                  <span className="block mt-1 text-xs text-muted-foreground">{confirmationMessage}</span>
                )}
              </span>
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {booking && (
            <div className="flex gap-1 sm:mr-auto">
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                {t('common.delete')}
              </Button>
              {booking.conversation_id && !conversationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/inbox?conversation=${booking.conversation_id}`)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {t('bookings.openChat')}
                </Button>
              )}
            </div>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!staffUserId || !date || isSaving || (clientMode === 'new' && !newClientName.trim())}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {booking ? t('common.update') : t('bookings.book')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
