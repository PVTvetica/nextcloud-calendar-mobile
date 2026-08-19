import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { zustandStorage } from '@/storage';
import { DEFAULT_SCHEDULE, DEFAULT_SLOT_MINUTES } from '@/features/booking/constants';
import type { BookingSchedule } from '@/features/booking/types';
import { clampSlotMinutes, formatHm, normalizeSchedule, parseHm } from '@/features/booking/utils/slots';

interface BookingState {
  /** Bookable start times per weekday (0 = Sunday), as 'HH:mm'. */
  schedule: BookingSchedule;
  /** Length of one slot in minutes. */
  slotMinutes: number;
  /** CalendarMeta.id (its CalDAV URL) that blocking events are written to. */
  calendarId: string | null;
  addSlotTime: (day: number, time: string) => void;
  removeSlotTime: (day: number, time: string) => void;
  setSlotMinutes: (minutes: number) => void;
  setCalendarId: (calendarId: string | null) => void;
  resetSchedule: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      schedule: normalizeSchedule(DEFAULT_SCHEDULE),
      slotMinutes: DEFAULT_SLOT_MINUTES,
      calendarId: null,

      addSlotTime: (day, time) => {
        const parsed = parseHm(time);
        if (!parsed) return;
        const value = formatHm(parsed.hour, parsed.minute);
        set({
          schedule: normalizeSchedule(
            get().schedule.map((times, i) => (i === day ? [...times, value] : times)),
          ),
        });
      },

      removeSlotTime: (day, time) => {
        set({
          schedule: normalizeSchedule(
            get().schedule.map((times, i) => (i === day ? times.filter((t) => t !== time) : times)),
          ),
        });
      },

      setSlotMinutes: (minutes) => set({ slotMinutes: clampSlotMinutes(minutes) }),
      setCalendarId: (calendarId) => set({ calendarId }),
      resetSchedule: () =>
        set({ schedule: normalizeSchedule(DEFAULT_SCHEDULE), slotMinutes: DEFAULT_SLOT_MINUTES }),
    }),
    {
      name: 'booking-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        schedule: state.schedule,
        slotMinutes: state.slotMinutes,
        calendarId: state.calendarId,
      }),
      // The persisted blob is plain JSON that older versions (or a hand edit)
      // may have written differently, so it is normalized on the way in — a
      // malformed schedule must never be able to break the week board.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<BookingState>;
        return {
          ...current,
          ...saved,
          schedule: normalizeSchedule(saved.schedule ?? current.schedule),
          slotMinutes: clampSlotMinutes(saved.slotMinutes ?? current.slotMinutes),
          calendarId: typeof saved.calendarId === 'string' ? saved.calendarId : null,
        };
      },
    },
  ),
);
