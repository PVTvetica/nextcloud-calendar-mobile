import {
  buildDaySlots,
  buildWeekBoard,
  clampSlotMinutes,
  countFreeSlots,
  countSlots,
  formatHm,
  normalizeSchedule,
  parseHm,
  slotBusyEvents,
  startOfWeek,
  weekDays,
} from '@/features/booking/utils/slots';
import { DEFAULT_SCHEDULE, DEFAULT_SLOT_MINUTES } from '@/features/booking/constants';
import type { BookingSchedule } from '@/features/booking/types';
import type { CalendarEvent } from '../../../src/types';

// 2026-08-17 is a Monday.
const MONDAY = new Date(2026, 7, 17);
const WEDNESDAY = new Date(2026, 7, 19);

function makeEvent(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    uid: 'e1', href: '/e1.ics', calendarId: 'c1', accountId: 'a1',
    summary: 'Busy',
    dtstart: new Date(2026, 7, 17, 12, 0), dtend: new Date(2026, 7, 17, 13, 0),
    allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
    ...over,
  };
}

const onlyMonday: BookingSchedule = normalizeSchedule([[], ['12:00'], [], [], [], [], []]);

describe('parseHm / formatHm', () => {
  it('parses a valid time', () => {
    expect(parseHm('09:30')).toEqual({ hour: 9, minute: 30 });
  });

  it('accepts a single-digit hour', () => {
    expect(parseHm('9:00')).toEqual({ hour: 9, minute: 0 });
  });

  it('rejects out-of-range and malformed values', () => {
    for (const bad of ['24:00', '12:60', '', 'abc', '12', '12:5', '-1:00']) {
      expect(parseHm(bad)).toBeNull();
    }
  });

  it('zero-pads when formatting', () => {
    expect(formatHm(9, 5)).toBe('09:05');
  });
});

describe('normalizeSchedule', () => {
  it('always returns seven days', () => {
    expect(normalizeSchedule([['12:00']])).toHaveLength(7);
    expect(normalizeSchedule(null)).toHaveLength(7);
    expect(normalizeSchedule(undefined)).toHaveLength(7);
  });

  it('drops invalid entries and keeps valid ones', () => {
    expect(normalizeSchedule([['12:00', 'nope', '25:00', 42]])[0]).toEqual(['12:00']);
  });

  it('deduplicates, zero-pads and sorts chronologically', () => {
    expect(normalizeSchedule([['15:00', '9:00', '09:00', '10:30']])[0])
      .toEqual(['09:00', '10:30', '15:00']);
  });

  it('leaves the shipped default schedule unchanged', () => {
    expect(normalizeSchedule(DEFAULT_SCHEDULE)).toEqual(DEFAULT_SCHEDULE);
  });

  it('keeps Wednesday at two slots in the default schedule', () => {
    expect(DEFAULT_SCHEDULE[3]).toEqual(['09:00', '10:30']);
  });
});

describe('clampSlotMinutes', () => {
  it('keeps a sane value', () => {
    expect(clampSlotMinutes(90)).toBe(90);
  });

  it('clamps out-of-range values and falls back on garbage', () => {
    expect(clampSlotMinutes(1)).toBe(15);
    expect(clampSlotMinutes(10_000)).toBe(480);
    expect(clampSlotMinutes(Number.NaN)).toBe(DEFAULT_SLOT_MINUTES);
  });
});

describe('startOfWeek / weekDays', () => {
  it('starts on Monday when configured', () => {
    expect(startOfWeek(WEDNESDAY, 1).getDate()).toBe(17);
  });

  it('starts on Sunday when configured', () => {
    expect(startOfWeek(WEDNESDAY, 0).getDate()).toBe(16);
  });

  it('returns seven consecutive days in display order', () => {
    const days = weekDays(WEDNESDAY, 1);
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.getDate())).toEqual([17, 18, 19, 20, 21, 22, 23]);
  });
});

describe('buildDaySlots', () => {
  it('builds one slot per configured time, each slotMinutes long', () => {
    const slots = buildDaySlots(MONDAY, DEFAULT_SCHEDULE);

    expect(slots).toHaveLength(5);
    expect(slots[0].start.getHours()).toBe(12);
    expect(slots[0].end.getHours()).toBe(13);
    expect(slots[0].end.getMinutes()).toBe(30);
    expect(slots[0].dayKey).toBe('2026-08-17');
    expect(slots[0].key).toBe('2026-08-17T12:00');
  });

  it('honours a custom slot length', () => {
    const [slot] = buildDaySlots(MONDAY, onlyMonday, 60);
    expect(slot.end.getHours()).toBe(13);
    expect(slot.end.getMinutes()).toBe(0);
  });

  it('returns nothing for a day without configured times', () => {
    expect(buildDaySlots(new Date(2026, 7, 22), DEFAULT_SCHEDULE)).toEqual([]);
  });
});

