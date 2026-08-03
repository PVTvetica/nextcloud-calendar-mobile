import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import type { CalendarEvent } from '@/types';
import i18n from '@/utils/i18n';

dayjs.extend(localizedFormat);

export type TimedAlert = 0 | 5 | 10 | 15 | 30 | 60 | 120 | 1440 | 2880 | 10080 | null;

export type AllDayAlert = 0 | 1 | 2 | 7 | null;

export const ALL_DAY_HOUR = 9;

export const TIMED_ALERTS: TimedAlert[] = [null, 0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080];
export const ALL_DAY_ALERTS: AllDayAlert[] = [null, 0, 1, 2, 7];

export function timedAlertLabelKey(value: TimedAlert): string {
  if (value === null) return 'settings.alerts.none';
  if (value === 0) return 'settings.alerts.atTime';
  return `settings.alerts.before.${value}`;
}

export function allDayAlertLabelKey(value: AllDayAlert): string {
  if (value === null) return 'settings.alerts.none';
  if (value === 0) return 'settings.alerts.allDayOpts.sameDay';
  return `settings.alerts.allDayOpts.${value}`;
}

export function minutesToTrigger(minutes: number): string {
  if (minutes === 0) return 'PT0S';
  if (minutes % 1440 === 0) return `-P${minutes / 1440}D`;
  if (minutes % 60 === 0) return `-PT${minutes / 60}H`;
  return `-PT${minutes}M`;
}

export function triggerToMinutes(trigger: string): number | null {
  const m = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(trigger.trim());
  if (!m) return null;
  const [, sign, w, d, h, min, s] = m;
  const total =
    Number(w ?? 0) * 10080 +
    Number(d ?? 0) * 1440 +
    Number(h ?? 0) * 60 +
    Number(min ?? 0) +
    Math.round(Number(s ?? 0) / 60);
  if (total === 0) return 0;
  return sign === '-' ? total : null;
}

export function alertTime(
  event: Pick<CalendarEvent, 'dtstart' | 'allDay' | 'alarmMinutes'>,
  timed: TimedAlert,
  allDay: AllDayAlert,
): Date | null {
  if (event.alarmMinutes !== undefined) {
    return new Date(event.dtstart.getTime() - event.alarmMinutes * 60_000);
  }
  if (event.allDay) {
    if (allDay === null) return null;
    const d = event.dtstart;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - allDay, ALL_DAY_HOUR, 0, 0);
  }
  if (timed === null) return null;
  return new Date(event.dtstart.getTime() - timed * 60_000);
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function alertLeadLabel(
  event: Pick<CalendarEvent, 'dtstart' | 'allDay'>,
  at: Date,
): string {
  if (event.allDay) {
    const days = Math.round(
      (startOfLocalDay(event.dtstart) - startOfLocalDay(at)) / 86_400_000,
    );
    if (days <= 0) return i18n.t('settings.notifications.today');
    if (days === 1) return i18n.t('settings.notifications.tomorrow');
    return i18n.t('settings.notifications.inDays', { n: days });
  }

  const minutes = Math.round((event.dtstart.getTime() - at.getTime()) / 60_000);
  if (minutes <= 0) return i18n.t('settings.notifications.now');
  if (minutes < 60) return i18n.t('settings.notifications.inMinutes', { n: minutes });
  if (minutes < 1440) return i18n.t('settings.notifications.inHours', { n: Math.round(minutes / 60) });
  return i18n.t('settings.notifications.inDays', { n: Math.round(minutes / 1440) });
}

export function alertBody(
  event: Pick<CalendarEvent, 'dtstart' | 'allDay' | 'location'>,
  at: Date,
): string {
  const parts = event.allDay
    ? [alertLeadLabel(event, at)]
    : [dayjs(event.dtstart).locale(i18n.language).format('LT'), alertLeadLabel(event, at)];
  if (event.location) parts.push(event.location);
  return parts.join(' · ');
}
