import type { CalendarEvent, CreateEventInput } from '@/types';

/**
 * A stored event as the shape useUpdateEvent expects.
 *
 * The two types are close but not identical: the input carries `withTalkRoom`,
 * `organizerName`, and a structured `rrule?: RecurrenceRule`, while the event
 * has `rrule?: string`. A drag only changes times, so recurrence is passed as
 * undefined rather than reconstructed — parsing the string back into a rule
 * only to hand it straight back risks losing parts the parser does not model.
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
    rrule: undefined,
    alarmMinutes: event.alarmMinutes,
  };
}
