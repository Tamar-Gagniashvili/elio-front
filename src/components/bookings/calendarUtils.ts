import { useTranslation } from 'react-i18next';
import { addDays, addMonths, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, type Locale } from 'date-fns';
import { enUS, ka, ru } from 'date-fns/locale';

/** threeDay is the mobile replacement for week, which is too narrow on phones */
export type CalendarView = 'month' | 'week' | 'threeDay' | 'day';

/** Fired on window after a booking is created, updated or deleted */
export const BOOKINGS_CHANGED_EVENT = 'bookings:changed';

export const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

const DATE_LOCALES: Record<string, Locale> = { en: enUS, ka, ru };

export const useDateLocale = () => {
  const { i18n } = useTranslation();
  return DATE_LOCALES[i18n.language?.slice(0, 2)] ?? enUS;
};

// Full class strings so Tailwind's JIT picks them up
export const STAFF_COLORS = [
  { event: 'bg-blue-600 text-white hover:bg-blue-700', dot: 'bg-blue-600' },
  { event: 'bg-emerald-600 text-white hover:bg-emerald-700', dot: 'bg-emerald-600' },
  { event: 'bg-violet-600 text-white hover:bg-violet-700', dot: 'bg-violet-600' },
  { event: 'bg-orange-500 text-white hover:bg-orange-600', dot: 'bg-orange-500' },
  { event: 'bg-rose-600 text-white hover:bg-rose-700', dot: 'bg-rose-600' },
  { event: 'bg-teal-600 text-white hover:bg-teal-700', dot: 'bg-teal-600' },
  { event: 'bg-amber-400 text-amber-950 hover:bg-amber-500', dot: 'bg-amber-400' },
  { event: 'bg-sky-500 text-white hover:bg-sky-600', dot: 'bg-sky-500' },
];

export const CANCELLED_COLOR = {
  event: 'bg-card text-muted-foreground border border-dashed border-muted-foreground/40 hover:bg-muted',
  dot: 'bg-muted-foreground/50',
};

/** Visible date range for a view, used both for rendering and for fetching */
export function getViewRange(view: CalendarView, date: Date): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(date), end: addDays(startOfDay(date), 1) };
  if (view === 'threeDay') return { start: startOfDay(date), end: addDays(startOfDay(date), 3) };
  if (view === 'week') {
    const start = startOfWeek(date, WEEK_OPTIONS);
    return { start, end: addDays(start, 7) };
  }
  const start = startOfWeek(startOfMonth(date), WEEK_OPTIONS);
  return { start, end: addDays(endOfWeek(endOfMonth(date), WEEK_OPTIONS), 1) };
}

/** Moves the date one view-length back or forward */
export function stepDate(view: CalendarView, date: Date, direction: 1 | -1): Date {
  if (view === 'month') return addMonths(date, direction);
  const days = { week: 7, threeDay: 3, day: 1 }[view];
  return addDays(date, days * direction);
}
