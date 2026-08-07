import type { RecurrenceFreq, RecurrenceRule } from '@/types';

const FREQS: RecurrenceFreq[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

/** Exactly the parts `rruleLine` in src/utils/ics.ts can write back. */
const SUPPORTED = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'COUNT', 'UNTIL']);

/**
 * `20260815T093000Z` or `20260815`, the two forms `rruleLine`'s `utcStamp` can
 * produce. A date-time without the trailing `Z` is RFC 5545 floating/local
 * time, not UTC, and `utcStamp` always appends `Z` — so a Z-less date-time is
 * refused rather than misread as UTC.
 */
function parseUntil(raw: string): Date | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/.exec(raw);
  if (!m) return undefined;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  const date = new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s))
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parsePositiveInt(raw: string): number | undefined {
  if (!/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

/**
 * Read an RRULE string back into the structured rule the app writes from.
 *
 * Returns `undefined` for any rule this app's `RecurrenceRule` cannot represent
 * exactly — an unknown part, an unsupported frequency, a malformed number.
 * That is deliberate: `useUpdateEvent` rebuilds a series' ICS from
 * `input.rrule`, so handing it a partial rule would silently drop whatever did
 * not survive parsing. A caller that gets `undefined` from a recurring event
 * must avoid any path that rewrites the master.
 */
export function parseRrule(raw: string | undefined): RecurrenceRule | undefined {
  if (!raw) return undefined;

  const body = raw.replace(/^RRULE:/i, '').trim();
  if (!body) return undefined;

  const parts = new Map<string, string>();
  for (const chunk of body.split(';')) {
    if (!chunk) continue;
    const eq = chunk.indexOf('=');
    if (eq === -1) return undefined;
    const key = chunk.slice(0, eq).toUpperCase();
    if (!SUPPORTED.has(key)) return undefined;
    // A duplicate key makes the rule malformed rather than "last value wins".
    if (parts.has(key)) return undefined;
    parts.set(key, chunk.slice(eq + 1));
  }

  const freq = parts.get('FREQ')?.toUpperCase() as RecurrenceFreq | undefined;
  if (!freq || !FREQS.includes(freq)) return undefined;

  const rule: RecurrenceRule = { freq };

  const rawInterval = parts.get('INTERVAL');
  if (rawInterval !== undefined) {
    const interval = parsePositiveInt(rawInterval);
    if (interval === undefined) return undefined;
    // The writer omits an interval of 1, so the round trip does too.
    if (interval > 1) rule.interval = interval;
  }

  const rawByDay = parts.get('BYDAY');
  if (rawByDay !== undefined) {
    const byDay = rawByDay.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean);
    if (byDay.length === 0) return undefined;
    // A numeric prefix such as "-1FR" is a BYDAY form the type cannot express.
    if (byDay.some((d) => !/^(MO|TU|WE|TH|FR|SA|SU)$/.test(d))) return undefined;
    rule.byDay = byDay;
  }

  // rruleLine only ever writes one of the two (`if (rule.count) ... else if
  // (rule.until)`), so a rule carrying both cannot round-trip exactly.
  if (parts.has('COUNT') && parts.has('UNTIL')) return undefined;

  const rawCount = parts.get('COUNT');
  if (rawCount !== undefined) {
    const count = parsePositiveInt(rawCount);
    if (count === undefined) return undefined;
    rule.count = count;
  }

  const rawUntil = parts.get('UNTIL');
  if (rawUntil !== undefined) {
    const until = parseUntil(rawUntil);
    if (until === undefined) return undefined;
    rule.until = until;
  }

  return rule;
}
