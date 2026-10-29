import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format, isSameYear } from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { Booking, TenantMembership } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookingDialog } from '@/components/bookings/BookingDialog';
import { BookingCalendar } from '@/components/bookings/BookingCalendar';
import {
  STAFF_COLORS,
  getViewRange,
  stepDate,
  useDateLocale,
  type CalendarView,
} from '@/components/bookings/calendarUtils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DESKTOP_VIEWS: CalendarView[] = ['month', 'week', 'day'];
const MOBILE_VIEWS: CalendarView[] = ['month', 'week', 'threeDay', 'day'];

export default function Bookings() {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { user, currentTenant } = useAuth();
  const isMobile = useIsMobile();

  const [view, setView] = useState<CalendarView>('week');
  const [date, setDate] = useState(() => new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<TenantMembership[]>([]);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [slotStart, setSlotStart] = useState<Date | undefined>(undefined);

  // Phones start on the month overview; 3 days only exists on phones, so fall back to week on desktop
  const mobileInitialised = useRef(false);
  useEffect(() => {
    if (isMobile && !mobileInitialised.current) {
      mobileInitialised.current = true;
      setView('month');
      return;
    }
    if (!isMobile) setView((v) => (v === 'threeDay' ? 'week' : v));
  }, [isMobile]);

  const range = useMemo(() => getViewRange(view, date), [view, date]);

  const fetchBookings = useCallback(async () => {
    if (!currentTenant) return;
    try {
      const params = new URLSearchParams({ from: range.start.toISOString(), to: range.end.toISOString() });
      if (staffFilter !== 'all') params.append('staff_user_id', staffFilter);
      const data = await api.get<Booking[]>(`/bookings?${params.toString()}`);
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, [currentTenant, range, staffFilter]);

  useEffect(() => {
    if (currentTenant && user) fetchBookings();
  }, [currentTenant, user, fetchBookings]);

  useEffect(() => {
    if (!currentTenant) return;
    api.get<TenantMembership[]>(`/tenant-memberships?is_active=1`)
      .then((data) => setMembers((data || []).filter((m) => m.profile)))
      .catch((error) => console.error('Error fetching team members:', error));
  }, [currentTenant]);

  // Stable color per psychologist, based on team order
  const staffColorIndex = useMemo(
    () => Object.fromEntries(members.map((m, i) => [Number(m.user_id), i])),
    [members]
  );

  const step = (direction: 1 | -1) => setDate((d) => stepDate(view, d, direction));

  const openNew = (start?: Date) => {
    setEditingBooking(null);
    setSlotStart(start);
    setDialogOpen(true);
  };

  const openEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setDialogOpen(true);
  };

  const memberName = (m: TenantMembership) => m.profile?.full_name || m.profile?.email;
  const memberDot = (i: number) => STAFF_COLORS[i % STAFF_COLORS.length].dot;

  const title = format(date, view === 'day' ? 'd MMMM yyyy' : 'LLLL yyyy', { locale });
  const subtitle =
    view === 'month'
      ? t('bookings.scheduledCount', { count: bookings.filter((b) => b.status === 'scheduled').length })
      : view === 'day'
        ? format(date, 'EEEE', { locale })
        : `${format(range.start, 'd MMM', { locale })} – ${format(addDays(range.end, -1), 'd MMM yyyy', { locale })}`;

  // Short title for the phone header, e.g. "January" or "January 2027"
  const mobileTitle = format(
    date,
    view === 'day' ? 'd MMM' : isSameYear(date, new Date()) ? 'LLLL' : 'LLLL yyyy',
    { locale }
  );

  const mobileHeader = (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-1 px-2 text-xl font-semibold capitalize">
            {mobileTitle}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuRadioGroup value={view} onValueChange={(v) => setView(v as CalendarView)}>
            {MOBILE_VIEWS.map((v) => (
              <DropdownMenuRadioItem key={v} value={v}>{t(`bookings.view.${v}`)}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => step(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Today: calendar-page icon with today's date, like Google Calendar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setDate(new Date())}
          aria-label={t('bookings.today')}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[5px] border-2 border-current border-t-[5px] text-[10px] font-bold leading-none">
            {format(new Date(), 'd')}
          </span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={t('bookings.psychologist')}>
              <Users className="h-5 w-5" />
              {staffFilter !== 'all' && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>{t('bookings.psychologist')}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={staffFilter} onValueChange={setStaffFilter}>
              <DropdownMenuRadioItem value="all">{t('bookings.allPsychologists')}</DropdownMenuRadioItem>
              {members.map((m, i) => (
                <DropdownMenuRadioItem key={m.id} value={String(m.user_id)}>
                  <span className={cn('mr-2 h-2 w-2 rounded-full flex-shrink-0', memberDot(i))} />
                  <span className="truncate">{memberName(m)}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const desktopHeader = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Date badge */}
          <button
            onClick={() => setDate(new Date())}
            className="flex flex-col items-center w-14 rounded-lg border bg-card overflow-hidden shadow-sm"
            title={t('bookings.today')}
          >
            <span className="w-full bg-muted/60 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {format(new Date(), 'MMM', { locale })}
            </span>
            <span className="py-0.5 text-lg font-bold text-primary">{format(new Date(), 'd')}</span>
          </button>
          <div>
            <h1 className="text-xl font-semibold capitalize">{title}</h1>
            <p className="text-sm text-muted-foreground capitalize">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card shadow-sm">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={() => step(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="h-9 rounded-none border-x px-3" onClick={() => setDate(new Date())}>
              {t('bookings.today')}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={() => step(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
            {DESKTOP_VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'h-8 px-3 rounded-md text-sm font-medium transition-colors',
                  view === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(`bookings.view.${v}`)}
              </button>
            ))}
          </div>

          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="h-9 w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('bookings.allPsychologists')}</SelectItem>
              {members.map((m, i) => (
                <SelectItem key={m.id} value={String(m.user_id)}>
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', memberDot(i))} />
                    {memberName(m)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => openNew()} className="h-9 gap-2">
            <Plus className="h-4 w-4" />
            {t('bookings.newBooking')}
          </Button>
        </div>
      </div>

      {/* Legend */}
      {members.length > 1 && staffFilter === 'all' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {members.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setStaffFilter(String(m.user_id))}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <span className={cn('h-2 w-2 rounded-full', memberDot(i))} />
              {memberName(m)}
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <AppLayout>
      <div className={cn('flex-1 overflow-auto', isMobile ? 'px-1 pt-1 pb-24' : 'p-4')}>
        <div className={cn('max-w-7xl mx-auto', isMobile ? 'space-y-1' : 'space-y-4')}>
          {isMobile ? mobileHeader : desktopHeader}

          <BookingCalendar
            view={view}
            date={date}
            bookings={bookings}
            staffColorIndex={staffColorIndex}
            onSelectBooking={openEdit}
            onSelectSlot={openNew}
            onSelectDay={(day) => { setDate(day); setView('day'); }}
          />
        </div>
      </div>

      {/* Floating "new booking" button on phones */}
      {isMobile && (
        <Button
          onClick={() => openNew()}
          size="icon"
          className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-2xl shadow-lg"
          aria-label={t('bookings.newBooking')}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <BookingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        booking={editingBooking}
        defaultDate={slotStart}
        defaultStaffUserId={staffFilter !== 'all' ? staffFilter : undefined}
        onSaved={fetchBookings}
        onDeleted={fetchBookings}
      />
    </AppLayout>
  );
}
