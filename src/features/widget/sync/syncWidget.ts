import { Appearance } from 'react-native';

import { useSettingsStore } from '@/stores/settingsStore';

import { useAccountStore } from '@/stores/accountStore';

import { readUpcomingEvents } from '../core/readEvents';
import { buildAgendaSnapshot } from '../core/agendaSnapshot';
import { selectOngoingEvent, shouldClearLiveEvent } from '../core/liveEvent';
import { readLiveEvent } from '../storage/widgetStore';
import { homeWidget } from '../surfaces/homeWidget';
import { liveActivity } from '../surfaces/liveActivity';

export const AGENDA_DAYS = 7;

let running = false;
let pending = false;

async function runSync(now: Date): Promise<void> {
  try {
    if (!useAccountStore.getState().activeAccountId) return;

    const events = await readUpcomingEvents(AGENDA_DAYS, now);
    const locale = useSettingsStore.getState().language;
    const scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

    if (homeWidget.isSupported()) {
      const snapshot = buildAgendaSnapshot(events, { now, locale, scheme, days: AGENDA_DAYS, maxPerSection: 10 });
      await homeWidget.update(snapshot);
    }

    if (liveActivity.isSupported()) {
      const enabled = useSettingsStore.getState().liveActivityEnabled;
      const ongoing = enabled ? selectOngoingEvent(events, now) : null;
      if (ongoing) await liveActivity.update(ongoing);
      else if (shouldClearLiveEvent(readLiveEvent(), events.length, now)) await liveActivity.clear();
    }
  } catch (error) {
    if (__DEV__) console.warn('[widget] sync failed', error);
  }
}

export async function syncWidget(now: Date = new Date()): Promise<void> {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    let current = now;
    do {
      pending = false;
      await runSync(current);
      current = new Date();
    } while (pending);
  } finally {
    running = false;
  }
}
