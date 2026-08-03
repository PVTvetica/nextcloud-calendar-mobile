import { useCallback } from 'react';

import { useCalendarStore } from '@/stores/calendarStore';
import { requestAlertPermission, scheduleEventAlerts } from '@/features/notifications/scheduleAlerts';
import { refreshWidgets } from '@/features/widget';

export function useCalendarPrefs() {
  const hiddenCalendarIds = useCalendarStore((s) => s.hiddenCalendarIds);
  const notifDisabledCalendarIds = useCalendarStore((s) => s.notifDisabledCalendarIds);
  const widgetDisabledCalendarIds = useCalendarStore((s) => s.widgetDisabledCalendarIds);
  const toggleVisibility = useCalendarStore((s) => s.toggleCalendarVisibility);
  const toggleNotifications = useCalendarStore((s) => s.toggleCalendarNotifications);
  const toggleWidget = useCalendarStore((s) => s.toggleCalendarWidget);

  const setVisibility = useCallback((id: string) => {
    toggleVisibility(id);
    void scheduleEventAlerts();
    void refreshWidgets();
  }, [toggleVisibility]);

  const setNotifications = useCallback(async (id: string) => {
    const willEnable = notifDisabledCalendarIds.includes(id);
    toggleNotifications(id);
    if (willEnable) await requestAlertPermission();
    await scheduleEventAlerts();
  }, [notifDisabledCalendarIds, toggleNotifications]);

  const setWidget = useCallback((id: string) => {
    toggleWidget(id);
    void refreshWidgets();
  }, [toggleWidget]);

  return {
    hiddenCalendarIds,
    notifDisabledCalendarIds,
    widgetDisabledCalendarIds,
    setVisibility,
    setNotifications: useCallback((id: string) => { void setNotifications(id); }, [setNotifications]),
    setWidget,
  };
}
