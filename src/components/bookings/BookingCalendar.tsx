import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, differenceInMinutes, eachDayOfInterval, format, isSameDay, isSameMonth, isToday, set } from 'date-fns';
import { Check, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Booking } from '@/lib/types';
import {
  CANCELLED_COLOR,
  STAFF_COLORS,
  getViewRange,
  useDateLocale,
  type CalendarView,
} from './calendarUtils';

const HOUR_HEIGHT = 72; // px per hour in week/day views
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
const MAX_EVENTS_PER_MONTH_CELL = 3;
const MAX_EVENTS_PER_MONTH_CELL_MOBILE = 4;
const CASCADE_MINUTES = 30; // bookings starting further apart than this cascade instead of sitting side by side
const INDENT_PX = 16;

interface BookingCalendarProps {
  view: CalendarView;
  date: Date;
  bookings: Booking[];
  /** staff_user_id -> index into STAFF_COLORS */
  staffColorIndex: Record<number, number>;
  onSelectBooking: (booking: Booking) => void;
  /** Click on an empty slot (week/day) or empty part of a day cell (month) */
  onSelectSlot: (start: Date) => void;
  /** Click on a day number in month view */
  onSelectDay: (day: Date) => void;
}

export function BookingCalendar(props: BookingCalendarProps) {
  return props.view === 'month' ? <MonthView {...props} /> : <TimeGridView {...props} />;
}

function useColorFor(staffColorIndex: Record<number, number>) {
  return (booking: Booking) =>
    booking.status === 'cancelled'
      ? CANCELLED_COLOR
      : STAFF_COLORS[(staffColorIndex[booking.staff_user_id] ?? 0) % STAFF_COLORS.length];
}

const clientLabel = (booking: Booking, fallback: string) =>
  booking.contact?.name || booking.title || fallback;

/* ───────────────────────────── Month view ───────────────────────────── */

