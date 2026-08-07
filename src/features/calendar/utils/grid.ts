import dayjs from 'dayjs';
import type { CalMode } from '../constants';
import type { GridEvent } from './toGridEvents';
import type { CalendarEvent } from '@/types';

export const HOUR_RAIL_WIDTH = 50;
export const DAY_HEADER_HEIGHT = 66;
/**
 * All-day chip geometry, kept exact rather than approximate.
 *
 * The reserved band used to be 26 per row, inherited from the old library,
 * while a chip actually occupies CHIP_HEIGHT + CHIP_GAP. The difference piled
 * up as dead space between the last chip and the grid. These three constants
 * are the single source of truth: TimeGridHeader lays chips out from them, so
 * the band is exactly as tall as its contents.
 */
export const ALL_DAY_CHIP_HEIGHT = 18;
export const ALL_DAY_CHIP_GAP = 4;
export const ALL_DAY_ROW_HEIGHT = ALL_DAY_CHIP_HEIGHT + ALL_DAY_CHIP_GAP;
/** Breathing room between the last chip and the grid below. */
export const ALL_DAY_PAD = 4;

export function daysPerPage(mode: CalMode): number {
  return mode === 'week' ? 7 : mode === '3days' ? 3 : 1;
}

export function dayKey(d: Date): string {
  return dayjs(d).format('YYYY-MM-DD');
}

/**
 * Offset to the first day of the week containing `subject`.
 * Ported from the library's getDatesInWeek. dayjs' startOf('week') is
 * locale-dependent and this app swaps locales at runtime, so the day-of-week
 * arithmetic is explicit.
 */
function weekStartOffset(subjectDow: number, weekStartsOn: 0 | 1): number {
  return -(subjectDow < weekStartsOn ? 7 + subjectDow : subjectDow) + weekStartsOn;
}

export function pageDates(
  anchor: Date,
  index: number,
  mode: CalMode,
  weekStartsOn: 0 | 1,
): Date[] {
  const span = daysPerPage(mode);
  const shifted = dayjs(anchor).add(index * span, 'day');
  const first =
    mode === 'week'
      ? shifted.add(weekStartOffset(shifted.day(), weekStartsOn), 'day')
      : shifted;
  return Array.from({ length: span }, (_, i) => first.add(i, 'day').startOf('day').toDate());
}

/**
 * The date the header highlights and the screen title reflects. Returning the
 * anchor when the page still contains it keeps "today" highlighted after
 * swiping away and back.
 */
export function pageFocusDate(
  anchor: Date,
  index: number,
  mode: CalMode,
  weekStartsOn: 0 | 1,
): Date {
  const dates = pageDates(anchor, index, mode, weekStartsOn);
  const anchorKey = dayKey(anchor);
  return dates.some((d) => dayKey(d) === anchorKey) ? anchor : dates[0];
}

/**
 * Inverse of pageDates: which page index shows `target`, given `anchor`.
 *
 * The pager is infinite, so a date jump never needs to move the anchor — it can
 * animate to the right index instead. Moving the anchor invalidates every cached
 * page and rebuilds the whole grid, which is what made "Today" feel like a
 * remount.
 *
 * Both dates are reduced to the first day of their page before differencing, so
 * the result is exact regardless of which day within a page either falls on.
 */
export function pageIndexForDate(
  anchor: Date,
  target: Date,
  mode: CalMode,
  weekStartsOn: 0 | 1,
): number {
  const span = daysPerPage(mode);
  const startOfPage = (d: Date) => {
    const day = dayjs(d).startOf('day');
    return mode === 'week' ? day.add(weekStartOffset(day.day(), weekStartsOn), 'day') : day;
  };
  const from = startOfPage(anchor);
  const to = startOfPage(target);
  // floor, not round: pages tile forward from the anchor, so a target part-way
  // into a page belongs to that page, not the nearest boundary. In week mode
  // both sides are week-aligned and the difference is an exact multiple of the
  // span anyway. 'day' diff is calendar-day based, so DST does not skew it.
  return Math.floor(to.diff(from, 'day') / span);
}

