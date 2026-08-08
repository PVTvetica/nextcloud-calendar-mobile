import type { Account, CalendarEvent, CreateEventInput } from '@/types';
import { resolveOrganizer } from '@/features/event/utils/organizer';
import { parseRrule } from './parseRrule';

/**
 * A stored event as the shape useUpdateEvent expects.
 *
 * The two types are close but not identical: the input carries `withTalkRoom`,
 * `organizerName`, and a structured `rrule?: RecurrenceRule`, while the event
 * has `rrule?: string`.
 *
 * `organizerEmail`/`organizerName` come from `account`, not `event`, the same
 * way `app/event/new.tsx` and `app/event/edit/[uid].tsx` derive them: NC
 * always writes the acting account as ORGANIZER. Reading them off `event`
 * instead (as this used to) degrades on every drag -- `organizerLine` in
 * ics.ts is unconditional, so an event synced from another client with no
 * organizer at all would round-trip through a drag as a malformed
 * `ORGANIZER;CN=:mailto:`.
 */
export function eventToInput(event: CalendarEvent, account: Account): CreateEventInput {
  const { organizerEmail, organizerName } = resolveOrganizer(account);
  return {
    summary: event.summary,
    calendarId: event.calendarId,
    dtstart: event.dtstart,
    dtend: event.dtend,
    allDay: event.allDay,
    description: event.description,
    location: event.location,
    attendees: [...event.attendees],
    withTalkRoom: false,
    organizerEmail,
    organizerName,
    // Read the stored rule back rather than dropping it: useUpdateEvent rebuilds
    // a series' ICS from input.rrule, so undefined here destroys the recurrence
    // on scope 'all' and on the new series of 'thisAndFollowing'. parseRrule
    // returns undefined only for rules RecurrenceRule cannot hold exactly, and
    // the caller must then keep to this-occurrence-only.
    rrule: parseRrule(event.rrule),
    alarmMinutes: event.alarmMinutes,
  };
}
