import { buildAgendaSnapshot } from '@/features/widget/core/agendaSnapshot';
import { selectOngoingEvent, eventProgress, formatRemaining, remainingMinutes } from '@/features/widget/core/liveEvent';
import type { CalendarEvent } from '@/types';

function ev(partial: Partial<CalendarEvent> & { dtstart: Date; dtend: Date }): CalendarEvent {
  return {
    uid: 'u', href: '/u.ics', calendarId: 'c', accountId: 'a',
    summary: 'Event', allDay: false, color: '#3b82f6', attendees: [],
    isRecurring: false,
    ...partial,
  };
}

const TZ = 'Europe/Berlin';

describe('buildAgendaSnapshot', () => {
  const now = new Date('2026-08-01T09:00:00Z');

  it('keeps only today\'s not-yet-finished events, sorted by start', () => {
    const events = [
      ev({ uid: 'past', summary: 'Past', dtstart: new Date('2026-08-01T07:00:00Z'), dtend: new Date('2026-08-01T08:00:00Z') }),
      ev({ uid: 'later', summary: 'Later', dtstart: new Date('2026-08-01T15:00:00Z'), dtend: new Date('2026-08-01T16:00:00Z') }),
      ev({ uid: 'soon', summary: 'Soon', dtstart: new Date('2026-08-01T12:00:00Z'), dtend: new Date('2026-08-01T13:00:00Z') }),
      ev({ uid: 'tomorrow', summary: 'Tomorrow', dtstart: new Date('2026-08-02T10:00:00Z'), dtend: new Date('2026-08-02T11:00:00Z') }),
    ];
    const snap = buildAgendaSnapshot(events, { now, timeZone: TZ, locale: 'en-US' });
    expect(snap.events.map((e) => e.uid)).toEqual(['soon', 'later']);
    expect(snap.dayNumber).toBe('1');
    expect(snap.timeZone).toBe(TZ);
  });

  it('reports no upcoming event when the day is empty', () => {
    const snap = buildAgendaSnapshot([], { now, timeZone: TZ, locale: 'en-US' });
    expect(snap.events).toHaveLength(0);
    expect(snap.relativeLabel).toBe('No upcoming event');
  });

  it('respects maxEvents', () => {
    const events = [1, 2, 3, 4].map((h) =>
      ev({ uid: `e${h}`, dtstart: new Date(`2026-08-01T1${h}:00:00Z`), dtend: new Date(`2026-08-01T1${h}:30:00Z`) }),
    );
    expect(buildAgendaSnapshot(events, { now, timeZone: TZ, maxEvents: 2 }).events).toHaveLength(2);
  });

  it('groups the upcoming window into per-day sections', () => {
    const events = [
      ev({ uid: 'past', dtstart: new Date('2026-08-01T07:00:00Z'), dtend: new Date('2026-08-01T08:00:00Z') }),
      ev({ uid: 'soon', dtstart: new Date('2026-08-01T12:00:00Z'), dtend: new Date('2026-08-01T13:00:00Z') }),
      ev({ uid: 'tomorrow', dtstart: new Date('2026-08-02T10:00:00Z'), dtend: new Date('2026-08-02T11:00:00Z') }),
    ];
    const snap = buildAgendaSnapshot(events, { now, timeZone: TZ, locale: 'en-US', days: 1 });

    expect(snap.sections).toHaveLength(2);
    expect(snap.sections[0].isToday).toBe(true);
    expect(snap.sections[0].items.map((e) => e.uid)).toEqual(['soon']);
    expect(snap.sections[1].isToday).toBe(false);
    expect(snap.sections[1].items.map((e) => e.uid)).toEqual(['tomorrow']);
    expect(snap.nextEvent?.uid).toBe('soon');
  });

  it('keeps today section even when empty and picks nextEvent from a later day', () => {
    const events = [
      ev({ uid: 'past', dtstart: new Date('2026-08-01T07:00:00Z'), dtend: new Date('2026-08-01T08:00:00Z') }),
      ev({ uid: 'tomorrow', dtstart: new Date('2026-08-02T10:00:00Z'), dtend: new Date('2026-08-02T11:00:00Z') }),
    ];
    const snap = buildAgendaSnapshot(events, { now, timeZone: TZ, locale: 'en-US', days: 1 });

    expect(snap.sections[0].isToday).toBe(true);
    expect(snap.sections[0].items).toHaveLength(0);
    expect(snap.nextEvent?.uid).toBe('tomorrow');
  });

  it('has a today-only section and nextEvent by default (days=0)', () => {
    const snap = buildAgendaSnapshot([], { now, timeZone: TZ, locale: 'en-US' });
    expect(snap.sections).toHaveLength(1);
    expect(snap.sections[0].isToday).toBe(true);
    expect(snap.nextEvent).toBeNull();
  });
});

