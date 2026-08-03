import type { CalendarEvent } from '@/types';
import { zonedWallTimeToUtc } from '@/utils/timezone';

import { buildAgendaSnapshot, type BuildAgendaOptions } from './agendaSnapshot';
import type { AgendaTimelineEntry } from './types';

const DEFAULT_HORIZON_HOURS = 48;
const DEFAULT_MAX_ENTRIES = 32;

export interface BuildTimelineOptions extends BuildAgendaOptions {
  horizonHours?: number;
  maxEntries?: number;
}

export function agendaBoundaries(
  events: CalendarEvent[],
  now: Date,
  timeZone: string,
  horizonHours: number,
): Date[] {
  const from = now.getTime();
  const until = from + horizonHours * 3_600_000;
  const marks = new Set<number>();

  for (const e of events) {
    if (e.allDay) continue;
    const end = e.dtend.getTime();
    if (end > from && end <= until) marks.add(end);
  }

  const dayFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  for (let i = 1; i <= Math.ceil(horizonHours / 24) + 1; i++) {
    const [y, m, d] = dayFmt.format(new Date(from + i * 86_400_000)).split('-').map(Number);
    const midnight = zonedWallTimeToUtc(y, m, d, 0, 0, 0, timeZone).getTime();
    if (midnight > from && midnight <= until) marks.add(midnight);
  }

  return [...marks].sort((a, b) => a - b).map((t) => new Date(t));
}

export function buildAgendaTimeline(
  events: CalendarEvent[],
  options: BuildTimelineOptions = {},
): AgendaTimelineEntry[] {
  const {
    horizonHours = DEFAULT_HORIZON_HOURS,
    maxEntries = DEFAULT_MAX_ENTRIES,
    ...snapshotOptions
  } = options;

  const now = snapshotOptions.now ?? new Date();
  const timeZone = snapshotOptions.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const dates = [now, ...agendaBoundaries(events, now, timeZone, horizonHours)]
    .slice(0, Math.max(1, maxEntries));

  return dates.map((date) => ({
    atIso: date.toISOString(),
    snapshot: buildAgendaSnapshot(events, { ...snapshotOptions, timeZone, now: date }),
  }));
}

export function selectSnapshotAt(
  timeline: AgendaTimelineEntry[],
  now: Date = new Date(),
): AgendaTimelineEntry['snapshot'] | null {
  const t = now.getTime();
  let current: AgendaTimelineEntry | null = null;
  for (const entry of timeline) {
    if (new Date(entry.atIso).getTime() <= t) current = entry;
    else break;
  }
  return (current ?? timeline[0])?.snapshot ?? null;
}
