import { eventToInput } from '@/features/calendar/utils/eventToInput';
import type { CalendarEvent } from '@/types';

const base: CalendarEvent = {
  uid: 'u1', href: '/u1.ics', calendarId: 'cal-1', accountId: 'a1',
  summary: 'Standup',
  description: 'Daily sync',
  location: 'Room 2',
  dtstart: new Date(2026, 7, 7, 9, 0),
  dtend: new Date(2026, 7, 7, 9, 30),
  allDay: false,
  color: '#0082c9',
  attendees: [{ email: 'a@example.org', displayName: 'A' }],
  organizerEmail: 'me@example.org',
  isRecurring: false,
  alarmMinutes: 10,
};

describe('eventToInput', () => {
  it('carries every field the update path needs', () => {
    const input = eventToInput(base);
    expect(input.summary).toBe('Standup');
    expect(input.calendarId).toBe('cal-1');
    expect(input.dtstart).toEqual(base.dtstart);
    expect(input.dtend).toEqual(base.dtend);
    expect(input.allDay).toBe(false);
    expect(input.description).toBe('Daily sync');
    expect(input.location).toBe('Room 2');
    expect(input.attendees).toEqual(base.attendees);
    expect(input.organizerEmail).toBe('me@example.org');
    expect(input.alarmMinutes).toBe(10);
  });

  it('never asks for a new Talk room', () => {
    // A drag changes times, nothing else. Requesting a room would create one.
    expect(eventToInput(base).withTalkRoom).toBe(false);
  });

  it('reads the stored recurrence rule back so a drag does not destroy the series', () => {
    const recurring: CalendarEvent = {
      ...base,
      isRecurring: true,
      rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO',
    };
    expect(eventToInput(recurring).rrule).toEqual({ freq: 'WEEKLY', byDay: ['MO'] });
  });

  it('leaves rrule undefined when the stored rule cannot be represented exactly', () => {
    const exotic: CalendarEvent = {
      ...base,
      isRecurring: true,
      rrule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=15',
    };
    expect(eventToInput(exotic).rrule).toBeUndefined();
  });

  it('tolerates an event with no optional fields', () => {
    const bare: CalendarEvent = {
      ...base,
      description: undefined,
      location: undefined,
      organizerEmail: undefined,
      alarmMinutes: undefined,
    };
    const input = eventToInput(bare);
    expect(input.description).toBeUndefined();
    expect(input.organizerEmail).toBe('');
    expect(input.organizerName).toBe('');
  });

  it('does not alias the attendee array', () => {
    const input = eventToInput(base);
    expect(input.attendees).not.toBe(base.attendees);
  });
});
