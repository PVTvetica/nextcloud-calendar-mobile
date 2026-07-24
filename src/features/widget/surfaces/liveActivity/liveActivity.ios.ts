import * as ExpoWidgets from 'expo-widgets';

import type { LiveEventState, WidgetSurface } from '../../core/types';
import { writeLiveEvent } from '../../storage/widgetStore';

const ACTIVITY_NAME = 'NextcloudCalendarLiveActivity';

const api = ExpoWidgets as unknown as Record<string, unknown>;
function fn(...names: string[]): ((...args: unknown[]) => Promise<unknown>) | null {
  for (const n of names) {
    if (typeof api[n] === 'function') return api[n] as (...args: unknown[]) => Promise<unknown>;
  }
  return null;
}
const startFn = fn('startActivity', 'startLiveActivity');
const updateFn = fn('updateActivity', 'updateLiveActivity');
const endFn = fn('endActivity', 'endLiveActivity');
function activitiesEnabled(): boolean {
  const f = api.areActivitiesEnabled ?? api.areLiveActivitiesEnabled;
  try {
    return typeof f === 'function' ? Boolean((f as () => boolean)()) : Boolean(startFn);
  } catch {
    return false;
  }
}

let currentActivityId: string | null = null;

async function present(state: LiveEventState): Promise<void> {
  const attributes = { uid: state.uid };
  const contentState = {
    title: state.title,
    startIso: state.startIso,
    endIso: state.endIso,
    color: state.color,
    deepLink: state.deepLink,
  };

  if (currentActivityId && updateFn) {
    await updateFn(currentActivityId, contentState);
  } else if (startFn) {
    const id = await startFn(ACTIVITY_NAME, attributes, contentState);
    currentActivityId = typeof id === 'string' ? id : ACTIVITY_NAME;
  }
}

export const liveActivity: WidgetSurface<LiveEventState> = {
  id: 'liveActivity',
  isSupported: activitiesEnabled,
  update: async (state) => {
    writeLiveEvent(state);
    try {
      await present(state);
    } catch {
      /* empty */
    }
  },
  clear: async () => {
    writeLiveEvent(null);
    if (!currentActivityId || !endFn) return;
    try {
      await endFn(currentActivityId);
    } finally {
      currentActivityId = null;
    }
  },
};
