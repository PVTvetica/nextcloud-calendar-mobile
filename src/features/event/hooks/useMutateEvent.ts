import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';

import { putEvent, updateEvent, deleteEvent, moveEvent, fetchEventIcs } from '@/services/nextcloud/caldav';
import { createTalkRoom } from '@/services/nextcloud/talk';
import { describeMutationError } from '@/services/shared/errors';
import {
  buildIcs, buildAllDayIcs, buildExceptionIcs, injectExdate, truncateRruleUntil,
  nextSequence, upsertOverride, resolveRecurrenceId, applyMasterEdit,
} from '@/utils/ics';
import { parseIcsObjects, extractDtstartTzid } from '@/utils/caldav-parse';
import { isValidTimeZone } from '@/utils/timezone';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import i18n from '@/utils/i18n';
import {
  insertEvents,
  patchByUid,
  removeWhere,
  replaceSeries,
  snapshotByBase,
  seriesBaseUid,
} from '@/database/eventWrites';
import type { Account, CalendarMeta, CalendarEvent, CreateEventInput, RecurrenceEditScope } from '@/types';

const TALK_URL_PATTERN = /\/call\//;

function resolveTimezone(account: Account): string {
  if (account.timezone && isValidTimeZone(account.timezone)) return account.timezone;
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(deviceTz) ? deviceTz : 'UTC';
}

function resolveCalendar(calendars: CalendarMeta[], calendarId: string): CalendarMeta | undefined {
  return calendars.find((c) => c.id === calendarId) ?? calendars[0];
}

function buildIcsForInput(
  uid: string,
  input: CreateEventInput,
  location: string,
  description: string,
  timezone: string,
  sequence = 0,
): string {
  return input.allDay
    ? buildAllDayIcs({
        uid, summary: input.summary, description, location,
        dtstart: input.dtstart, dtend: input.dtend,
        organizerEmail: input.organizerEmail, organizerName: input.organizerName,
        attendees: input.attendees, rrule: input.rrule, alarmMinutes: input.alarmMinutes,
        sequence,
      })
    : buildIcs({
        uid, summary: input.summary, description, location,
        dtstart: input.dtstart, dtend: input.dtend,
        organizerEmail: input.organizerEmail, organizerName: input.organizerName,
        attendees: input.attendees, timezone, rrule: input.rrule, alarmMinutes: input.alarmMinutes,
        sequence,
      });
}

async function resolveLocationAndDescription(
  account: Account,
  input: CreateEventInput,
): Promise<{ location: string; description: string }> {
  let location = input.location ?? '';
  let description = input.description ?? '';
  if (input.withTalkRoom) {
    const room = await createTalkRoom(account, input.summary, input.talkRoomType ?? 'private');
    location = room.url;
    description = description ? `${description}\n\nTalk: ${room.url}` : `Talk: ${room.url}`;
  }
  return { location, description };
}

function inputDates(input: CreateEventInput): { dtstart: Date; dtend: Date } {
  if (input.allDay) {
    return {
      dtstart: dayjs(input.dtstart).startOf('day').toDate(),
      dtend: dayjs(input.dtend).startOf('day').toDate(),
    };
  }
  return { dtstart: input.dtstart, dtend: input.dtend };
}

function eventFromInput(
  uid: string,
  input: CreateEventInput,
  calendar: CalendarMeta,
  account: Account,
  resolved?: { location: string; description: string },
): CalendarEvent {
  const location = resolved?.location ?? input.location ?? '';
  const description = resolved?.description ?? input.description ?? '';
  const { dtstart, dtend } = inputDates(input);
  return {
    uid,
    href: `${calendar.url}${uid}.ics`,
    calendarId: calendar.id,
    accountId: account.id,
    summary: input.summary,
    description: description || undefined,
    location: location || undefined,
    dtstart,
    dtend,
    allDay: input.allDay,
    color: calendar.color,
    attendees: input.attendees,
    organizerEmail: input.organizerEmail,
    talkUrl: TALK_URL_PATTERN.test(location) ? location : undefined,
    isRecurring: !!input.rrule,
    rrule: undefined,
    alarmMinutes: input.alarmMinutes,
  };
}

