import {
  inWidgetFor,
  isCalendarVisible,
  notifiesFor,
} from '../../../src/features/calendar/utils/calendarPrefs';

describe('calendarPrefs', () => {
  it('treats an unknown calendar as visible, notifying and on the widgets', () => {
    expect(isCalendarVisible('new', [])).toBe(true);
    expect(notifiesFor('new', [], [])).toBe(true);
    expect(inWidgetFor('new', [], [])).toBe(true);
  });

  it('silences and de-widgets a hidden calendar whatever its own flags say', () => {
    expect(notifiesFor('cal-1', ['cal-1'], [])).toBe(false);
    expect(inWidgetFor('cal-1', ['cal-1'], [])).toBe(false);
  });

  it('honours the notification opt-out on a visible calendar', () => {
    expect(notifiesFor('cal-1', [], ['cal-1'])).toBe(false);
  });

  it('honours the widget opt-out on a visible calendar', () => {
    expect(inWidgetFor('cal-1', [], ['cal-1'])).toBe(false);
  });

  it('keeps the two opt-outs independent of each other', () => {
    expect(notifiesFor('cal-1', [], ['cal-2'])).toBe(true);
    expect(inWidgetFor('cal-2', [], ['cal-1'])).toBe(true);
  });
});
