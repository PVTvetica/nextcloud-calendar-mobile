import { Appearance } from 'react-native';

import { useSettingsStore } from '@/stores/settingsStore';
import type { CalendarEvent } from '@/types';

import { readUpcomingEvents } from '../core/readEvents';
import { buildAgendaSnapshot } from '../core/agendaSnapshot';
import { buildAgendaTimeline } from '../core/agendaTimeline';
import { nextLiveBoundary, selectOngoingEvent } from '../core/liveEvent';
import { homeWidget } from '../surfaces/homeWidget';
import { liveActivity } from '../surfaces/liveActivity';

export const AGENDA_DAYS = 7;

let running = false;
let pending = false;

function reportStep(step: string, error: unknown): void {
  console.warn(`[widget] ${step} failed`, error);
}

async function runSync(now: Date): Promise<Date | null> {
  let events: CalendarEvent[];
  try {
    events = await readUpcomingEvents(AGENDA_DAYS, now, 'widget');
  } catch (error) {
    reportStep('reading events', error);
    return null;
  }

  const locale = useSettingsStore.getState().language;
  const scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

  if (homeWidget.isSupported()) {
    try {
      const options = { locale, scheme, days: AGENDA_DAYS, maxPerSection: 10 } as const;
      if (homeWidget.updateTimeline) {
        await homeWidget.updateTimeline(buildAgendaTimeline(events, { ...options, now }));
      } else {
        await homeWidget.update(buildAgendaSnapshot(events, { ...options, now }));
      }
    } catch (error) {
      reportStep('home widget update', error);
    }
  }

  if (liveActivity.isSupported()) {
    try {
      const enabled = useSettingsStore.getState().liveActivityEnabled;
      const ongoing = enabled ? selectOngoingEvent(events, now) : null;
      if (ongoing) await liveActivity.update(ongoing);
      else await liveActivity.clear();
    } catch (error) {
      reportStep('live activity update', error);
    }
  }

  try {
    return nextLiveBoundary(events, now);
  } catch (error) {
    reportStep('boundary computation', error);
    return null;
  }
}

export async function syncWidget(now: Date = new Date()): Promise<Date | null> {
  if (running) {
    pending = true;
    return null;
  }
  running = true;
  try {
    let current = now;
    let boundary: Date | null = null;
    do {
      pending = false;
      boundary = await runSync(current);
      current = new Date();
    } while (pending);
    return boundary;
  } finally {
    running = false;
  }
}
