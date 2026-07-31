import type { CalendarEvent } from '@/types';

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