function sameSlice(a: GridEvent, b: GridEvent): boolean {
  if (a === b) return true;
  return (
    a._event.uid === b._event.uid &&
    a.start.getTime() === b.start.getTime() &&
    a.end.getTime() === b.end.getTime() &&
    a.title === b.title &&
    a.color === b.color &&
    a._leftPct === b._leftPct &&
    a._rightPx === b._rightPx &&
    a._zIndex === b._zIndex
  );
}

/**
 * Carry over the previous array for any day whose contents are unchanged.
 *
 * buildDayIndex allocates a fresh array per day on every rebuild, so a sync that
 * touches one day hands every DayColumn a new `events` reference and defeats
 * their memo — the whole grid re-renders for one changed event. Reusing the old
 * array where nothing changed keeps that re-render down to the days that
 * actually differ.
 *
 * Returns `next`, mutated in place; `next` is freshly built by buildDayIndex and
 * owned by the caller.
 */
export function stabilizeDayIndex(
  next: Map<string, GridEvent[]>,
  prev: Map<string, GridEvent[]>,
): Map<string, GridEvent[]> {
  for (const [key, slices] of next) {
    const before = prev.get(key);
    if (!before || before.length !== slices.length) continue;
    let identical = true;
    for (let i = 0; i < slices.length; i++) {
      if (!sameSlice(before[i], slices[i])) {
        identical = false;
        break;
      }
    }
    if (identical) next.set(key, before);
  }
  return next;
}

const DAY_MINUTES = 1440;

function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function nowTopPct(now: Date): number {
  return (100 * minutesFromMidnight(now)) / DAY_MINUTES;
}

export function eventPositionStyle(start: Date, end: Date): { top: string; height: string } {
  const durationInMinutes = dayjs(end).diff(start, 'minute');
  return {
    top: `${nowTopPct(start)}%`,
    height: `${100 * (1 / DAY_MINUTES) * durationInMinutes}%`,
  };
}

/**
 * One bucket per day, timed events only, multi-day events clamped to each day
 * they overlap. Replaces the library's three-case per-column filtering: the
 * rendered result is the same, and lookups are O(1) instead of a full scan per
 * column.
 */
export function buildDayIndex(events: GridEvent[]): Map<string, GridEvent[]> {
  const index = new Map<string, GridEvent[]>();

  for (const event of events) {
    if (event._event.allDay) continue;

    let day = dayjs(event.start).startOf('day');
    const end = dayjs(event.end);

    while (day.isBefore(end)) {
      const nextDay = day.add(1, 'day');
      const sliceStart = dayjs(event.start).isAfter(day) ? dayjs(event.start) : day;
      const sliceEnd = end.isBefore(nextDay) ? end : nextDay;

      if (sliceStart.isBefore(sliceEnd)) {
        const key = day.format('YYYY-MM-DD');
        const slice: GridEvent =
          sliceStart.isSame(event.start) && sliceEnd.isSame(event.end)
            ? event
            : { ...event, start: sliceStart.toDate(), end: sliceEnd.toDate() };
        const bucket = index.get(key);
        if (bucket) bucket.push(slice);
        else index.set(key, [slice]);
      }

      day = nextDay;
    }
  }

  return index;
}

export function allDayEventsForDay(date: Date, allDayEvents: CalendarEvent[]): CalendarEvent[] {
  const day = dayjs(date).startOf('day');
  return allDayEvents.filter((event) => {
    const start = dayjs(event.dtstart).startOf('day');
    const end = dayjs(event.dtend).startOf('day');
    return !day.isBefore(start) && !day.isAfter(end);
  });
}

export function allDayRowHeight(dates: Date[], allDayEvents: CalendarEvent[]): number {
  if (allDayEvents.length === 0) return 0;
  let maxPerDay = 0;
  for (const date of dates) {
    const count = allDayEventsForDay(date, allDayEvents).length;
    if (count > maxPerDay) maxPerDay = count;
  }
  return maxPerDay === 0 ? 0 : maxPerDay * ALL_DAY_ROW_HEIGHT + ALL_DAY_PAD;
}
