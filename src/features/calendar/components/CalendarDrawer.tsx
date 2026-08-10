import { useCallback } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from 'expo-router';

import { setActiveAccountId } from '@/services/nextcloud/auth';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountStore } from '@/stores/accountStore';
import { haptic } from '@/utils/haptics';
import { AvatarImage } from '@/components/AvatarImage';
import { Item, List, SectionHeader, Stack, Typography } from '@/ui/components';
import type { Account, CalendarMeta } from '@/types';

import { CalendarDrawerRow } from './CalendarDrawerRow';

const SWIPE_THRESHOLD = 40;

interface CalendarDrawerProps {
  open: boolean;
  drawerAnim: Animated.Value;
  overlayAnim: Animated.Value;
  drawerWidth: number;
  insets: { top: number };
  activeAccount: Account | null;
  calendars: CalendarMeta[];
  hiddenCalendarIds: string[];
  notifDisabledCalendarIds: string[];
  toggleCalendarVisibility: (id: string) => void;
  toggleCalendarNotifications: (id: string) => void;
  onClose: () => void;
  onOpenAccount: () => void;
}

export function CalendarDrawer({
  open,
  drawerAnim,
  overlayAnim,
  drawerWidth,
  insets,
  activeAccount,
  calendars,
  hiddenCalendarIds,
  notifDisabledCalendarIds,
  toggleCalendarVisibility,
  toggleCalendarNotifications,
  onClose,
  onOpenAccount,
}: CalendarDrawerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const safeInsets = useSafeAreaInsets();

  const accounts = useAccounts();
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const setStoreId = useAccountStore((s) => s.setActiveAccountId);

  const cycleAccount = useCallback((dir: 1 | -1) => {
    if (accounts.length < 2) return;
    const idx = accounts.findIndex((a) => a.id === activeAccountId);
    const next = accounts[((idx < 0 ? 0 : idx) + dir + accounts.length) % accounts.length];
    if (!next || next.id === activeAccountId) return;
    haptic();
    void setActiveAccountId(next.id).then(() => setStoreId(next.id));
  }, [accounts, activeAccountId, setStoreId]);

  const accountSwipe = Gesture.Pan()
    .activeOffsetY([-16, 16])
    .failOffsetX([-16, 16])
    .onEnd((e) => {
      if (e.translationY <= -SWIPE_THRESHOLD) scheduleOnRN(cycleAccount, 1);
      else if (e.translationY >= SWIPE_THRESHOLD) scheduleOnRN(cycleAccount, -1);
    });

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
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            transform: [{ translateX: drawerAnim }],
            paddingTop: insets.top + 12,
            backgroundColor: colors.background,
          },
        ]}
      >
        <GestureDetector gesture={accountSwipe}>
          <View style={styles.header}>
            <List>
              <Item
                onPress={onOpenAccount}
                leading={activeAccount ? <AvatarImage account={activeAccount} size={40} /> : undefined}
                title={
                  <Typography variant="body1" numberOfLines={1} ellipsizeMode="tail">
                    {activeAccount?.displayName ?? activeAccount?.username ?? '—'}
                  </Typography>
                }
                description={
                  <Typography variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="middle">
                    {activeAccount?.username ?? ''}
                  </Typography>
                }
                trailing={<ChevronRight size={20} color={colors.textTertiary} />}
              />
            </List>
          </View>
        </GestureDetector>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: safeInsets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title={t('calendar.drawerCalendars')} />
          {calendars.length === 0 ? (
            <Stack padding={[8, 4]}>
              <Typography variant="caption" color="secondary">
                {t('calendar.drawerNoCalendars')}
              </Typography>
            </Stack>
          ) : (
            <List>
              {calendars.map((cal) => (
                <CalendarDrawerRow
                  key={cal.id}
                  calendar={cal}
                  visible={!hiddenCalendarIds.includes(cal.id)}
                  notifies={!notifDisabledCalendarIds.includes(cal.id)}
                  onToggleVisibility={() => toggleCalendarVisibility(cal.id)}
                  onToggleNotifications={() => toggleCalendarNotifications(cal.id)}
                />
              ))}
            </List>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', zIndex: 10 },
  drawer: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    zIndex: 11,
    shadowColor: '#000', shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 10,
  },
  header: { paddingHorizontal: 12, paddingBottom: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12 },
});
