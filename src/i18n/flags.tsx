import { View, StyleSheet } from 'react-native';
import CountryFlag from 'react-native-country-flag';
import type { AppLanguage } from './languages';

// Maps each supported app language to an ISO 3166-1 alpha-2 country whose flag
// represents it. react-native-country-flag loads the flag image from flagcdn.com.
const ISO: Record<AppLanguage, string> = { en: 'us', fr: 'fr', de: 'de', es: 'es' };

export function Flag({ code, size = 28 }: { code: AppLanguage; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <CountryFlag isoCode={ISO[code]} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});
