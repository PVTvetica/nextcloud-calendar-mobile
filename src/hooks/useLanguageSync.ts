import { useEffect } from 'react';
import dayjs from 'dayjs';
import i18n from '@/i18n';
import { useAppStore } from '@/store/appStore';
import { isSupported } from '@/i18n/languages';

export function useLanguageSync(): void {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    const lang = isSupported(language) ? language : 'en';
    i18n.changeLanguage(lang);
    dayjs.locale(lang);
  }, [language]);
}