function occurrenceRange(anchor: Date): { start: Date; end: Date } {
  return {
    start: dayjs(Math.min(anchor.getTime(), Date.now())).subtract(1, 'month').toDate(),
    end: dayjs(Math.max(anchor.getTime(), Date.now())).add(3, 'month').toDate(),
  };
}

function expandOccurrences(
  ics: string,
  href: string,
  calendar: CalendarMeta,
  account: Account,
  range: { start: Date; end: Date },
): CalendarEvent[] {
  return parseIcsObjects(
    [{ ics, href }],
    { calendarId: calendar.id, accountId: account.id, color: calendar.color },
    range.start,
    range.end,
  );
}

export function useCreateEvent(account: Account, calendars: CalendarMeta[]) {
  return useAsyncAction<CreateEventInput>(
    useCallback(async (input: CreateEventInput) => {
      const calendar = resolveCalendar(calendars, input.calendarId);
      if (!calendar) return;

      const uid = Crypto.randomUUID();
      const href = `${calendar.url}${uid}.ics`;
      const timezone = resolveTimezone(account);
      const range = occurrenceRange(input.dtstart);

      const optimistic = input.rrule
        ? expandOccurrences(
            buildIcsForInput(uid, input, input.location ?? '', input.description ?? '', timezone),
            href, calendar, account, range,
          )
        : [eventFromInput(uid, input, calendar, account)];
      await insertEvents(optimistic);

      try {
        const resolved = await resolveLocationAndDescription(account, input);
        const ics = buildIcsForInput(uid, input, resolved.location, resolved.description, timezone);
        await putEvent(account, calendar, uid, ics);

        const real = input.rrule
          ? expandOccurrences(ics, href, calendar, account, range)
          : [eventFromInput(uid, input, calendar, account, resolved)];
        await insertEvents(real);
      } catch (error) {
        await removeWhere(account.id, (e) => seriesBaseUid(e.uid) === uid);
        Alert.alert(i18n.t('event.errorCreateFailed'), describeMutationError(error));
      }
    }, [account, calendars]),
  );
}

