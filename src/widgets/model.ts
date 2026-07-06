import type { CalendarEvent } from '@/types';

const APP_SCHEME = 'nextcloud-calendar';
const DAY_MS = 24 * 60 * 60 * 1000;

export type WidgetEventItem = {
  uid: string;
  title: string;
  startIso: string;
  endIso: string;
  allDay: boolean;
  color: string;
  deepLink: string;
};

export type WidgetDaySnapshot = {
  dayIso: string;
  dayLabel: string;
  dayNumber: string;
  relativeLabel: string;
  events: WidgetEventItem[];
};

export type WidgetSnapshot = {
  generatedAtIso: string;
  timeZone: string;
  small: WidgetDaySnapshot | null;
  medium: WidgetDaySnapshot | null;
};

type BuildWidgetSnapshotArgs = {
  activeAccountId: string | null;
  hiddenCalendarIds: string[];
  notifiableCalendarIds: string[];
  events: CalendarEvent[];
  now?: Date;
  locale?: string;
  timeZone?: string;
};

function dayKey(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function emptySnapshot(now: Date, timeZone: string): WidgetSnapshot {
  return { generatedAtIso: now.toISOString(), timeZone, small: null, medium: null };
}

function getRelativeLabel(dayIso: string, labelDate: Date, now: Date, locale: string, timeZone: string) {
  const today = dayKey(now, timeZone);
  const tomorrow = dayKey(new Date(now.getTime() + DAY_MS), timeZone);
  if (dayIso === today) return 'Today';
  if (dayIso === tomorrow) return 'Tomorrow';
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: 'long' }).format(labelDate);
}

function toWidgetEventItem(event: CalendarEvent): WidgetEventItem {
  return {
    uid: event.uid,
    title: event.summary || 'Untitled event',
    startIso: event.dtstart.toISOString(),
    endIso: event.dtend.toISOString(),
    allDay: event.allDay,
    color: event.color,
    deepLink: `${APP_SCHEME}:///event/${encodeURIComponent(event.uid)}`,
  };
}

export function buildWidgetSnapshot({
  activeAccountId,
  hiddenCalendarIds,
  notifiableCalendarIds,
  events,
  now = new Date(),
  locale = Intl.DateTimeFormat().resolvedOptions().locale,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: BuildWidgetSnapshotArgs): WidgetSnapshot {
  if (!activeAccountId || notifiableCalendarIds.length === 0) return emptySnapshot(now, timeZone);

  const hidden = new Set(hiddenCalendarIds);
  const selected = new Set(notifiableCalendarIds);
  const today = dayKey(now, timeZone);
  const upcoming = events
    .filter((event) => event.accountId === activeAccountId)
    .filter((event) => selected.has(event.calendarId) && !hidden.has(event.calendarId))
    .filter((event) => event.dtend > now)
    .sort((left, right) => left.dtstart.getTime() - right.dtstart.getTime() || left.dtend.getTime() - right.dtend.getTime());

  if (upcoming.length === 0) return emptySnapshot(now, timeZone);

  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of upcoming) {
    const key = event.dtstart <= now ? today : dayKey(event.dtstart, timeZone);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(event);
    else grouped.set(key, [event]);
  }

  const selectedDay = grouped.has(today) ? today : grouped.keys().next().value as string | undefined;
  const selectedEvents = selectedDay ? grouped.get(selectedDay)?.slice(0, 3) ?? [] : [];
  if (selectedEvents.length === 0) return emptySnapshot(now, timeZone);

  const labelDate = selectedDay === today ? now : selectedEvents[0].dtstart;
  const eventsForDay = selectedEvents.map(toWidgetEventItem);
  const daySnapshot: WidgetDaySnapshot = {
    dayIso: selectedDay!,
    dayLabel: new Intl.DateTimeFormat(locale, { timeZone, weekday: 'short' }).format(labelDate).toUpperCase(),
    dayNumber: new Intl.DateTimeFormat(locale, { timeZone, day: 'numeric' }).format(labelDate),
    relativeLabel: getRelativeLabel(selectedDay!, labelDate, now, locale, timeZone),
    events: eventsForDay,
  };

  return {
    generatedAtIso: now.toISOString(),
    timeZone,
    small: { ...daySnapshot, events: eventsForDay.slice(0, 1) },
    medium: daySnapshot,
  };
}
