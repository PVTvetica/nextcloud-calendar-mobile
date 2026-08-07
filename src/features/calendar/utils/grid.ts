import dayjs from 'dayjs';
import type { CalMode } from '../constants';

export const HOUR_RAIL_WIDTH = 50;
export const DAY_HEADER_HEIGHT = 66;
export const ALL_DAY_ROW_HEIGHT = 26;
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
