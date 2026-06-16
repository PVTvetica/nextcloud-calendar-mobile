import { getLocales } from 'expo-localization';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
] as const;

export type AppLanguage = (typeof LANGUAGES)[number]['code'];

export const SUPPORTED: AppLanguage[] = LANGUAGES.map((l) => l.code);

export function isSupported(code: string | null | undefined): code is AppLanguage {
  return !!code && (SUPPORTED as string[]).includes(code);
}

export function getInitialLanguage(): AppLanguage {
  const code = getLocales()[0]?.languageCode ?? undefined;
  return isSupported(code) ? code : 'en';
}
