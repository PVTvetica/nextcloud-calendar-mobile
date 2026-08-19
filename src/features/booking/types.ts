import type { CalendarEvent } from '@/types';

/** Weekday index as returned by dayjs().day(): 0 = Sunday … 6 = Saturday. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Slot start times per weekday, indexed by WeekdayIndex, each entry a list of
 * 'HH:mm' strings. Persisted as-is, so it is normalized on read
 * (see normalizeSchedule).
 */
export type BookingSchedule = string[][];

export interface BookingSlot {
  /** Stable identity of this slot, e.g. '2026-08-17T12:00'. */
  key: string;
  /** 'YYYY-MM-DD' of the day the slot belongs to. */
  dayKey: string;
  start: Date;
  end: Date;
}

export interface BookingSlotStatus {
  slot: BookingSlot;
  /** True when at least one timed event overlaps the slot. */
  busy: boolean;
  /** The overlapping events, chronologically; empty when free. */
  events: CalendarEvent[];
}

export interface BookingDay {
  dayKey: string;
  date: Date;
  slots: BookingSlotStatus[];
}
