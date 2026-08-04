import {
  applyMasterEdit, buildExceptionIcs, buildIcs, injectExdate, parseRruleString,
  resolveRecurrenceId, truncateRruleUntil, upsertOverride,
} from '@/utils/ics';
import { extractDtstartTzid, parseIcsObjects } from '@/utils/caldav-parse';
import type { Attendee } from '@/types';

const meta = { calendarId: 'cal-1', accountId: 'acc-1', color: '#0082c9' };

const masterIcs = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:series-1',
  'SUMMARY:Standup',
  'DTSTART:20260601T080000Z',
  'DTEND:20260601T083000Z',
  'RRULE:FREQ=DAILY;COUNT=3',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const overrideBase = {
  uid: 'series-1',
  summary: 'Standup (moved)',
  description: '',
  location: '',
  organizerEmail: 'john@example.com',
  organizerName: 'John Doe',
  attendees: [] as Attendee[],
  timezone: undefined,
};

describe('parseRruleString', () => {
  it('round-trips the rule an event form produces', () => {
    expect(parseRruleString('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=10')).toEqual({
      freq: 'WEEKLY',
      interval: 2,
      byDay: ['MO', 'WE'],
      count: 10,
    });
  });

  it('reads an UNTIL stamp as a UTC instant', () => {
    expect(parseRruleString('RRULE:FREQ=DAILY;UNTIL=20260701T000000Z')).toEqual({
      freq: 'DAILY',
      until: new Date('2026-07-01T00:00:00Z'),
    });
  });

  it('drops an interval of 1, which is the default', () => {
    expect(parseRruleString('RRULE:FREQ=DAILY;INTERVAL=1')).toEqual({ freq: 'DAILY' });
  });

  it('works without the property-name prefix', () => {
    expect(parseRruleString('FREQ=MONTHLY')).toEqual({ freq: 'MONTHLY' });
  });

  it('returns undefined for nothing, or for a rule with no usable FREQ', () => {
    expect(parseRruleString(undefined)).toBeUndefined();
    expect(parseRruleString('')).toBeUndefined();
    expect(parseRruleString('RRULE:FREQ=HOURLY')).toBeUndefined();
  });
});

