import type { CalendarMeta, CreateEventInput } from '@/types';

import type { BlockReasonId } from '../constants';
import type { BookingSlot } from '../types';

/**
 * The calendar a blocking event goes into: the one picked in settings when it
 * is still writable, otherwise the first writable one. Read-only and
 * subscribed calendars can never be written to.
 */
export function resolveBookingCalendar(
  calendars: CalendarMeta[],
  preferredId: string | null,
): CalendarMeta | null {
  const writable = calendars.filter((c) => !c.isReadOnly && !c.isSubscribed);
  return writable.find((c) => c.id === preferredId) ?? writable[0] ?? null;
}

/**
 * Title for the event that blocks a slot. Presets use their translated label;
 * `custom` requires typed text. Returns null when there is nothing usable,
 * which the caller treats as "not ready to submit".
 */
export function resolveBlockSummary(params: {
  reason: BlockReasonId;
  customTitle: string;
  presetLabel: string;
}): string | null {
  const typed = params.customTitle.trim();
  if (params.reason === 'custom') return typed.length > 0 ? typed : null;
  const preset = params.presetLabel.trim();
  return preset.length > 0 ? preset : null;
}

/**
 * A blocking event is an ordinary timed event covering exactly the slot. No
 * attendees and no Talk room: `withTalkRoom: true` would fire a network call
 * and overwrite the location.
 */
export function buildBlockEventInput(params: {
  slot: BookingSlot;
  calendarId: string;
  summary: string;
  organizerEmail: string;
  organizerName: string;
}): CreateEventInput {
  return {
    summary: params.summary,
    calendarId: params.calendarId,
    dtstart: params.slot.start,
    dtend: params.slot.end,
    allDay: false,
    attendees: [],
    withTalkRoom: false,
    organizerEmail: params.organizerEmail,
    organizerName: params.organizerName,
  };
}