describe('selectOngoingEvent', () => {
  const now = new Date('2026-08-01T12:30:00Z');

  it('picks the ongoing timed event ending soonest', () => {
    const events = [
      ev({ uid: 'long', dtstart: new Date('2026-08-01T12:00:00Z'), dtend: new Date('2026-08-01T14:00:00Z') }),
      ev({ uid: 'short', dtstart: new Date('2026-08-01T12:15:00Z'), dtend: new Date('2026-08-01T13:00:00Z') }),
      ev({ uid: 'future', dtstart: new Date('2026-08-01T13:00:00Z'), dtend: new Date('2026-08-01T14:00:00Z') }),
    ];
    expect(selectOngoingEvent(events, now)?.uid).toBe('short');
  });

  it('ignores all-day events and returns null when nothing is ongoing', () => {
    const events = [
      ev({ uid: 'allday', allDay: true, dtstart: new Date('2026-08-01T00:00:00Z'), dtend: new Date('2026-08-02T00:00:00Z') }),
      ev({ uid: 'past', dtstart: new Date('2026-08-01T08:00:00Z'), dtend: new Date('2026-08-01T09:00:00Z') }),
    ];
    expect(selectOngoingEvent(events, now)).toBeNull();
  });
});

describe('eventProgress / remainingMinutes', () => {
  const state = {
    uid: 'u', title: 'T', color: '#000', deepLink: 'x',
    startIso: '2026-08-01T12:00:00Z', endIso: '2026-08-01T13:00:00Z',
    location: '', attendees: [],
  };

  it('computes clamped progress and remaining minutes', () => {
    expect(eventProgress(state, new Date('2026-08-01T12:15:00Z'))).toBeCloseTo(0.25);
    expect(eventProgress(state, new Date('2026-08-01T11:00:00Z'))).toBe(0);
    expect(eventProgress(state, new Date('2026-08-01T14:00:00Z'))).toBe(1);
    expect(remainingMinutes(state, new Date('2026-08-01T12:45:00Z'))).toBe(15);
  });
});

describe('formatRemaining', () => {
  it('renders hours and minutes without a "min" unit', () => {
    expect(formatRemaining(206)).toBe('3h26');
    expect(formatRemaining(94)).toBe('1h34');
  });

  it('drops the minute part on a whole hour', () => {
    expect(formatRemaining(120)).toBe('2h');
  });

  it('renders sub-hour durations in minutes', () => {
    expect(formatRemaining(47)).toBe('47m');
    expect(formatRemaining(0)).toBe('0m');
  });

  it('pads the minute part so 2h05 never reads as 2h5', () => {
    expect(formatRemaining(125)).toBe('2h05');
  });

  it('clamps negatives instead of rendering a past duration', () => {
    expect(formatRemaining(-30)).toBe('0m');
  });

  it('takes localized unit suffixes', () => {
    expect(formatRemaining(206, { hour: 'ч', minute: 'м' })).toBe('3ч26');
    expect(formatRemaining(47, { hour: 'ч', minute: 'м' })).toBe('47м');
  });
});
