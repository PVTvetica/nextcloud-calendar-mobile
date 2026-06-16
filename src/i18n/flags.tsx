import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { AppLanguage } from './languages';

// Simplified flags rendered as SVG so they display identically on Android and iOS
// (flag emoji render blank on Android). `slice` makes each flag cover its circle.
const PAR = 'preserveAspectRatio="xMidYMid slice"';

const FR = `<svg viewBox="0 0 3 2" ${PAR} xmlns="http://www.w3.org/2000/svg"><rect width="3" height="2" fill="#fff"/><rect width="1" height="2" fill="#0055A4"/><rect x="2" width="1" height="2" fill="#EF4135"/></svg>`;
const DE = `<svg viewBox="0 0 5 3" ${PAR} xmlns="http://www.w3.org/2000/svg"><rect width="5" height="3" fill="#FFCE00"/><rect width="5" height="2" fill="#DD0000"/><rect width="5" height="1" fill="#000"/></svg>`;
const ES = `<svg viewBox="0 0 4 3" ${PAR} xmlns="http://www.w3.org/2000/svg"><rect width="4" height="3" fill="#AA151B"/><rect y="0.75" width="4" height="1.5" fill="#F1BF00"/></svg>`;
const US = `<svg viewBox="0 0 39 26" ${PAR} xmlns="http://www.w3.org/2000/svg"><rect width="39" height="26" fill="#B22234"/><rect y="2" width="39" height="2" fill="#fff"/><rect y="6" width="39" height="2" fill="#fff"/><rect y="10" width="39" height="2" fill="#fff"/><rect y="14" width="39" height="2" fill="#fff"/><rect y="18" width="39" height="2" fill="#fff"/><rect y="22" width="39" height="2" fill="#fff"/><rect width="16" height="14" fill="#3C3B6E"/></svg>`;

const FLAGS: Record<AppLanguage, string> = { en: US, fr: FR, de: DE, es: ES };

export function Flag({ code, size = 28 }: { code: AppLanguage; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <SvgXml xml={FLAGS[code]} width={size} height={size} />
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
