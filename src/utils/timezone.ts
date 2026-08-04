const OFFSET_FMT = new Map<string, Intl.DateTimeFormat>();

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function offsetFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = OFFSET_FMT.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    OFFSET_FMT.set(tz, fmt);
  }
  return fmt;
}

export function getTimezoneOffsetMinutes(tz: string, at: Date): number {
  const parts = offsetFormatter(tz).formatToParts(at);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  let hour = g('hour');
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), hour, g('minute'), g('second'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

interface TzTransition {
  at: number;
  offsetFrom: number;
  offsetTo: number;
}

function findTransitions(tz: string, year: number): TzTransition[] {
  const out: TzTransition[] = [];
  let prevAt = Date.UTC(year, 0, 1);
  let prevOffset = getTimezoneOffsetMinutes(tz, new Date(prevAt));

  for (let month = 1; month <= 12 && out.length < 2; month += 1) {
    const at = Date.UTC(year, month, 1);
    const offset = getTimezoneOffsetMinutes(tz, new Date(at));
    if (offset !== prevOffset) {
      let lo = prevAt;
      let hi = at;
      while (hi - lo > 1_000) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (getTimezoneOffsetMinutes(tz, new Date(mid)) === prevOffset) lo = mid;
        else hi = mid;
      }
      out.push({ at: hi, offsetFrom: prevOffset, offsetTo: offset });
    }
    prevAt = at;
    prevOffset = offset;
  }
  return out;
}

function offsetStamp(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}${m}`;
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function wallStamp(at: number, offsetMinutes: number): string {
  const d = new Date(at + offsetMinutes * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`
  );
}

function yearlyRule(at: number, offsetMinutes: number): string {
  const d = new Date(at + offsetMinutes * 60_000);
  const month = d.getUTCMonth() + 1;
  const dom = d.getUTCDate();
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), month, 0)).getUTCDate();
  const nth = dom + 7 > daysInMonth ? -1 : Math.ceil(dom / 7);
  return `RRULE:FREQ=YEARLY;BYMONTH=${month};BYDAY=${nth}${WEEKDAYS[d.getUTCDay()]}`;
}

function tzName(tz: string, at: number): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date(at));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

function subComponent(kind: 'STANDARD' | 'DAYLIGHT', tz: string, t: TzTransition): string[] {
  const name = tzName(tz, t.at + (3_600_000));
  return [
    `BEGIN:${kind}`,
    `DTSTART:${wallStamp(t.at, t.offsetFrom)}`,
    yearlyRule(t.at, t.offsetFrom),
    `TZOFFSETFROM:${offsetStamp(t.offsetFrom)}`,
    `TZOFFSETTO:${offsetStamp(t.offsetTo)}`,
    ...(name ? [`TZNAME:${name}`] : []),
    `END:${kind}`,
  ];
}

const VTIMEZONE_CACHE = new Map<string, string[]>();


export function buildVtimezone(tz: string, ref: Date): string[] {
  const year = new Date(ref).getUTCFullYear();
  const key = `${tz}|${year}`;
  const cached = VTIMEZONE_CACHE.get(key);
  if (cached) return cached;

  const header = ['BEGIN:VTIMEZONE', `TZID:${tz}`];
  const transitions = findTransitions(tz, year);

  let body: string[];
  if (transitions.length < 2) {
    const offset = getTimezoneOffsetMinutes(tz, ref);
    const name = tzName(tz, ref.getTime());
    body = [
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      `TZOFFSETFROM:${offsetStamp(offset)}`,
      `TZOFFSETTO:${offsetStamp(offset)}`,
      ...(name ? [`TZNAME:${name}`] : []),
      'END:STANDARD',
    ];
  } else {
    body = transitions.flatMap((t) =>
      subComponent(t.offsetTo > t.offsetFrom ? 'DAYLIGHT' : 'STANDARD', tz, t),
    );
  }

  const lines = [...header, ...body, 'END:VTIMEZONE'];
  VTIMEZONE_CACHE.set(key, lines);
  return lines;
}

export function zonedWallTimeToUtc(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  tz: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const guess1 = new Date(naiveUtc - getTimezoneOffsetMinutes(tz, new Date(naiveUtc)) * 60000);
  const offset2 = getTimezoneOffsetMinutes(tz, guess1);
  return new Date(naiveUtc - offset2 * 60000);
}
