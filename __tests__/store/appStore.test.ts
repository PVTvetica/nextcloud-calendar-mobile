import { useAppStore } from '../../src/store/appStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      activeAccountId: null,
      viewMode: 'week',
      selectedDate: null,
      hiddenCalendarIds: [],
      notifiableCalendarIds: [],
      weekStartsOn: 0,
    });
  });

  it('sets active account id', () => {
    useAppStore.getState().setActiveAccountId('acc-1');
    expect(useAppStore.getState().activeAccountId).toBe('acc-1');
  });

  it('sets view mode', () => {
    useAppStore.getState().setViewMode('month');
    expect(useAppStore.getState().viewMode).toBe('month');
  });

  it('sets selected date', () => {
    const date = new Date('2026-06-01');
    useAppStore.getState().setSelectedDate(date);
    expect(useAppStore.getState().selectedDate).toEqual(date);
  });

  it('toggles calendar visibility off', () => {
    useAppStore.getState().toggleCalendarVisibility('cal-1');
    expect(useAppStore.getState().hiddenCalendarIds).toContain('cal-1');
  });

  it('toggles calendar visibility back on', () => {
    useAppStore.setState({ hiddenCalendarIds: ['cal-1'] });
    useAppStore.getState().toggleCalendarVisibility('cal-1');
    expect(useAppStore.getState().hiddenCalendarIds).not.toContain('cal-1');
  });

  it('toggles calendar notification selection on', () => {
    useAppStore.getState().toggleCalendarNotification('cal-1');
    expect(useAppStore.getState().notifiableCalendarIds).toContain('cal-1');
  });

  it('toggles calendar notification selection back off', () => {
    useAppStore.setState({ notifiableCalendarIds: ['cal-1'] });
    useAppStore.getState().toggleCalendarNotification('cal-1');
    expect(useAppStore.getState().notifiableCalendarIds).not.toContain('cal-1');
  });

  it('hiding a selected calendar clears notification selection', () => {
    useAppStore.setState({ notifiableCalendarIds: ['cal-1'] });
    useAppStore.getState().toggleCalendarVisibility('cal-1');
    expect(useAppStore.getState().hiddenCalendarIds).toContain('cal-1');
    expect(useAppStore.getState().notifiableCalendarIds).not.toContain('cal-1');
  });

  it('showing a hidden calendar does not restore notification selection', () => {
    useAppStore.setState({
      hiddenCalendarIds: ['cal-1'],
      notifiableCalendarIds: [],
    });

    useAppStore.getState().toggleCalendarVisibility('cal-1');

    expect(useAppStore.getState().hiddenCalendarIds).not.toContain('cal-1');
    expect(useAppStore.getState().notifiableCalendarIds).not.toContain('cal-1');
  });

  it('does not select notifications for a hidden calendar', () => {
    useAppStore.setState({ hiddenCalendarIds: ['cal-1'] });
    useAppStore.getState().toggleCalendarNotification('cal-1');
    expect(useAppStore.getState().notifiableCalendarIds).not.toContain('cal-1');
  });

  it('defaults weekStartsOn to 0 (Sunday)', () => {
    expect(useAppStore.getState().weekStartsOn).toBe(0);
  });

  it('setWeekStartsOn(1) sets weekStartsOn to 1 (Monday)', () => {
    useAppStore.getState().setWeekStartsOn(1);
    expect(useAppStore.getState().weekStartsOn).toBe(1);
  });

  it('setWeekStartsOn(0) sets weekStartsOn back to 0 (Sunday)', () => {
    useAppStore.getState().setWeekStartsOn(1);
    useAppStore.getState().setWeekStartsOn(0);
    expect(useAppStore.getState().weekStartsOn).toBe(0);
  });
});
