import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { legacyBackedStorage } from '@/stores/legacyStorage';
import { getInitialLanguage, type AppLanguage } from '@/utils/i18n';

export type ThemePreference = 'system' | 'light' | 'dark';

interface SettingsState {
  themePreference: ThemePreference;
  language: AppLanguage;
  weekStartsOn: 0 | 1;
  setThemePreference: (pref: ThemePreference) => void;
  setLanguage: (lang: AppLanguage) => void;
  setWeekStartsOn: (v: 0 | 1) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      language: getInitialLanguage(),
      weekStartsOn: 0,
      setThemePreference: (pref) => set({ themePreference: pref }),
      setLanguage: (lang) => set({ language: lang }),
      setWeekStartsOn: (v) => set({ weekStartsOn: v }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() =>
        legacyBackedStorage(['themePreference', 'language', 'weekStartsOn'])
      ),
      partialize: (state) => ({
        themePreference: state.themePreference,
        language: state.language,
        weekStartsOn: state.weekStartsOn,
      }),
    }
  )
);
