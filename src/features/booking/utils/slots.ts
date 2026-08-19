import dayjs from 'dayjs';

import type { CalendarEvent } from '@/types';
import { DEFAULT_SLOT_MINUTES, MAX_SLOT_MINUTES, MIN_SLOT_MINUTES } from '../constants';
import type { BookingDay, BookingSchedule, BookingSlot, BookingSlotStatus } from '../types';

const HM = /^(\d{1,2}):(\d{2})$/;

export function parseHm(value: string): { hour: number; minute: number } | null {
  const m = HM.exec(value.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function minutesOf(hm: string): number {
  const parsed = parseHm(hm);
  return parsed ? parsed.hour * 60 + parsed.minute : -1;
}

/**
 * Makes a persisted (or user-edited) schedule safe to render: always 7 days,
 * only valid 'HH:mm' values, normalized to two digits, deduplicated and sorted.
 */
export function normalizeSchedule(raw: unknown): BookingSchedule {
  const source = Array.isArray(raw) ? raw : [];
  const out: BookingSchedule = [];
  for (let day = 0; day < 7; day++) {
    const times = Array.isArray(source[day]) ? (source[day] as unknown[]) : [];
    const seen = new Set<string>();
    for (const entry of times) {
      if (typeof entry !== 'string') continue;
      const parsed = parseHm(entry);
      if (!parsed) continue;
      seen.add(formatHm(parsed.hour, parsed.minute));
    }
    out.push(Array.from(seen).sort((a, b) => minutesOf(a) - minutesOf(b)));
  }
  return out;
}

export function clampSlotMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SLOT_MINUTES;
  return Math.min(MAX_SLOT_MINUTES, Math.max(MIN_SLOT_MINUTES, Math.round(value)));
}

/** Monday-or-Sunday-based start of the week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const d = dayjs(date).startOf('day');
  const diff = (d.day() - weekStartsOn + 7) % 7;
  return d.subtract(diff, 'day').toDate();
}

/** The seven days of the week containing `date`, in display order. */
export function weekDays(date: Date, weekStartsOn: 0 | 1): Date[] {
  const start = dayjs(startOfWeek(date, weekStartsOn));
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day').toDate());
}

export function buildDaySlots(
  day: Date,
  schedule: BookingSchedule,
  slotMinutes: number = DEFAULT_SLOT_MINUTES,
): BookingSlot[] {
  const base = dayjs(day).startOf('day');
  const times = schedule[base.day()] ?? [];
  const dayKey = base.format('YYYY-MM-DD');
  const slots: BookingSlot[] = [];

  for (const hm of times) {
    const parsed = parseHm(hm);
    if (!parsed) continue;
    const start = base.hour(parsed.hour).minute(parsed.minute);
    slots.push({
      key: `${dayKey}T${formatHm(parsed.hour, parsed.minute)}`,
      dayKey,
      start: start.toDate(),
      end: start.add(slotMinutes, 'minute').toDate(),
    });
  }
  return slots;
}

/**
 * Events that occupy `slot`. All-day events are ignored on purpose: a birthday
 * or public holiday should not make a bookable slot look taken. Any timed
 * overlap counts, even a partial one.
 */
export function slotBusyEvents(slot: BookingSlot, events: CalendarEvent[]): CalendarEvent[] {
  const slotStart = slot.start.getTime();
  const slotEnd = slot.end.getTime();

  return events
    .filter((e) => {
      if (e.allDay) return false;
      const start = e.dtstart.getTime();
      const end = Math.max(e.dtend.getTime(), start);
      // A zero-length event counts when it sits inside the slot; anything else
      // needs a real intersection with [slotStart, slotEnd).
      if (end === start) return start >= slotStart && start < slotEnd;
      return start < slotEnd && end > slotStart;
    })
    .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());
}

export function slotStatus(slot: BookingSlot, events: CalendarEvent[]): BookingSlotStatus {
  const busyEvents = slotBusyEvents(slot, events);
  return { slot, busy: busyEvents.length > 0, events: busyEvents };
}

/**
 * The week's board: one entry per day that has slots configured, each with its
 * slots resolved against `events`. Days without configured slots are dropped so
 * the overview only lists bookable days.
 */
export function buildWeekBoard(
  date: Date,
  schedule: BookingSchedule,
  events: CalendarEvent[],
  weekStartsOn: 0 | 1,
  slotMinutes: number = DEFAULT_SLOT_MINUTES,
): BookingDay[] {
  const days: BookingDay[] = [];

  for (const day of weekDays(date, weekStartsOn)) {
    const slots = buildDaySlots(day, schedule, slotMinutes);
    if (slots.length === 0) continue;
    days.push({
      dayKey: dayjs(day).format('YYYY-MM-DD'),
      date: day,
      slots: slots.map((slot) => slotStatus(slot, events)),
    });
  }
  return days;
}

export function countFreeSlots(days: BookingDay[]): number {
  return days.reduce((sum, day) => sum + day.slots.filter((s) => !s.busy).length, 0);
}

export function countSlots(days: BookingDay[]): number {
  return days.reduce((sum, day) => sum + day.slots.length, 0);
}
