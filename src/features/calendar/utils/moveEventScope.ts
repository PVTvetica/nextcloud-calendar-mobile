import type { CalendarEvent, RecurrenceEditScope } from '@/types';
import { parseRrule } from './parseRrule';

export type MoveEventDecision =
  | { kind: 'commit'; scope: RecurrenceEditScope }
  | { kind: 'prompt' };

/**
 * Whether a dragged event can commit straight away, and with which scope, or
 * needs the recurrence-scope prompt first.
 *
 * A non-recurring event always commits with scope 'all' — there is no series
 * to scope against. A recurring event whose stored rule `parseRrule` can
 * represent exactly gets the full this/thisAndFollowing/all prompt.
 *
 * A recurring event whose rule does NOT parse must never reach 'all' or
 * 'thisAndFollowing': useUpdateEvent rebuilds the series' ICS from
 * `input.rrule` for both of those scopes (useMutateEvent.ts), and an
 * undefined rrule there would silently destroy the recurrence on the server.
 * Scope 'this' instead writes an exception VEVENT and never touches the
 * master, so it stays safe even though the rule could not be read back —
 * that is why this case commits directly rather than offering the prompt.
 */
export function decideMoveEventScope(
  event: Pick<CalendarEvent, 'isRecurring' | 'rrule'>,
): MoveEventDecision {
  if (!event.isRecurring) return { kind: 'commit', scope: 'all' };
  if (parseRrule(event.rrule) === undefined) return { kind: 'commit', scope: 'this' };
  return { kind: 'prompt' };
}
