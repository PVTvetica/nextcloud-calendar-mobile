import type { AgendaSnapshot, WidgetSurface } from '../../core/types';

export const homeWidget: WidgetSurface<AgendaSnapshot> = {
  id: 'homeWidget',
  isSupported: () => false,
  update: async () => {},
  clear: async () => {},
};
