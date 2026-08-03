import { useCalendarStore } from '../../src/stores/calendarStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('calendarStore', () => {
  beforeEach(() => {
    useCalendarStore.setState({
      viewMode: 'week',
      selectedDate: null,
      hiddenCalendarIds: [],
      notifDisabledCalendarIds: [],
      widgetDisabledCalendarIds: [],
      hourRowHeight: 60,
    });
  });

  it('sets view mode', () => {
    useCalendarStore.getState().setViewMode('month');
    expect(useCalendarStore.getState().viewMode).toBe('month');
  });

  it('sets selected date', () => {
    const date = new Date('2026-06-01');
    useCalendarStore.getState().setSelectedDate(date);
    expect(useCalendarStore.getState().selectedDate).toEqual(date);
  });

  it('toggles calendar visibility off', () => {
    useCalendarStore.getState().toggleCalendarVisibility('cal-1');
    expect(useCalendarStore.getState().hiddenCalendarIds).toContain('cal-1');
  });

  it('toggles calendar visibility back on', () => {
    useCalendarStore.setState({ hiddenCalendarIds: ['cal-1'] });
    useCalendarStore.getState().toggleCalendarVisibility('cal-1');
    expect(useCalendarStore.getState().hiddenCalendarIds).not.toContain('cal-1');
  });

  it('toggles calendar notifications off and back on', () => {
    useCalendarStore.getState().toggleCalendarNotifications('cal-1');
    expect(useCalendarStore.getState().notifDisabledCalendarIds).toContain('cal-1');
    useCalendarStore.getState().toggleCalendarNotifications('cal-1');
    expect(useCalendarStore.getState().notifDisabledCalendarIds).not.toContain('cal-1');
  });

  it('toggles calendar widget presence off and back on', () => {
    useCalendarStore.getState().toggleCalendarWidget('cal-1');
    expect(useCalendarStore.getState().widgetDisabledCalendarIds).toContain('cal-1');
    useCalendarStore.getState().toggleCalendarWidget('cal-1');
    expect(useCalendarStore.getState().widgetDisabledCalendarIds).not.toContain('cal-1');
  });

  it('keeps the three per-calendar deny-lists independent', () => {
    useCalendarStore.getState().toggleCalendarNotifications('cal-1');
    expect(useCalendarStore.getState().hiddenCalendarIds).toEqual([]);
    expect(useCalendarStore.getState().widgetDisabledCalendarIds).toEqual([]);
  });

  it('sets hour row height', () => {
    useCalendarStore.getState().setHourRowHeight(80);
    expect(useCalendarStore.getState().hourRowHeight).toBe(80);
  });
});
