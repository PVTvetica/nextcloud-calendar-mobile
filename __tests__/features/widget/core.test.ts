import { buildAgendaSnapshot, buildAgendaTimeline } from '@/features/widget/core/agendaSnapshot';
import { selectOngoingEvent, eventProgress, formatRemaining, remainingMinutes, displayLocation, shouldClearLiveEvent, meetingProvider } from '@/features/widget/core/liveEvent';
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
    expect(snap.sections[0].items.map((e) => e.uid)).toEqual(['soon']); // past dropped
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

describe('displayLocation', () => {
  it('labels a bare meeting link with its provider', () => {
    expect(displayLocation('https://meet.google.com/xqz-mkpv-rwd')).toBe('Video conference: Google Meet');
    expect(displayLocation('https://talk.soluce.example/call/a1b2c3d4e5f6g7h8')).toBe('Video conference: Talk');
    expect(displayLocation('https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZmE4@thread.v2/0?context=%7b%22Tid%22%3a%22a1b2%22%7d')).toBe('Video conference: Teams');
  });

  it('labels a link written without a scheme', () => {
    expect(displayLocation('meet.google.com/xqz-mkpv-rwd')).toBe('Video conference: Google Meet');
    expect(displayLocation('www.cloud.soluce.example/index.php/call/abc')).toBe('Video conference: Talk');
  });

  it('drops a non-conferencing link without a human part', () => {
    expect(displayLocation('https://example.com/some/page')).toBe('');
  });

  it('keeps the human part next to a link', () => {
    expect(displayLocation('Salle Jupiter — https://meet.google.com/xqz-mkpv-rwd')).toBe('Salle Jupiter');
    expect(displayLocation('Microsoft Teams Meeting (https://teams.microsoft.com/l/meetup-join/19%3ameeting_x)')).toBe('Microsoft Teams Meeting');
  });

  it('leaves a plain address untouched', () => {
    expect(displayLocation('12 rue des Lilas, 59000 Lille')).toBe('12 rue des Lilas, 59000 Lille');
    expect(displayLocation('Salle 3.14')).toBe('Salle 3.14');
  });

  it('handles missing and blank values', () => {
    expect(displayLocation(undefined)).toBe('');
    expect(displayLocation('   ')).toBe('');
  });
});

describe('meetingProvider', () => {
  it('names the supported conferencing providers', () => {
    expect(meetingProvider('https://nc.example/call/abc')).toBe('Talk');
    expect(meetingProvider('https://teams.microsoft.com/l/meetup-join/x')).toBe('Teams');
    expect(meetingProvider('https://meet.google.com/xqz-mkpv-rwd')).toBe('Google Meet');
    expect(meetingProvider('https://us02web.zoom.us/j/123')).toBe('Zoom');
    expect(meetingProvider('https://whereby.com/room')).toBe('Whereby');
    expect(meetingProvider('https://meet.jit.si/room')).toBe('Jitsi');
    expect(meetingProvider('https://acme.webex.com/meet/x')).toBe('Webex');
  });

  it('returns null for plain locations and blanks', () => {
    expect(meetingProvider('12 rue des Lilas')).toBeNull();
    expect(meetingProvider(undefined)).toBeNull();
  });
});

describe('shouldClearLiveEvent', () => {
  const now = new Date('2026-08-01T12:30:00Z');
  const live = {
    uid: 'u', title: 'T', color: '#000', deepLink: 'x',
    startIso: '2026-08-01T12:00:00Z', endIso: '2026-08-01T13:00:00Z',
    location: '', attendees: [],
  };

  it('keeps a running activity when the read came back empty', () => {
    expect(shouldClearLiveEvent(live, 0, now)).toBe(false);
  });

  it('clears once the tracked event has ended', () => {
    expect(shouldClearLiveEvent(live, 0, new Date('2026-08-01T13:00:00Z'))).toBe(true);
  });

  it('clears when real data proves the event is no longer ongoing', () => {
    expect(shouldClearLiveEvent(live, 4, now)).toBe(true);
  });

  it('does nothing when no activity is tracked', () => {
    expect(shouldClearLiveEvent(null, 4, now)).toBe(false);
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

describe('buildAgendaTimeline', () => {
  const now = new Date('2026-08-01T09:00:00Z');

  it('starts at now and adds an entry for each event end still ahead', () => {
    const events = [
      ev({ uid: 'past', dtstart: new Date('2026-08-01T07:00:00Z'), dtend: new Date('2026-08-01T08:00:00Z') }),
      ev({ uid: 'soon', dtstart: new Date('2026-08-01T10:00:00Z'), dtend: new Date('2026-08-01T12:00:00Z') }),
    ];
    const timeline = buildAgendaTimeline(events, { now, timeZone: TZ, locale: 'en-US' });

    expect(timeline[0].atIso).toBe(now.toISOString());
    expect(timeline.map((e) => e.atIso)).toContain('2026-08-01T12:00:00.000Z');
    expect(timeline.every((e, i) => i === 0 || e.atIso > timeline[i - 1].atIso)).toBe(true);
  });

  it('adds the local midnight so the day rolls over on its own', () => {
    const timeline = buildAgendaTimeline([], { now, timeZone: TZ, locale: 'en-US' });
    expect(timeline.map((e) => e.atIso)).toContain('2026-08-01T22:00:00.000Z');
  });

  it('drops a finished event from the entry that follows its end', () => {
    const events = [
      ev({ uid: 'ends', dtstart: new Date('2026-08-01T10:00:00Z'), dtend: new Date('2026-08-01T12:00:00Z') }),
    ];
    const timeline = buildAgendaTimeline(events, { now, timeZone: TZ, locale: 'en-US' });

    expect(timeline[0].snapshot.events.map((e) => e.uid)).toEqual(['ends']);
    const afterEnd = timeline.find((e) => e.atIso === '2026-08-01T12:00:00.000Z');
    expect(afterEnd?.snapshot.events).toHaveLength(0);
  });

  it('ignores event ends beyond the horizon and caps the entry count', () => {
    const events = Array.from({ length: 40 }, (_, i) =>
      ev({
        uid: `e${i}`,
        dtstart: new Date(now.getTime() + i * 60_000),
        dtend: new Date(now.getTime() + (i + 1) * 60_000),
      }),
    );
    const timeline = buildAgendaTimeline(events, { now, timeZone: TZ, locale: 'en-US' }, 10);
    expect(timeline).toHaveLength(10);
  });
});
