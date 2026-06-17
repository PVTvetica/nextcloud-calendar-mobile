import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useIsOnline } from '@/api/network';

/**
 * Thin banner shown while the device is offline. Turns a scary blank/stale
 * calendar into clear feedback: the events on screen are the last good cache and
 * will refresh automatically once the connection returns.
 */
export function OfflineBanner() {
  const online = useIsOnline();
  const theme = useTheme();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.warning }]}>
      <Text style={[styles.text, { color: theme.primaryText }]} numberOfLines={1}>
        {t('calendar.offlineBanner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 4, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 12, fontWeight: '600' },
});
