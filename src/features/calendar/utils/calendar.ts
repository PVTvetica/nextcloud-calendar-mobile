import type { Locale } from 'date-fns';
import { de, enGB, es, fr, it, nl, pt, ru } from 'date-fns/locale';
import {
  darkTheme,
  defaultTheme,
  type CalendarEvent as SuperCalendarEvent,
  type PartialCalendarTheme,
} from '@super-calendar/native';

import type { ThemeColors } from '@/theme';
import type { CalendarEvent } from '@/types';
import type { AppLanguage } from '@/utils/i18n';

export interface SuperEventExtra {
  id: string;
  color: string;
  source: CalendarEvent;
}

export type SuperEvent = SuperCalendarEvent<SuperEventExtra>;

function exclusiveEnd(event: CalendarEvent): Date {
  if (!event.allDay) return event.dtend;
  const end = new Date(event.dtend);
  end.setDate(end.getDate() + 1);
  return end;
}

export function toSuperEvents(events: CalendarEvent[]): SuperEvent[] {
  return events.map((event) => ({
    id: `${event.calendarId}|${event.uid}|${event.dtstart.getTime()}`,
    title: event.summary || '(no title)',
    start: event.dtstart,
    end: exclusiveEnd(event),
    allDay: event.allDay,
    color: event.color,
    source: event,
  }));
}

const LOCALES: Record<AppLanguage, Locale> = { en: enGB, fr, de, es, it, ru, pt, nl };

export function calendarLocale(language: string): Locale {
  return LOCALES[language as AppLanguage] ?? enGB;
}

export function calendarTheme(colors: ThemeColors, dark: boolean): PartialCalendarTheme {
  const base = dark ? darkTheme : defaultTheme;
  return {
    colors: {
      ...base.colors,
      surface: colors.background,
      gridLine: colors.gridLine,
      text: colors.text,
      textMuted: colors.textSecondary,
      textDisabled: colors.textTertiary,
      todayBackground: colors.primary,
      selectedBackground: colors.primary,
      nowIndicator: colors.danger,
      weekendBackground: colors.background
    },
  };
}
