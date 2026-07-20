import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { useIsOnline } from '@/services/shared/network';


export function OfflineBanner() {
  const online = useIsOnline();
  const theme = useTheme();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.warning }]}>
      <Text style={[styles.text, { color: theme.colors.primaryText }]} numberOfLines={1}>
        {t('calendar.offlineBanner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 4, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 12, fontWeight: '600' },
});
