import { createMMKV, type MMKV } from 'react-native-mmkv';

import type { AgendaSnapshot, LiveEventState } from '../core/types';

export const WIDGET_MMKV_ID = 'group.com.soluce.nextcloud-calendar';

let instance: MMKV | null = null;
function store(): MMKV {
  if (!instance) instance = createMMKV({ id: WIDGET_MMKV_ID });
  return instance;
}

const AGENDA_KEY = 'widget.agenda.v1';
const LIVE_KEY = 'widget.live.v1';

export function writeAgendaSnapshot(snapshot: AgendaSnapshot): void {
  store().set(AGENDA_KEY, JSON.stringify(snapshot));
}

export function readAgendaSnapshot(): AgendaSnapshot | null {
  const raw = store().getString(AGENDA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AgendaSnapshot;
  } catch {
    return null;
  }
}

export function writeLiveEvent(state: LiveEventState | null): void {
  if (state) store().set(LIVE_KEY, JSON.stringify(state));
  else store().remove(LIVE_KEY);
}

export function readLiveEvent(): LiveEventState | null {
  const raw = store().getString(LIVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LiveEventState;
  } catch {
    return null;
  }
}
