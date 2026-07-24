import { Appearance } from 'react-native';

import { useSettingsStore } from '@/stores/settingsStore';

import { readUpcomingEvents } from '../core/readEvents';
import { buildAgendaSnapshot } from '../core/agendaSnapshot';
import { selectOngoingEvent } from '../core/liveEvent';
import { homeWidget } from '../surfaces/homeWidget';
import { liveActivity } from '../surfaces/liveActivity';

const AGENDA_DAYS = 7;

let running: Promise<void> | null = null;

export async function syncWidget(now: Date = new Date()): Promise<void> {
  if (running) return running;
  running = (async () => {
    try {
      const events = await readUpcomingEvents(AGENDA_DAYS, now);
      const locale = useSettingsStore.getState().language;
      const scheme = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

      if (homeWidget.isSupported()) {
        const snapshot = buildAgendaSnapshot(events, { now, locale, scheme, days: AGENDA_DAYS, maxPerSection: 10 });
        await homeWidget.update(snapshot);
      }

      if (liveActivity.isSupported()) {
        const ongoing = selectOngoingEvent(events, now);
        if (ongoing) await liveActivity.update(ongoing);
        else await liveActivity.clear();
      }
    } catch (error) {
      if (__DEV__) console.warn('[widget] sync failed', error);
    } finally {
      running = null;
    }
  })();
  return running;
}
