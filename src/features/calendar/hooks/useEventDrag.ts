import { useCallback } from 'react';
import { haptic, ImpactFeedbackStyle } from '@/utils/haptics';

import { useUpdateEvent } from '@/features/event/hooks/useMutateEvent';
import { accountOrganizerEmail, canEditEvent } from '@/features/event/organizer';
import { askRecurrenceScope } from '@/features/event/recurrenceScope';
import i18n from '@/utils/i18n';
import type { Account, CalendarEvent, CalendarMeta, CreateEventInput } from '@/types';

import type { SuperEvent } from '../utils/calendar';

export function useEventDrag(account: Account | null, calendars: CalendarMeta[]) {
  const updateMutation = useUpdateEvent(account as Account, calendars);

  const onDragStart = useCallback(() => {
    haptic(ImpactFeedbackStyle.Medium);
  }, []);

  const buildInput = useCallback(
    (event: CalendarEvent, start: Date, end: Date): CreateEventInput => ({
      summary: event.summary,
      calendarId: event.calendarId,
      dtstart: start,
      dtend: end,
      allDay: event.allDay,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      withTalkRoom: false,
      organizerEmail: event.organizerEmail ?? accountOrganizerEmail(account as Account),
      organizerName: (account as Account).displayName,
      alarmMinutes: event.alarmMinutes,
    }),
    [account],
  );

  const onDragEvent = useCallback((dragged: SuperEvent, start: Date, end: Date) => {
    const event = dragged.source;
    const calendar = calendars.find((c) => c.id === event.calendarId);

    if (!account || !canEditEvent(event, calendar, account)) return false;
    if (event.allDay) return false;

    if (event.isRecurring) {
      askRecurrenceScope(i18n.t('event.editEvent'), (scope) => {
        void updateMutation.mutateAsync({ event, input: buildInput(event, start, end), scope });
      });
      return false;
    }

    void updateMutation.mutateAsync({ event, input: buildInput(event, start, end), scope: 'all' });
  }, [account, calendars, updateMutation, buildInput]);

  return { onDragEvent, onDragStart };
}
