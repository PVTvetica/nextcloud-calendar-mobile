export { useWidgetSync } from './hooks/useWidgetSync';
export { syncWidget as refreshWidgets } from './sync/syncWidget';
export type { AgendaSnapshot, LiveEventState, WidgetSurface } from './core/types';

export function registerWidgetEntry(): void {
  const { Platform } = require('react-native') as typeof import('react-native');
  if (Platform.OS !== 'android') return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./surfaces/homeWidget/homeWidget.android');
  mod.registerWidgetTaskHandler(mod.widgetTaskHandler);
}