describe('upsertOverride', () => {
  const override = buildExceptionIcs({
    ...overrideBase,
    dtstart: new Date('2026-06-02T10:00:00Z'),
    dtend: new Date('2026-06-02T10:30:00Z'),
    recurrenceId: new Date('2026-06-02T08:00:00Z'),
  });

  it('keeps master and override in one resource under one UID', () => {
    const merged = upsertOverride(masterIcs, override);
    expect(merged.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(merged.match(/UID:series-1/g)).toHaveLength(2);
    expect(merged).toContain('RRULE:FREQ=DAILY;COUNT=3');
  });

  it('replaces an override already pinned to the same occurrence', () => {
    const once = upsertOverride(masterIcs, override);
    const again = upsertOverride(
      once,
      buildExceptionIcs({
        ...overrideBase,
        summary: 'Standup (moved again)',
        dtstart: new Date('2026-06-02T11:00:00Z'),
        dtend: new Date('2026-06-02T11:30:00Z'),
        recurrenceId: new Date('2026-06-02T08:00:00Z'),
      }),
    );

    expect(again.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(again).toContain('Standup (moved again)');
    expect(again).not.toContain('Standup (moved)\r\n');
  });
});

describe('resolveRecurrenceId', () => {
  it('is the occurrence itself while it has never been overridden', () => {
    const start = new Date('2026-06-02T08:00:00Z');
    expect(resolveRecurrenceId(masterIcs, start)).toEqual(start);
  });

  it('keeps naming the original slot once the occurrence has moved', () => {
    const merged = upsertOverride(
      masterIcs,
      buildExceptionIcs({
        ...overrideBase,
        dtstart: new Date('2026-06-02T10:00:00Z'),
        dtend: new Date('2026-06-02T10:30:00Z'),
        recurrenceId: new Date('2026-06-02T08:00:00Z'),
      }),
    );

    expect(resolveRecurrenceId(merged, new Date('2026-06-02T10:00:00Z')))
      .toEqual(new Date('2026-06-02T08:00:00Z'));
  });
});

describe('parsing a series that carries an override', () => {
  const merged = upsertOverride(
    masterIcs,
    buildExceptionIcs({
      ...overrideBase,
      dtstart: new Date('2026-06-02T10:00:00Z'),
      dtend: new Date('2026-06-02T10:30:00Z'),
      recurrenceId: new Date('2026-06-02T08:00:00Z'),
    }),
  );

  const occurrences = parseIcsObjects(
    [{ ics: merged, href: '/cal/series-1.ics' }],
    meta,
    new Date('2026-06-01T00:00:00Z'),
    new Date('2026-06-05T00:00:00Z'),
  ).sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());

  it('expands the series once, not once per VEVENT', () => {
    expect(occurrences).toHaveLength(3);
  });

  it('renders the overridden occurrence at its edited time', () => {
    const moved = occurrences.find((e) => e.summary === 'Standup (moved)');
    expect(moved).toBeDefined();
    expect(moved?.dtstart).toEqual(new Date('2026-06-02T10:00:00Z'));
    expect(moved?.dtend).toEqual(new Date('2026-06-02T10:30:00Z'));
  });

  it('leaves the untouched occurrences on the rule time', () => {
    expect(occurrences[0].dtstart).toEqual(new Date('2026-06-01T08:00:00Z'));
    expect(occurrences[2].dtstart).toEqual(new Date('2026-06-03T08:00:00Z'));
  });
});

describe('a series stored in UTC', () => {
  const utcMaster = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:series-1',
    'SUMMARY:Standup',
    'DTSTART:20260601T080000Z',
    'DTEND:20260601T083000Z',
    'RRULE:FREQ=DAILY;COUNT=3',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const expand = (ics: string) =>
    parseIcsObjects([{ ics, href: '/cal/series-1.ics' }], meta,
      new Date('2026-05-25T00:00:00Z'), new Date('2026-06-10T00:00:00Z'))
      .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());

  it('has no TZID to inherit', () => {
    expect(extractDtstartTzid(utcMaster)).toBeUndefined();
  });

  it('really drops an excluded occurrence', () => {
    const withExdate = injectExdate(
      utcMaster, new Date('2026-06-02T08:00:00Z'), extractDtstartTzid(utcMaster),
    );
    expect(withExdate).toContain('EXDATE:20260602T080000Z');
    expect(expand(withExdate).map((e) => e.dtstart.toISOString())).toEqual([
      '2026-06-01T08:00:00.000Z',
      '2026-06-03T08:00:00.000Z',
    ]);
  });

  it('moves an occurrence instead of leaving a second one behind', () => {
    const merged = upsertOverride(utcMaster, buildExceptionIcs({
      ...overrideBase,
      summary: 'Moved',
      dtstart: new Date('2026-06-02T12:00:00Z'),
      dtend: new Date('2026-06-02T12:30:00Z'),
      timezone: extractDtstartTzid(utcMaster),
      recurrenceId: resolveRecurrenceId(utcMaster, new Date('2026-06-02T08:00:00Z')),
    }));

    expect(merged).toContain('RECURRENCE-ID:20260602T080000Z');

    const out = expand(merged);
    expect(out).toHaveLength(3);
    expect(out.map((e) => `${e.dtstart.toISOString()} ${e.summary}`)).toEqual([
      '2026-06-01T08:00:00.000Z Standup',
      '2026-06-02T12:00:00.000Z Moved',
      '2026-06-03T08:00:00.000Z Standup',
    ]);
  });
});

