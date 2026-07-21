import {
  Animated,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarImage } from '@/shared/components/AvatarImage';
import { useTheme } from '@react-navigation/native';
import type { Account, CalendarMeta } from '@/types';

const DRAWER_WIDTH = 280;

interface CalendarDrawerProps {
  open: boolean;
  drawerAnim: Animated.Value;
  overlayAnim: Animated.Value;
  insets: { top: number };
  activeAccount: Account | null;
  calendars: CalendarMeta[];
  hiddenCalendarIds: string[];
  toggleCalendarVisibility: (id: string) => void;
  onClose: () => void;
  onNavigateSettings: () => void;
}

export function CalendarDrawer({
  open,
  drawerAnim,
  overlayAnim,
  insets,
  activeAccount,
  calendars,
  hiddenCalendarIds,
  toggleCalendarVisibility,
  onClose,
  onNavigateSettings,
}: CalendarDrawerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const safeInsets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const [drawerHeight, setDrawerHeight] = useState(0);

  const scrollHeight = drawerHeight > 0 && headerHeight > 0
    ? drawerHeight - headerHeight - safeInsets.bottom - 16
    : undefined;

  return (
    <>
      <Animated.View
        style={[styles.overlay, { opacity: overlayAnim }]}
        pointerEvents={open ? 'auto' : 'none'}
        onStartShouldSetResponder={() => true}
        onResponderRelease={onClose}
      />
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        onLayout={(e) => setDrawerHeight(e.nativeEvent.layout.height)}
        style={[
          styles.drawer,
          { transform: [{ translateX: drawerAnim }], paddingTop: insets.top, backgroundColor: theme.colors.surface },
        ]}
      >
        <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <Text style={[styles.drawerSection, { color: theme.colors.textTertiary }]}>{t('calendar.drawerAccount')}</Text>
          <View style={styles.drawerAccountRow}>
            {activeAccount && <AvatarImage account={activeAccount} size={48} />}
            <View style={styles.drawerAccountText}>
              <Text style={[styles.drawerAccount, { color: theme.colors.text }]} numberOfLines={1}>
                {activeAccount?.displayName ?? activeAccount?.username ?? '—'}
              </Text>
              <Text style={[styles.drawerAccountSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {activeAccount?.username}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.drawerSettingsBtn} onPress={onNavigateSettings}>
            <Text style={[styles.drawerSettingsBtnText, { color: theme.colors.primary }]}>{t('calendar.manageAccounts')}</Text>
          </TouchableOpacity>
          <View style={[styles.drawerDivider, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.drawerSection, { color: theme.colors.textTertiary }]}>{t('calendar.drawerCalendars')}</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={scrollHeight != null ? { height: scrollHeight } : { flex: 1 }}
        >
          {calendars.map((cal) => {
            const visible = !hiddenCalendarIds.includes(cal.id);
            return (
              <View key={cal.id} style={styles.drawerCalRow}>
                <View style={[styles.calDot, { backgroundColor: cal.color }]} />
                <Text style={[styles.drawerCalName, { color: theme.colors.text }]} numberOfLines={1}>
                  {cal.displayName}
                </Text>
                <Switch
                  value={visible}
                  onValueChange={() => toggleCalendarVisibility(cal.id)}
                  trackColor={{ true: cal.color, false: theme.colors.border }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 10 },
  drawer: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: DRAWER_WIDTH,
    zIndex: 11, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 10,
  },
  drawerSection: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  drawerAccount: { fontSize: 16, fontWeight: '700' },
  drawerAccountSub: { fontSize: 13, marginTop: 2 },
  drawerSettingsBtn: { marginTop: 8 },
  drawerSettingsBtnText: { fontSize: 13 },
  drawerDivider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
  drawerCalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  calDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  drawerCalName: { flex: 1, fontSize: 14 },
  drawerAccountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  drawerAccountText: { flex: 1 },
});
