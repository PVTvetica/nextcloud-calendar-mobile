import type { LiveEventState, WidgetSurface } from '../../core/types';
import { eventProgress, remainingMinutes } from '../../core/liveEvent';
import { writeLiveEvent } from '../../storage/widgetStore';

export const liveActivity: WidgetSurface<LiveEventState> = {
  id: 'liveActivity',
  isSupported: () => true,
  update: async (state) => {
    writeLiveEvent(state);
    const progress = Math.round(eventProgress(state) * 100);
    const remaining = remainingMinutes(state);
    if (__DEV__) {
      console.log(`[liveActivity/android] ${state.title} — ${progress}%, ${remaining}min left`);
    }
  },
  clear: async () => {
    writeLiveEvent(null);
  },
};
