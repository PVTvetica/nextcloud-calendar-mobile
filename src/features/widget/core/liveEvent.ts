import type { CalendarEvent } from '@/types';
import { type LiveEventState, eventDeepLink } from './types';

export function selectOngoingEvent(events: CalendarEvent[], now: Date = new Date()): LiveEventState | null {
  const t = now.getTime();
  const ongoing = events
    .filter((e) => !e.allDay && e.dtstart.getTime() <= t && e.dtend.getTime() > t)
    .sort((a, b) => a.dtend.getTime() - b.dtend.getTime());

  const e = ongoing[0];
  if (!e) return null;
  return {
    uid: e.uid,
    title: e.summary || '(no title)',
    startIso: e.dtstart.toISOString(),
    endIso: e.dtend.toISOString(),
    color: e.color,
    deepLink: eventDeepLink(e.uid),
    location: e.location ?? '',
    attendees: e.attendees.map((a) => a.displayName || a.email).filter(Boolean),
  };
}

export function eventProgress(state: LiveEventState, now: Date = new Date()): number {
  const start = new Date(state.startIso).getTime();
  const end = new Date(state.endIso).getTime();
  if (end <= start) return 1;
  const p = (now.getTime() - start) / (end - start);
  return Math.min(1, Math.max(0, p));
}

export function remainingMinutes(state: LiveEventState, now: Date = new Date()): number {
  const end = new Date(state.endIso).getTime();
  return Math.max(0, Math.round((end - now.getTime()) / 60000));
}

export interface DurationUnits {
  hour: string;
  minute: string;
}

export const DEFAULT_DURATION_UNITS: DurationUnits = { hour: 'h', minute: 'm' };

export function formatRemaining(minutes: number, units: DurationUnits = DEFAULT_DURATION_UNITS): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}${units.minute}`;
  if (m === 0) return `${h}${units.hour}`;
  return `${h}${units.hour}${String(m).padStart(2, '0')}`;
}
