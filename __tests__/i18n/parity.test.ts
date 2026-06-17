import en from '../../src/i18n/locales/en.json';
import fr from '../../src/i18n/locales/fr.json';
import de from '../../src/i18n/locales/de.json';
import es from '../../src/i18n/locales/es.json';
import itLocale from '../../src/i18n/locales/it.json';
import ru from '../../src/i18n/locales/ru.json';

function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? keyPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

describe('locale parity', () => {
  const base = keyPaths(en).sort();
  it.each([
    ['fr', fr],
    ['de', de],
    ['es', es],
    ['it', itLocale],
    ['ru', ru],
  ])('%s has exactly the same keys as en', (_name, locale) => {
    expect(keyPaths(locale as Record<string, unknown>).sort()).toEqual(base);
  });
});