describe('slotBusyEvents', () => {
  const [slot] = buildDaySlots(MONDAY, onlyMonday); // Mon 12:00–13:30

  const cases: Array<[string, Partial<CalendarEvent>, boolean]> = [
    ['event ending exactly at slot start', { dtstart: new Date(2026, 7, 17, 11, 0), dtend: new Date(2026, 7, 17, 12, 0) }, false],
    ['event starting exactly at slot end', { dtstart: new Date(2026, 7, 17, 13, 30), dtend: new Date(2026, 7, 17, 14, 30) }, false],
    ['event entirely before', { dtstart: new Date(2026, 7, 17, 8, 0), dtend: new Date(2026, 7, 17, 9, 0) }, false],
    ['event on another day', { dtstart: new Date(2026, 7, 18, 12, 0), dtend: new Date(2026, 7, 18, 13, 0) }, false],
    ['event inside the slot', { dtstart: new Date(2026, 7, 17, 12, 15), dtend: new Date(2026, 7, 17, 12, 45) }, true],
    ['event overlapping the start', { dtstart: new Date(2026, 7, 17, 11, 30), dtend: new Date(2026, 7, 17, 12, 30) }, true],
    ['event overlapping the end', { dtstart: new Date(2026, 7, 17, 13, 0), dtend: new Date(2026, 7, 17, 14, 0) }, true],
    ['event covering the whole slot', { dtstart: new Date(2026, 7, 17, 8, 0), dtend: new Date(2026, 7, 17, 20, 0) }, true],
    ['zero-length event inside the slot', { dtstart: new Date(2026, 7, 17, 12, 30), dtend: new Date(2026, 7, 17, 12, 30) }, true],
  ];

  it.each(cases)('%s -> busy: %j', (_label, over, expected) => {
    expect(slotBusyEvents(slot, [makeEvent(over)]).length > 0).toBe(expected);
  });

  it('ignores all-day events so birthdays do not block a slot', () => {
    const allDay = makeEvent({
      summary: 'Birthday', allDay: true,
      dtstart: new Date(2026, 7, 17), dtend: new Date(2026, 7, 17),
    });
    expect(slotBusyEvents(slot, [allDay])).toEqual([]);
  });

  it('returns every overlapping event, chronologically', () => {
    const late = makeEvent({ uid: 'late', dtstart: new Date(2026, 7, 17, 13, 0), dtend: new Date(2026, 7, 17, 14, 0) });
    const early = makeEvent({ uid: 'early', dtstart: new Date(2026, 7, 17, 12, 0), dtend: new Date(2026, 7, 17, 12, 30) });

    expect(slotBusyEvents(slot, [late, early]).map((e) => e.uid)).toEqual(['early', 'late']);
  });
});

describe('buildWeekBoard', () => {
  it('lists only days that have configured slots', () => {
    const board = buildWeekBoard(WEDNESDAY, DEFAULT_SCHEDULE, [], 1);
    expect(board.map((d) => d.dayKey)).toEqual([
      '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
    ]);
  });

  it('resolves each slot against the events of the week', () => {
    const board = buildWeekBoard(MONDAY, onlyMonday, [makeEvent()], 1);

    expect(board).toHaveLength(1);
    expect(board[0].slots[0].busy).toBe(true);
    expect(board[0].slots[0].events[0].summary).toBe('Busy');
  });

  it('marks a slot free when nothing overlaps', () => {
    const board = buildWeekBoard(MONDAY, onlyMonday, [], 1);
    expect(board[0].slots[0].busy).toBe(false);
    expect(board[0].slots[0].events).toEqual([]);
  });

  it('covers the same days regardless of the week start setting', () => {
    const monday = buildWeekBoard(WEDNESDAY, DEFAULT_SCHEDULE, [], 1);
    const sunday = buildWeekBoard(WEDNESDAY, DEFAULT_SCHEDULE, [], 0);
    expect(sunday.map((d) => d.dayKey)).toEqual(monday.map((d) => d.dayKey));
  });

  it('counts free and total slots', () => {
    // 5 (Mon) + 6 (Tue) + 2 (Wed) + 6 (Thu) + 4 (Fri) = 23 slots a week.
    const board = buildWeekBoard(MONDAY, DEFAULT_SCHEDULE, [makeEvent()], 1);
    expect(countSlots(board)).toBe(23);
    expect(countFreeSlots(board)).toBe(22);
  });
});
