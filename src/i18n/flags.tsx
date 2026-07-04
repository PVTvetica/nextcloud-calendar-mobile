import { View, StyleSheet } from 'react-native';
import CountryFlag from 'react-native-country-flag';
import { LANGUAGES, type AppLanguage } from './languages';

export function Flag({ code, size = 28 }: { code: AppLanguage; size?: number }) {
  const region = LANGUAGES.find((l) => l.code === code)?.region ?? 'US';
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <CountryFlag isoCode={region.toLowerCase()} size={size} />
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
