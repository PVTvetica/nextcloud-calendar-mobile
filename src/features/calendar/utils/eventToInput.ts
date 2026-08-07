import type { CalendarEvent, CreateEventInput } from '@/types';
import { parseRrule } from './parseRrule';

/**
 * A stored event as the shape useUpdateEvent expects.
 *
 * The two types are close but not identical: the input carries `withTalkRoom`,
 * `organizerName`, and a structured `rrule?: RecurrenceRule`, while the event
 * has `rrule?: string`.
 */
export function eventToInput(event: CalendarEvent): CreateEventInput {
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
    organizerEmail: event.organizerEmail ?? '',
    organizerName: '',
    // Read the stored rule back rather than dropping it: useUpdateEvent rebuilds
    // a series' ICS from input.rrule, so undefined here destroys the recurrence
    // on scope 'all' and on the new series of 'thisAndFollowing'. parseRrule
    // returns undefined only for rules RecurrenceRule cannot hold exactly, and
    // the caller must then keep to this-occurrence-only.
    rrule: parseRrule(event.rrule),
    alarmMinutes: event.alarmMinutes,
  };
}
