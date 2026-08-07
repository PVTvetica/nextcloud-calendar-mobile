import type { CalendarEvent } from '@/types';

export interface GridEvent {
  title: string;
  start: Date;
  end: Date;
  color: string;
  _event: CalendarEvent;
}

/**
 * Domain events to grid events. Geometry is no longer stamped on here: overlap
 * layout is computed per day by layoutDay, from the slices buildDayIndex
 * produces, so a multi-day event can no longer drag a whole week's worth of
 * events into one column group.
 */
export function toGridEvents(events: CalendarEvent[]): GridEvent[] {
  return events.map((e) => ({
    title: e.summary,
    start: e.dtstart,
    end: e.dtend,
    color: e.color,
    _event: e,
  }));
}