function MonthView({ date, bookings, staffColorIndex, onSelectBooking, onSelectSlot, onSelectDay }: BookingCalendarProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const colorFor = useColorFor(staffColorIndex);
  const isMobile = useIsMobile();
  const { start, end } = getViewRange('month', date);
  const days = eachDayOfInterval({ start, end: addDays(end, -1) });
  const maxEvents = isMobile ? MAX_EVENTS_PER_MONTH_CELL_MOBILE : MAX_EVENTS_PER_MONTH_CELL;

  return (
    <div className={cn('flex flex-col bg-card overflow-hidden', isMobile ? 'border-y' : 'rounded-lg border')}>
      <div className="grid grid-cols-7 border-b">
        {days.slice(0, 7).map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'text-center font-medium text-muted-foreground',
              isMobile ? 'py-1 text-[10px]' : 'px-2 py-2 text-[11px] uppercase tracking-wide'
            )}
          >
            {format(day, 'EEE', { locale })}
          </div>
        ))}
      </div>
      <div className={cn('grid grid-cols-7', isMobile ? 'auto-rows-[minmax(6.5rem,1fr)]' : 'auto-rows-[minmax(7rem,1fr)]')}>
        {days.map((day, i) => {
          const dayBookings = bookings.filter((b) => isSameDay(new Date(b.starts_at), day));
          const hidden = dayBookings.length - maxEvents;
          return (
            <div
              key={day.toISOString()}
              // On phones a tap opens the day (cells are too small to aim at); on desktop it books a slot
              onClick={() => (isMobile ? onSelectDay(day) : onSelectSlot(set(day, { hours: 10, minutes: 0 })))}
              className={cn(
                'group flex flex-col min-w-0 border-b border-r cursor-pointer hover:bg-muted/30 transition-colors',
                isMobile ? 'gap-[2px] px-[2px] pb-[2px]' : 'gap-0.5 p-1.5',
                (i + 1) % 7 === 0 && 'border-r-0',
                !isSameMonth(day, date) && 'bg-muted/20'
              )}
            >
              <button
                onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                className={cn(
                  'self-center rounded-full hover:bg-muted',
                  isMobile ? 'my-0.5 h-5 min-w-5 px-0.5 text-[11px]' : 'mb-0.5 h-7 min-w-7 px-1 text-sm',
                  !isSameMonth(day, date) && 'text-muted-foreground/60',
                  isToday(day) && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                {format(day, 'd')}
              </button>
              {dayBookings.slice(0, maxEvents).map((booking) => {
                const color = colorFor(booking);
                if (isMobile) {
                  // Solid mini chips, Google Calendar mobile style
                  return (
                    <button
                      key={booking.id}
                      onClick={(e) => { e.stopPropagation(); onSelectBooking(booking); }}
                      className={cn(
                        'w-full truncate rounded-[3px] px-1 py-px text-left text-[10px] font-medium leading-tight',
                        color.event,
                        booking.status === 'cancelled' && 'line-through'
                      )}
                    >
                      {clientLabel(booking, t('bookings.noClient'))}
                    </button>
                  );
                }
                return (
                  <button
                    key={booking.id}
                    onClick={(e) => { e.stopPropagation(); onSelectBooking(booking); }}
                    className={cn(
                      'flex items-center gap-1.5 w-full rounded px-1 py-0.5 text-left text-xs hover:bg-muted transition-colors',
                      booking.status === 'cancelled' && 'text-muted-foreground line-through'
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full flex-shrink-0', color.dot)} />
                    <span className="flex-shrink-0 text-muted-foreground tabular-nums">
                      {format(new Date(booking.starts_at), 'HH:mm')}
                    </span>
                    <span className="truncate font-medium">{clientLabel(booking, t('bookings.noClient'))}</span>
                  </button>
                );
              })}
              {hidden > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                  className={cn(
                    'font-medium text-muted-foreground hover:text-foreground',
                    isMobile ? 'self-center text-[10px] leading-tight' : 'self-start px-1.5 text-xs'
                  )}
                >
                  {t('bookings.moreCount', { count: hidden })}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────── Week / Day view ─────────────────────────── */

interface PositionedBooking {
  booking: Booking;
  /** Nesting level: drawn indented on top of an earlier booking it starts inside of */
  indent: number;
  /** Position among bookings starting at (about) the same time, which sit side by side */
  column: number;
  columns: number;
}

/**
 * Google Calendar-style layout. Bookings starting within CASCADE_MINUTES of each
 * other share the width side by side; a booking starting later inside another one
 * is indented and drawn on top, so both keep most of the column width.
 */
function layoutDay(bookings: Booking[]): PositionedBooking[] {
  const cascadeMs = CASCADE_MINUTES * 60_000;
  const items = bookings
    .map((booking) => ({
      booking,
      start: new Date(booking.starts_at).getTime(),
      end: new Date(booking.ends_at).getTime(),
    }))
    .sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));

  type Placed = PositionedBooking & { start: number; end: number; group: Placed[] };
  const placed: Placed[] = [];

  for (const item of items) {
    const overlaps = placed.filter((p) => p.start < item.end && item.start < p.end);
    const parents = overlaps.filter((p) => item.start - p.start >= cascadeMs);
    const indent = parents.length ? Math.max(...parents.map((p) => p.indent)) + 1 : 0;
    const sibling = overlaps.find((p) => item.start - p.start < cascadeMs && p.indent === indent);
    const group = sibling ? sibling.group : [];

    const entry: Placed = { ...item, indent, column: group.length, columns: 1, group };
    group.push(entry);
    placed.push(entry);
  }

  return placed.map(({ booking, indent, column, group }) => ({ booking, indent, column, columns: group.length }));
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function TimeGridView({ view, date, bookings, staffColorIndex, onSelectBooking, onSelectSlot, onSelectDay }: BookingCalendarProps) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const colorFor = useColorFor(staffColorIndex);
  const now = useNow();
  const isMobile = useIsMobile();
  const gutter = isMobile ? 'w-10' : 'w-16';
  const { start, end } = getViewRange(view, date);
  const days = eachDayOfInterval({ start, end: addDays(end, -1) });

  // Widen the visible hours if any booking falls outside the default range
  const [startHour, endHour] = useMemo(() => {
    let min = DEFAULT_START_HOUR;
    let max = DEFAULT_END_HOUR;
    for (const b of bookings) {
      const s = new Date(b.starts_at);
      const e = new Date(b.ends_at);
      min = Math.min(min, s.getHours());
      max = Math.max(max, isSameDay(s, e) ? Math.ceil(e.getHours() + e.getMinutes() / 60) : 24);
    }
    return [min, max];
  }, [bookings]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const minutesToPx = (mins: number) => (mins / 60) * HOUR_HEIGHT;

  const handleGridClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const offsetY = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const totalMinutes = startHour * 60 + Math.floor((offsetY / HOUR_HEIGHT) * 2) * 30; // snap to 30 min
    onSelectSlot(set(day, { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60, seconds: 0 }));
  };

  return (
    <div className={cn('flex flex-col bg-card overflow-hidden', isMobile ? 'border-y' : 'rounded-lg border')}>
      {/* Day headers */}
      <div className="flex border-b">
        <div className={cn(gutter, 'flex-shrink-0')} />
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={cn(
              'flex-1 min-w-0 flex flex-col border-l hover:bg-muted/50 transition-colors',
              isMobile ? 'items-center py-1.5' : 'items-start px-3 pt-2 pb-2.5 text-left',
              isToday(day) && 'bg-muted/40'
            )}
          >
            <span
              className={cn(
                'text-[11px] font-medium uppercase tracking-wide',
                isToday(day) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {format(day, 'EEE', { locale })}
            </span>
            <span
              className={cn(
                'font-light leading-tight tabular-nums',
                isMobile ? (days.length > 3 ? 'text-lg' : 'text-2xl') : 'text-3xl',
                isToday(day) ? 'text-primary font-normal' : 'text-foreground/80'
              )}
            >
              {format(day, 'd')}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex">
        {/* Hour labels */}
        <div className={cn(gutter, 'flex-shrink-0')}>
          {hours.map((hour) => (
            <div key={hour} style={{ height: HOUR_HEIGHT }} className="relative">
              <span className={cn('absolute -top-2 text-muted-foreground tabular-nums', isMobile ? 'right-1 text-[10px]' : 'right-2 text-[11px]')}>
                {hour === startHour ? '' : `${String(hour).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayBookings = layoutDay(bookings.filter((b) => isSameDay(new Date(b.starts_at), day)));
          const nowOffset = differenceInMinutes(now, set(day, { hours: startHour, minutes: 0, seconds: 0 }));
          const showNow = isToday(day) && nowOffset >= 0 && nowOffset <= (endHour - startHour) * 60;

          return (
            <div
              key={day.toISOString()}
              className={cn('relative flex-1 min-w-0 border-l cursor-pointer', isToday(day) && 'bg-muted/40')}
              style={{ height: hours.length * HOUR_HEIGHT }}
              onClick={(e) => handleGridClick(day, e)}
            >
              {/* Hour lines */}
              {hours.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}

              {/* Bookings */}
              {dayBookings.map(({ booking, indent, column, columns }) => {
                const s = new Date(booking.starts_at);
                const e = new Date(booking.ends_at);
                const top = minutesToPx(differenceInMinutes(s, set(day, { hours: startHour, minutes: 0, seconds: 0 })));
                const height = Math.max(minutesToPx(differenceInMinutes(e, s)), 22);
                const color = colorFor(booking);
                const compact = height < 40;
                const narrow = columns > 1;
                const isPast = e < now && booking.status !== 'cancelled';
                const indentPx = indent * INDENT_PX;
                const name = clientLabel(booking, t('bookings.noClient'));
                const time = narrow ? format(s, 'HH:mm') : `${format(s, 'HH:mm')} – ${format(e, 'HH:mm')}`;
                return (
                  <button
                    key={booking.id}
                    onClick={(ev) => { ev.stopPropagation(); onSelectBooking(booking); }}
                    className={cn(
                      'absolute rounded-[5px] text-left leading-snug overflow-hidden ring-1 ring-card transition-[filter,background-color]',
                      isMobile ? 'px-1 py-0.5 text-[11px]' : 'px-1.5 py-1 text-xs',
                      color.event,
                      isPast && 'saturate-[.65] opacity-80',
                      indent > 0 && 'shadow-md'
                    )}
                    style={{
                      top: top + 1,
                      height: height - 2,
                      left: `calc(${indentPx}px + (100% - ${indentPx}px) * ${column / columns} + 1px)`,
                      width: `calc((100% - ${indentPx}px) / ${columns} - 3px)`,
                      zIndex: indent * 10 + column + 1,
                    }}
                  >
                    {compact ? (
                      <p className="truncate">
                        <span className={cn('font-medium', booking.status === 'cancelled' && 'line-through')}>{name}</span>
                        <span className="opacity-90">, {format(s, 'HH:mm')}</span>
                      </p>
                    ) : (
                      <>
                        <div className="flex items-start gap-1 min-w-0">
                          <span
                            className={cn(
                              'font-medium',
                              height >= 72 && !narrow ? 'line-clamp-2' : 'truncate',
                              booking.status === 'cancelled' && 'line-through'
                            )}
                          >
                            {name}
                          </span>
                          {!narrow && booking.status === 'completed' && <Check className="mt-0.5 h-3 w-3 flex-shrink-0" />}
                          {!narrow && booking.status === 'no_show' && <UserX className="mt-0.5 h-3 w-3 flex-shrink-0" />}
                        </div>
                        <p className="truncate opacity-90 tabular-nums">{time}</p>
                        {view === 'day' && (
                          <p className="truncate opacity-90">
                            {[booking.title, booking.staff_profile?.full_name].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </>
                    )}
                  </button>
                );
              })}

              {/* Current time */}
              {showNow && (
                <div className="absolute inset-x-0 pointer-events-none" style={{ top: minutesToPx(nowOffset), zIndex: 100 }}>
                  <div className="relative border-t-2 border-red-500">
                    <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
