import type { CalendarEvent } from '@/types';

export interface GridEvent {
  title: string;
  start: Date;
  end: Date;
  color: string;
  _event: CalendarEvent;
}

export function toGridEvents(events: CalendarEvent[]): GridEvent[] {
  return events.map((e) => ({
    title: e.summary,
    start: e.dtstart,
    end: e.dtend,
    color: e.color,
    _event: e,
  }));
}