export function useUpdateEvent(account: Account, calendars: CalendarMeta[]) {
  return useAsyncAction<{ event: CalendarEvent; input: CreateEventInput; scope?: RecurrenceEditScope }>(
    useCallback(async ({ event, input, scope = 'all' }) => {
      const base = seriesBaseUid(event.uid);
      const snapshot = await snapshotByBase(account.id, base);

      const { dtstart, dtend } = inputDates(input);
      const calendarChanged = !event.isRecurring && input.calendarId !== event.calendarId;
      const targetCal = calendarChanged ? calendars.find((c) => c.id === input.calendarId) : undefined;
      await patchByUid(account.id, event.uid, {
        summary: input.summary,
        dtstart,
        dtend,
        allDay: input.allDay,
        description: input.description ?? event.description,
        location: input.location ?? event.location,
        attendees: input.attendees,
        alarmMinutes: input.alarmMinutes,
        ...(targetCal && {
          calendarId: targetCal.id,
          color: targetCal.color,
          href: `${targetCal.url}${event.uid}.ics`,
        }),
      });

      try {
        const { location, description } = await resolveLocationAndDescription(account, input);
        const timezone = resolveTimezone(account);
        const sequence = nextSequence();
        const range = occurrenceRange(input.dtstart);

        let seriesIcs: string | undefined;
        let seriesDropped = false;
        const extras: CalendarEvent[] = [];

        if (event.isRecurring && scope === 'all') {
          seriesIcs = applyMasterEdit(await fetchEventIcs(account, event.href), {
            summary: input.summary, description, location,
            shiftMs: input.dtstart.getTime() - event.dtstart.getTime(),
            durationMs: input.dtend.getTime() - input.dtstart.getTime(),
            organizerEmail: input.organizerEmail, organizerName: input.organizerName,
            attendees: input.attendees, alarmMinutes: input.alarmMinutes, sequence,
          });
          await updateEvent(account, event.href, seriesIcs);
        } else if (!event.isRecurring) {
          await updateEvent(
            account, event.href,
            buildIcsForInput(base, input, location, description, timezone, sequence),
          );
          if (input.calendarId !== event.calendarId) {
            const cal = calendars.find((c) => c.id === input.calendarId);
            if (!cal) throw new Error('Target calendar not found');
            await moveEvent(account, event.href, cal, base);
          }
        } else if (scope === 'this') {
          const masterIcs = await fetchEventIcs(account, event.href);
          seriesIcs = upsertOverride(masterIcs, buildExceptionIcs({
            uid: base, summary: input.summary, description, location,
            dtstart: input.dtstart, dtend: input.dtend,
            organizerEmail: input.organizerEmail, organizerName: input.organizerName,
            attendees: input.attendees, timezone: extractDtstartTzid(masterIcs),
            recurrenceId: resolveRecurrenceId(masterIcs, event.dtstart),
            alarmMinutes: input.alarmMinutes,
            sequence,
          }));
          await updateEvent(account, event.href, seriesIcs);
        } else if (scope === 'thisAndFollowing') {
          const masterIcs = await fetchEventIcs(account, event.href);
          const truncated = truncateRruleUntil(masterIcs, new Date(event.dtstart.getTime() - 1000));
          if (truncated) {
            seriesIcs = truncated;
            await updateEvent(account, event.href, truncated);
          } else {
            await deleteEvent(account, event.href);
            seriesDropped = true;
          }

          const cal = calendars.find((c) => c.id === event.calendarId) ?? calendars.find((c) => c.id === input.calendarId);
          if (!cal) throw new Error('Calendar not found for new series');
          const newUid = Crypto.randomUUID();
          const newIcs = applyMasterEdit(masterIcs, {
            summary: input.summary, description, location,
            shiftMs: input.dtstart.getTime() - event.dtstart.getTime(),
            startAt: input.dtstart, uid: newUid,
            durationMs: input.dtend.getTime() - input.dtstart.getTime(),
            organizerEmail: input.organizerEmail, organizerName: input.organizerName,
            attendees: input.attendees, alarmMinutes: input.alarmMinutes, sequence,
          });
          await putEvent(account, cal, newUid, newIcs);
          extras.push(...expandOccurrences(newIcs, `${cal.url}${newUid}.ics`, cal, account, range));
        }

        const cal = event.isRecurring ? resolveCalendar(calendars, event.calendarId) : undefined;
        if (cal && (seriesIcs || seriesDropped)) {
          await replaceSeries(
            account.id,
            base,
            [
              ...(seriesIcs ? expandOccurrences(seriesIcs, event.href, cal, account, range) : []),
              ...extras,
            ],
            range,
          );
        }
      } catch (error) {
        await replaceSeries(account.id, base, snapshot);
        Alert.alert(i18n.t('event.errorUpdateFailed'), describeMutationError(error));
      }
    }, [account, calendars]),
  );
}

export function useDeleteEvent(account: Account) {
  return useAsyncAction<{ event: CalendarEvent; scope?: RecurrenceEditScope }>(
    useCallback(async ({ event, scope = 'all' }) => {
      const base = seriesBaseUid(event.uid);
      let removed: CalendarEvent[];
      if (!event.isRecurring || scope === 'all') {
        removed = await removeWhere(account.id, (e) => seriesBaseUid(e.uid) === base);
      } else if (scope === 'thisAndFollowing') {
        const from = event.dtstart.getTime();
        removed = await removeWhere(
          account.id,
          (e) => seriesBaseUid(e.uid) === base && new Date(e.dtstart).getTime() >= from,
        );
      } else {
        removed = await removeWhere(account.id, (e) => e.uid === event.uid);
      }

      try {
        if (!event.isRecurring || scope === 'all') {
          await deleteEvent(account, event.href);
          return;
        }
        const masterIcs = await fetchEventIcs(account, event.href);
        const timezone = extractDtstartTzid(masterIcs);
        if (scope === 'this') {
          await updateEvent(account, event.href, injectExdate(masterIcs, event.dtstart, timezone));
        } else if (scope === 'thisAndFollowing') {
          const truncated = truncateRruleUntil(masterIcs, new Date(event.dtstart.getTime() - 1000));
          if (truncated) await updateEvent(account, event.href, truncated);
          else await deleteEvent(account, event.href);
        }
      } catch (error) {
        await insertEvents(removed);
        Alert.alert(i18n.t('event.errorDeleteFailed'), describeMutationError(error));
      }
    }, [account]),
  );
}
