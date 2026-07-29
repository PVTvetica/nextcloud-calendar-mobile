import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { legacyBackedStorage } from '@/stores/legacyStorage';
import { getInitialLanguage, type AppLanguage } from '@/utils/i18n';
import type { AllDayAlert, TimedAlert } from '@/features/notifications/alerts';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  themePreference: ThemePreference;
  language: AppLanguage;
  weekStartsOn: 0 | 1;
  liveActivityEnabled: boolean;
  timedAlert: TimedAlert;
  allDayAlert: AllDayAlert;
  setThemePreference: (pref: ThemePreference) => void;
  setLanguage: (lang: AppLanguage) => void;
  setWeekStartsOn: (v: 0 | 1) => void;
  setLiveActivityEnabled: (v: boolean) => void;
  setTimedAlert: (v: TimedAlert) => void;
  setAllDayAlert: (v: AllDayAlert) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      language: getInitialLanguage(),
      weekStartsOn: 0,
      liveActivityEnabled: true,
      timedAlert: 10,
      allDayAlert: null,
      setTimedAlert: (v) => set({ timedAlert: v }),
      setAllDayAlert: (v) => set({ allDayAlert: v }),
      setThemePreference: (pref) => set({ themePreference: pref }),
      setLanguage: (lang) => set({ language: lang }),
      setWeekStartsOn: (v) => set({ weekStartsOn: v }),
      setLiveActivityEnabled: (v) => set({ liveActivityEnabled: v }),
    }),
    {
      name: 'settings-store',
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Partial<SettingsState> | undefined;
        if (version === 0 && state && state.timedAlert == null) {
          return { ...state, timedAlert: 10 };
        }
        return state;
      },
      storage: createJSONStorage(() =>
        legacyBackedStorage(['themePreference', 'language', 'weekStartsOn'])
      ),
      partialize: (state) => ({
        themePreference: state.themePreference,
        language: state.language,
        weekStartsOn: state.weekStartsOn,
        liveActivityEnabled: state.liveActivityEnabled,
        timedAlert: state.timedAlert,
        allDayAlert: state.allDayAlert,
      }),
    }
  )
);
