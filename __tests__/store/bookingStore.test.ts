import { useBookingStore } from '../../src/stores/bookingStore';
import { DEFAULT_SCHEDULE, DEFAULT_SLOT_MINUTES } from '../../src/features/booking/constants';
import { normalizeSchedule } from '../../src/features/booking/utils/slots';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const MONDAY = 1;

describe('bookingStore', () => {
  beforeEach(() => {
    useBookingStore.setState({
      schedule: normalizeSchedule(DEFAULT_SCHEDULE),
      slotMinutes: DEFAULT_SLOT_MINUTES,
      calendarId: null,
    });
  });

  it('ships the agreed default schedule', () => {
    const { schedule, slotMinutes } = useBookingStore.getState();
    expect(schedule[MONDAY]).toEqual(['12:00', '13:30', '15:00', '16:30', '18:00']);
    expect(schedule[3]).toEqual(['09:00', '10:30']);
    expect(schedule[0]).toEqual([]);
    expect(schedule[6]).toEqual([]);
    expect(slotMinutes).toBe(90);
  });

  it('adds a time in chronological order', () => {
    useBookingStore.getState().addSlotTime(MONDAY, '09:00');
    expect(useBookingStore.getState().schedule[MONDAY][0]).toBe('09:00');
  });

  it('normalizes a single-digit hour when adding', () => {
    useBookingStore.getState().addSlotTime(MONDAY, '9:15');
    expect(useBookingStore.getState().schedule[MONDAY]).toContain('09:15');
  });

  it('ignores an invalid time', () => {
    const before = useBookingStore.getState().schedule[MONDAY];
    useBookingStore.getState().addSlotTime(MONDAY, '25:00');
    expect(useBookingStore.getState().schedule[MONDAY]).toEqual(before);
  });

  it('does not add a duplicate time', () => {
    useBookingStore.getState().addSlotTime(MONDAY, '12:00');
    expect(useBookingStore.getState().schedule[MONDAY].filter((t) => t === '12:00')).toHaveLength(1);
  });

  it('removes a time from one weekday only', () => {
    useBookingStore.getState().removeSlotTime(MONDAY, '12:00');
    expect(useBookingStore.getState().schedule[MONDAY]).not.toContain('12:00');
    expect(useBookingStore.getState().schedule[2]).toContain('12:00');
  });

  it('clamps the slot length into the supported range', () => {
    useBookingStore.getState().setSlotMinutes(5);
    expect(useBookingStore.getState().slotMinutes).toBe(15);

    useBookingStore.getState().setSlotMinutes(99_999);
    expect(useBookingStore.getState().slotMinutes).toBe(480);

    useBookingStore.getState().setSlotMinutes(60);
    expect(useBookingStore.getState().slotMinutes).toBe(60);
  });

  it('stores and clears the target calendar', () => {
    useBookingStore.getState().setCalendarId('https://cloud.example.com/cal/');
    expect(useBookingStore.getState().calendarId).toBe('https://cloud.example.com/cal/');

    useBookingStore.getState().setCalendarId(null);
    expect(useBookingStore.getState().calendarId).toBeNull();
  });

  it('restores the defaults without touching the target calendar', () => {
    useBookingStore.getState().setCalendarId('cal-1');
    useBookingStore.getState().removeSlotTime(MONDAY, '12:00');
    useBookingStore.getState().setSlotMinutes(30);

    useBookingStore.getState().resetSchedule();

    expect(useBookingStore.getState().schedule[MONDAY]).toContain('12:00');
    expect(useBookingStore.getState().slotMinutes).toBe(DEFAULT_SLOT_MINUTES);
    expect(useBookingStore.getState().calendarId).toBe('cal-1');
  });

  it('never mutates the shared DEFAULT_SCHEDULE constant', () => {
    useBookingStore.getState().addSlotTime(MONDAY, '07:00');
    expect(DEFAULT_SCHEDULE[MONDAY]).not.toContain('07:00');
  });
});
