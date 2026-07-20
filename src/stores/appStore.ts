import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '@/storage';
import type { ViewMode, ServerCapabilities } from '@/types';
import { getInitialLanguage, type AppLanguage } from '@/i18n/languages';

export type ThemePreference = 'system' | 'light' | 'dark';

interface AppState {
  activeAccountId: string | null;
  viewMode: ViewMode;
  selectedDate: Date | null;
  hiddenCalendarIds: string[];
  themePreference: ThemePreference;
  hourRowHeight: number;
  weekStartsOn: 0 | 1;
  language: AppLanguage;
  capabilities: ServerCapabilities;
  setActiveAccountId: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date | null) => void;
  toggleCalendarVisibility: (calendarId: string) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setHourRowHeight: (h: number) => void;
  setWeekStartsOn: (v: 0 | 1) => void;
  setLanguage: (lang: AppLanguage) => void;
  setCapabilities: (caps: ServerCapabilities) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeAccountId: null,
      viewMode: 'week',
      selectedDate: null,
      hiddenCalendarIds: [],
      themePreference: 'system',
      hourRowHeight: 60,
      weekStartsOn: 0,
      language: getInitialLanguage(),
      capabilities: { calendarEnabled: true, talkEnabled: false },
      setActiveAccountId: (id) => set({ activeAccountId: id }),
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
      setThemePreference: (pref) => set({ themePreference: pref }),
      setHourRowHeight: (h) => set({ hourRowHeight: h }),
      setWeekStartsOn: (v) => set({ weekStartsOn: v }),
      setLanguage: (lang) => set({ language: lang }),
      setCapabilities: (caps) => set({ capabilities: caps }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        activeAccountId: state.activeAccountId,
        viewMode: state.viewMode,
        hiddenCalendarIds: state.hiddenCalendarIds,
        themePreference: state.themePreference,
        hourRowHeight: state.hourRowHeight,
        weekStartsOn: state.weekStartsOn,
        language: state.language,
      }),
    }
  )
);
