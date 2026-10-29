import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CalendarCheck, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Booking, Contact } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { BookingDialog } from './BookingDialog';
import { BOOKINGS_CHANGED_EVENT, useDateLocale } from './calendarUtils';

const MAX_UPCOMING = 3;

const STATUS_TEXT: Record<Booking['status'], string> = {
  scheduled: 'text-primary',
  completed: 'text-success',
  cancelled: 'text-muted-foreground line-through',
  no_show: 'text-orange-600',
};

interface ContactBookingsProps {
  contact: Contact;
  conversationId?: string | null;
  /** Sends a booking confirmation into the chat */
  onSendToChat?: (message: string) => void;
  className?: string;
}

/** "Sessions" section of the contact panel: upcoming bookings plus a quick way to book */
export function ContactBookings({ contact, conversationId, onSendToChat, className = 'mt-6 px-4' }: ContactBookingsProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await api.get<Booking[]>(`/bookings?contact_id=${contact.id}`);
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching contact bookings:', error);
    }
  }, [contact.id]);

  useEffect(() => {
    fetchBookings();
    window.addEventListener(BOOKINGS_CHANGED_EVENT, fetchBookings);
    return () => window.removeEventListener(BOOKINGS_CHANGED_EVENT, fetchBookings);
  }, [fetchBookings]);

  const now = new Date();
  const upcoming = bookings
    .filter((b) => new Date(b.ends_at) >= now && b.status !== 'cancelled')
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = bookings
    .filter((b) => new Date(b.ends_at) < now)
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const shown = [...upcoming.slice(0, MAX_UPCOMING), ...(upcoming.length === 0 ? past.slice(0, 1) : [])];

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            {t('bookings.sessions')}
          </h4>
        </div>
        <Button variant="ghost" size="sm" onClick={openNew} className="h-7 px-2" aria-label={t('bookings.bookSession')}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {shown.length === 0 ? (
        <button
          onClick={openNew}
          className="w-full rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          {t('bookings.bookSession')}
        </button>
      ) : (
        <div className="space-y-1.5">
          {upcoming.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('bookings.noUpcoming')}</p>
          )}
          {shown.map((booking) => {
            const start = new Date(booking.starts_at);
            return (
              <button
                key={booking.id}
                onClick={() => { setEditing(booking); setDialogOpen(true); }}
                className="flex items-center gap-3 w-full rounded-lg p-2 text-left bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col items-center justify-center w-10 h-10 rounded-md bg-card ring-1 ring-border flex-shrink-0">
                  <span className="text-[9px] font-semibold uppercase text-muted-foreground leading-none">
                    {format(start, 'MMM', { locale })}
                  </span>
                  <span className="text-sm font-semibold leading-tight">{format(start, 'd')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {format(start, 'EEE HH:mm', { locale })}–{format(new Date(booking.ends_at), 'HH:mm')}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[booking.staff_profile?.full_name, booking.title].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={cn('text-[11px] font-medium flex-shrink-0', STATUS_TEXT[booking.status])}>
                  {t(`bookings.status.${booking.status}`)}
                </span>
              </button>
            );
          })}
          {(upcoming.length > MAX_UPCOMING || past.length > 0) && (
            <p className="pt-0.5 text-xs text-muted-foreground">
              {[
                upcoming.length > MAX_UPCOMING && t('bookings.moreUpcoming', { count: upcoming.length - MAX_UPCOMING }),
                past.length > 0 && t('bookings.pastCount', { count: past.length }),
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        booking={editing}
        contact={contact}
        conversationId={conversationId}
        onSendConfirmation={onSendToChat}
      />
    </div>
  );
}
