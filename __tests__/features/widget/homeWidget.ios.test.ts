import type { AgendaSnapshot } from '@/features/widget/core/types';

jest.mock('@expo/ui/swift-ui', () => ({ HStack: 'HStack', Link: 'Link', Text: 'Text', VStack: 'VStack' }));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  background: jest.fn(),
  cornerRadius: jest.fn(),
  font: jest.fn(),
  foregroundStyle: jest.fn(),
  frame: jest.fn(),
  padding: jest.fn(),
}));
jest.mock('@/features/widget/storage/widgetStore', () => ({ writeAgendaSnapshot: jest.fn() }));

const mockUpdateSnapshot = jest.fn();

jest.mock('expo-widgets', () => ({
  createWidget: () => ({ updateSnapshot: mockUpdateSnapshot }),
}));

function makeSnapshot(): AgendaSnapshot {
  return {
    generatedAtIso: '2026-07-29T09:00:00.000Z',
    timeZone: 'Europe/Berlin',
    scheme: 'light',
    dayLabel: 'WED',
    dayNumber: '29',
    relativeLabel: 'Wednesday, 29 July',
    events: [],
    sections: [],
    nextEvent: null,
  };
}

describe('homeWidget (ios)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockUpdateSnapshot.mockReset();
  });

  it('pushes the snapshot into the native widget timeline on update', async () => {
    const { homeWidget } = require('@/features/widget/surfaces/homeWidget/homeWidget.ios');
    const snapshot = makeSnapshot();
    await homeWidget.update(snapshot);

    expect(mockUpdateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockUpdateSnapshot).toHaveBeenCalledWith({ snapshot });
  });

  it('clears the widget by pushing a null snapshot', async () => {
    const { homeWidget } = require('@/features/widget/surfaces/homeWidget/homeWidget.ios');
    await homeWidget.clear();

    expect(mockUpdateSnapshot).toHaveBeenCalledWith({ snapshot: null });
  });
});