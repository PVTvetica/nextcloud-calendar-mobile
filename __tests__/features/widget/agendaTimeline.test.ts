import { agendaBoundaries, buildAgendaTimeline, selectSnapshotAt } from '@/features/widget/core/agendaTimeline';
import type { AgendaTimelineEntry } from '@/features/widget/core/types';
import type { CalendarEvent } from '@/types';

function ev(partial: Partial<CalendarEvent> & { dtstart: Date; dtend: Date }): CalendarEvent {
  return {
    uid: 'u', href: '/u.ics', calendarId: 'c', accountId: 'a',
    summary: 'Event', allDay: false, color: '#3b82f6', attendees: [],
    isRecurring: false,
    ...partial,
  };
}

const TZ = 'Europe/Paris';

describe('agendaBoundaries', () => {
  const now = new Date('2026-08-01T09:00:00Z'); // 11:00 Paris

  it('marks the end of each timed event inside the horizon', () => {
    const events = [
      ev({ uid: 'a', dtstart: new Date('2026-08-01T09:00:00Z'), dtend: new Date('2026-08-01T10:00:00Z') }),
      ev({ uid: 'b', dtstart: new Date('2026-08-01T12:00:00Z'), dtend: new Date('2026-08-01T13:00:00Z') }),
    ];
    const marks = agendaBoundaries(events, now, TZ, 12).map((d) => d.toISOString());
    expect(marks).toContain('2026-08-01T10:00:00.000Z');
    expect(marks).toContain('2026-08-01T13:00:00.000Z');
  });

  it('marks local midnight so the day header rolls over', () => {
    // Paris is UTC+2 in August, so the next local midnight is 22:00 UTC.
    const marks = agendaBoundaries([], now, TZ, 24).map((d) => d.toISOString());
    expect(marks).toContain('2026-08-01T22:00:00.000Z');
  });

  it('ignores all-day events, past ends and anything past the horizon', () => {
    const events = [
      ev({ uid: 'allday', allDay: true, dtstart: new Date('2026-08-01T00:00:00Z'), dtend: new Date('2026-08-02T00:00:00Z') }),
      ev({ uid: 'past', dtstart: new Date('2026-08-01T07:00:00Z'), dtend: new Date('2026-08-01T08:00:00Z') }),
      ev({ uid: 'far', dtstart: new Date('2026-08-09T09:00:00Z'), dtend: new Date('2026-08-09T10:00:00Z') }),
    ];
    const marks = agendaBoundaries(events, now, TZ, 6).map((d) => d.toISOString());
    expect(marks).toEqual([]);
  });

  it('returns marks in ascending order without duplicates', () => {
    const events = [
      ev({ uid: 'a', dtstart: new Date('2026-08-01T12:00:00Z'), dtend: new Date('2026-08-01T13:00:00Z') }),
      ev({ uid: 'b', dtstart: new Date('2026-08-01T12:30:00Z'), dtend: new Date('2026-08-01T13:00:00Z') }),
    ];
    const marks = agendaBoundaries(events, now, TZ, 6).map((d) => d.getTime());
    expect(marks).toEqual([new Date('2026-08-01T13:00:00Z').getTime()]);
  });
});

describe('buildAgendaTimeline', () => {
  const now = new Date('2026-08-01T09:00:00Z');

  it('opens with an entry for now', () => {
    const timeline = buildAgendaTimeline([], { now, timeZone: TZ });
    expect(timeline[0].atIso).toBe(now.toISOString());
  });

  it('drops a finished event from the entry that follows its end', () => {
    const events = [
      ev({ uid: 'ends', dtstart: new Date('2026-08-01T09:00:00Z'), dtend: new Date('2026-08-01T10:00:00Z') }),
      ev({ uid: 'later', dtstart: new Date('2026-08-01T14:00:00Z'), dtend: new Date('2026-08-01T15:00:00Z') }),
    ];
    const timeline = buildAgendaTimeline(events, { now, timeZone: TZ, horizonHours: 6 });

    expect(timeline[0].snapshot.events.map((e) => e.uid)).toEqual(['ends', 'later']);

    const afterEnd = timeline.find((e) => e.atIso === '2026-08-01T10:00:00.000Z');
    expect(afterEnd?.snapshot.events.map((e) => e.uid)).toEqual(['later']);
  });

  it('honours maxEntries', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      ev({
        uid: `e${i}`,
        dtstart: new Date(now.getTime() + i * 3_600_000),
        dtend: new Date(now.getTime() + (i + 1) * 3_600_000),
      }),
    );
    const timeline = buildAgendaTimeline(events, { now, timeZone: TZ, maxEntries: 5 });
    expect(timeline).toHaveLength(5);
  });
});

describe('selectSnapshotAt', () => {
  const entries: AgendaTimelineEntry[] = [
    { atIso: '2026-08-01T09:00:00.000Z', snapshot: { dayNumber: '1' } as never },
    { atIso: '2026-08-01T10:00:00.000Z', snapshot: { dayNumber: '2' } as never },
    { atIso: '2026-08-01T11:00:00.000Z', snapshot: { dayNumber: '3' } as never },
  ];

  it('picks the last entry already reached', () => {
    const picked = selectSnapshotAt(entries, new Date('2026-08-01T10:30:00Z'));
    expect(picked?.dayNumber).toBe('2');
  });

  it('picks the exact entry on its own timestamp', () => {
    const picked = selectSnapshotAt(entries, new Date('2026-08-01T11:00:00Z'));
    expect(picked?.dayNumber).toBe('3');
  });

  it('falls back to the first entry before the timeline starts', () => {
    const picked = selectSnapshotAt(entries, new Date('2026-08-01T08:00:00Z'));
    expect(picked?.dayNumber).toBe('1');
  });

  it('keeps the last entry once the timeline is exhausted', () => {
    const picked = selectSnapshotAt(entries, new Date('2026-08-02T00:00:00Z'));
    expect(picked?.dayNumber).toBe('3');
  });

  it('returns null on an empty timeline', () => {
    expect(selectSnapshotAt([], new Date())).toBeNull();
  });
});