describe('truncateRruleUntil', () => {
  const zoned = buildIcs({
    uid: 'series-1', summary: 'Standup', description: '', location: '',
    dtstart: new Date('2026-06-01T08:00:00Z'),
    dtend: new Date('2026-06-01T08:30:00Z'),
    organizerEmail: 'john@example.com', organizerName: 'John Doe', attendees: [],
    timezone: 'Europe/Paris', rrule: { freq: 'DAILY', count: 10 },
  });

  const truncated = truncateRruleUntil(zoned, new Date('2026-06-02T07:59:59Z')) ?? '';
  const eventRules = truncated.split('\r\n').filter((l) => l.startsWith('RRULE:'));

  it('ends the event rule instead of leaving it endless', () => {
    expect(eventRules).toContain('RRULE:FREQ=DAILY;UNTIL=20260602T075959Z');
  });

  it('leaves the timezone changeover rules alone', () => {
    expect(eventRules).toContain('RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU');
    expect(eventRules).toContain('RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU');
  });

  it('really stops the series at the cut', () => {
    const out = parseIcsObjects([{ ics: truncated, href: '/cal/series-1.ics' }], meta,
      new Date('2026-05-20T00:00:00Z'), new Date('2026-07-01T00:00:00Z'));
    expect(out.map((e) => e.dtstart.toISOString())).toEqual(['2026-06-01T08:00:00.000Z']);
  });

  it('reports an empty series when the cut lands before it starts', () => {
    expect(truncateRruleUntil(zoned, new Date('2026-06-01T07:59:59Z'))).toBeNull();
  });

  it('drops an override that now belongs to the new series', () => {
    const withOverride = upsertOverride(zoned, buildExceptionIcs({
      ...overrideBase, summary: 'Later', timezone: 'Europe/Paris',
      dtstart: new Date('2026-06-05T12:00:00Z'),
      dtend: new Date('2026-06-05T12:30:00Z'),
      recurrenceId: new Date('2026-06-05T08:00:00Z'),
    }));
    expect(withOverride).toContain('Later');
    expect(truncateRruleUntil(withOverride, new Date('2026-06-02T07:59:59Z')) ?? '')
      .not.toContain('Later');
  });
});

describe('applyMasterEdit', () => {
  const edit = {
    summary: 'Standup',
    description: '',
    location: '',
    durationMs: 30 * 60_000,
    organizerEmail: 'john@example.com',
    organizerName: 'John Doe',
    attendees: [] as Attendee[],
    sequence: 7,
  };

  const complex = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    'UID:series-1',
    'SUMMARY:Standup',
    'DTSTART:20260601T080000Z',
    'DTEND:20260601T083000Z',
    'RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=3;WKST=MO',
    'EXDATE:20260803T080000Z',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  it('leaves a rule it could not have written itself untouched', () => {
    const out = applyMasterEdit(complex, { ...edit, shiftMs: 60 * 60_000 });
    expect(out).toContain('RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=3;WKST=MO');
  });

  it('moves the series without re-anchoring it on the edited occurrence', () => {
    const out = applyMasterEdit(complex, { ...edit, shiftMs: 60 * 60_000 });
    expect(out).toContain('DTSTART:20260601T090000Z');
    expect(out).toContain('DTEND:20260601T093000Z');
  });

  it('carries exclusions along with the shift', () => {
    const out = applyMasterEdit(complex, { ...edit, shiftMs: 60 * 60_000 });
    expect(out).toContain('EXDATE:20260803T090000Z');
  });

  it('shifts an override so it stays attached to its occurrence', () => {
    const withOverride = upsertOverride(complex, buildExceptionIcs({
      ...overrideBase,
      summary: 'Moved',
      dtstart: new Date('2026-06-15T12:00:00Z'),
      dtend: new Date('2026-06-15T12:30:00Z'),
      recurrenceId: new Date('2026-06-15T08:00:00Z'),
    }));

    const out = applyMasterEdit(withOverride, { ...edit, shiftMs: 60 * 60_000 });
    expect(out).toContain('RECURRENCE-ID:20260615T090000Z');
    expect(out).toContain('DTSTART:20260615T130000Z');
  });

  it('re-anchors and re-identifies a series split off from another', () => {
    const out = applyMasterEdit(complex, {
      ...edit,
      shiftMs: 60 * 60_000,
      startAt: new Date('2026-07-20T14:00:00Z'),
      uid: 'series-2',
    });
    expect(out).toContain('UID:series-2');
    expect(out).toContain('DTSTART:20260720T140000Z');
    expect(out).toContain('RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=3;WKST=MO');
    expect(out).toContain('EXDATE:20260803T090000Z');
  });

  it('keeps the zone form a TZID series was written in', () => {
    const zoned = buildIcs({
      uid: 'series-1', summary: 'Standup', description: '', location: '',
      dtstart: new Date('2026-06-01T08:00:00Z'),
      dtend: new Date('2026-06-01T08:30:00Z'),
      organizerEmail: 'john@example.com', organizerName: 'John Doe', attendees: [],
      timezone: 'Europe/Paris', rrule: { freq: 'DAILY' },
    });
    const out = applyMasterEdit(zoned, { ...edit, shiftMs: 60 * 60_000 });
    expect(out).toContain('DTSTART;TZID=Europe/Paris:20260601T110000');
  });
});
