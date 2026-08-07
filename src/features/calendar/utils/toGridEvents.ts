import type { CalendarEvent } from '@/types';
import type { computeOverlapMap } from '@/features/calendar/utils/overlapMap';

type OverlapMap = ReturnType<typeof computeOverlapMap>;

export interface GridEvent {
  title: string;
  start: Date;
  end: Date;
  color: string;
  _event: CalendarEvent;
  _leftPct: number;
  _rightPx: number;
  _zIndex: number;
}

const DEFAULT_OVERLAP = { leftPct: 0, rightPx: 3, zIndex: 100 };

export function toGridEvents(events: CalendarEvent[], overlapMap: OverlapMap): GridEvent[] {
  return events.map((e) => {
    const overlap = overlapMap.get(e.uid) ?? DEFAULT_OVERLAP;
    return {
      title: e.summary,
      start: e.dtstart,
      end: e.dtend,
      color: e.color,
      _event: e,
      _leftPct: overlap.leftPct,
      _rightPx: overlap.rightPx,
      _zIndex: overlap.zIndex,
    };
  });
}
