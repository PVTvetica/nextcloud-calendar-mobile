import {
  buildBlockEventInput,
  resolveBlockSummary,
  resolveBookingCalendar,
} from '@/features/booking/utils/blockEvent';
import { buildDaySlots, normalizeSchedule } from '@/features/booking/utils/slots';
import type { CalendarMeta } from '../../../src/types';

const MONDAY = new Date(2026, 7, 17);
const [slot] = buildDaySlots(MONDAY, normalizeSchedule([[], ['12:00'], [], [], [], [], []]));

function cal(over: Partial<CalendarMeta> = {}): CalendarMeta {
  return {
    id: 'https://cloud.example.com/dav/personal/',
    accountId: 'a1',
    displayName: 'Personal',
    color: '#0082c9',
    ctag: 'c1',
    url: 'https://cloud.example.com/dav/personal/',
    slug: 'personal',
    ...over,
  };
}

describe('resolveBlockSummary', () => {
  it('uses the translated label of a preset reason', () => {
    expect(resolveBlockSummary({ reason: 'vacation', customTitle: '', presetLabel: 'Urlaub' }))
      .toBe('Urlaub');
  });

  it('ignores typed text while a preset reason is selected', () => {
    expect(resolveBlockSummary({ reason: 'sport', customTitle: 'ignored', presetLabel: 'Sport' }))
      .toBe('Sport');
  });

  it('uses the trimmed custom title for the custom reason', () => {
    expect(resolveBlockSummary({ reason: 'custom', customTitle: '  Zahnarzt  ', presetLabel: 'Other' }))
      .toBe('Zahnarzt');
  });

  it('returns null when the custom title is blank', () => {
    for (const customTitle of ['', '   ']) {
      expect(resolveBlockSummary({ reason: 'custom', customTitle, presetLabel: 'Other' })).toBeNull();
    }
  });
});

describe('buildBlockEventInput', () => {
  const input = buildBlockEventInput({
    slot,
    calendarId: 'https://cloud.example.com/dav/personal/',
    summary: 'Urlaub',
    organizerEmail: 'me@example.com',
    organizerName: 'Me',
  });

  it('covers exactly the slot', () => {
    expect(input.dtstart).toEqual(slot.start);
    expect(input.dtend).toEqual(slot.end);
    expect(input.allDay).toBe(false);
  });

  it('carries the reason as the event title', () => {
    expect(input.summary).toBe('Urlaub');
  });

  it('creates no Talk room and invites nobody', () => {
    expect(input.withTalkRoom).toBe(false);
    expect(input.attendees).toEqual([]);
  });

  it('targets the given calendar and organizer', () => {
    expect(input.calendarId).toBe('https://cloud.example.com/dav/personal/');
    expect(input.organizerEmail).toBe('me@example.com');
    expect(input.organizerName).toBe('Me');
  });
});

describe('resolveBookingCalendar', () => {
  const personal = cal();
  const work = cal({ id: 'work', url: 'work', displayName: 'Work', slug: 'work' });
  const readOnly = cal({ id: 'ro', url: 'ro', displayName: 'Shared', isReadOnly: true });
  const subscribed = cal({ id: 'sub', url: 'sub', displayName: 'Holidays', isSubscribed: true });

  it('picks the configured calendar', () => {
    expect(resolveBookingCalendar([personal, work], 'work')?.id).toBe('work');
  });

  it('falls back to the first writable calendar when the configured one is gone', () => {
    expect(resolveBookingCalendar([personal, work], 'deleted')?.id).toBe(personal.id);
  });

  it('falls back when nothing is configured yet', () => {
    expect(resolveBookingCalendar([personal, work], null)?.id).toBe(personal.id);
  });

  it('never picks a read-only or subscribed calendar', () => {
    expect(resolveBookingCalendar([readOnly, subscribed, work], 'ro')?.id).toBe('work');
    expect(resolveBookingCalendar([readOnly, subscribed, work], 'sub')?.id).toBe('work');
  });

  it('returns null when no calendar can be written to', () => {
    expect(resolveBookingCalendar([readOnly, subscribed], null)).toBeNull();
    expect(resolveBookingCalendar([], null)).toBeNull();
  });
});
