import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { legacyBackedStorage } from '@/stores/legacyStorage';
import type { ViewMode } from '@/types';

interface CalendarState {
  viewMode: ViewMode;
  selectedDate: Date | null;
  hiddenCalendarIds: string[];
  hourRowHeight: number;
  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date | null) => void;
  toggleCalendarVisibility: (calendarId: string) => void;
  setHourRowHeight: (h: number) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      viewMode: 'week',
      selectedDate: null,
      hiddenCalendarIds: [],
      hourRowHeight: 60,
      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      toggleCalendarVisibility: (calendarId) => {
        const { hiddenCalendarIds } = get();
        if (hiddenCalendarIds.includes(calendarId)) {
          set({ hiddenCalendarIds: hiddenCalendarIds.filter((id) => id !== calendarId) });
        } else {
          set({ hiddenCalendarIds: [...hiddenCalendarIds, calendarId] });
        }
      },
      setHourRowHeight: (h) => set({ hourRowHeight: h }),
    }),
    {
      name: 'calendar-store',
      storage: createJSONStorage(() =>
        legacyBackedStorage(['viewMode', 'hiddenCalendarIds', 'hourRowHeight'])
      ),
      partialize: (state) => ({
        viewMode: state.viewMode,
        hiddenCalendarIds: state.hiddenCalendarIds,
        hourRowHeight: state.hourRowHeight,
      }),
    }
  )
);
