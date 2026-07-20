import { View, Text, TouchableOpacity, Pressable, ScrollView, Alert, Modal, Linking, Image, ActivityIndicator } from 'react-native';
import { useDeferredValue, useState, useEffect, useCallback } from 'react';
import { styles } from '@/styles/settingsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadAccounts, deleteAccount, setActiveAccountId, clearActiveAccountId } from '@/services/nextcloud/auth';
import { useAppStore, type ThemePreference } from '@/stores/appStore';
import { useTheme } from '@react-navigation/native';
import { AccountCard } from '@/components/AccountCard';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { LanguageSheet } from '@/components/LanguageSheet';

const GITHUB_URL = 'https://github.com/SoluceTechnologies/nextcloud-calendar-mobile';
const ISSUES_URL = 'https://github.com/SoluceTechnologies/nextcloud-calendar-mobile/issues/new';

const THEME_VALUES: ThemePreference[] = ['system', 'light', 'dark'];
const THEME_LABEL_KEY: Record<ThemePreference, string> = {
  system: 'settings.themeSystem',
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
};

export default function SettingsScreen() {
  const router = useRouter();
  const [aboutVisible, setAboutVisible] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(true);
  const appVersion = Constants.expoConfig?.version ?? '—';
  const queryClient = useQueryClient();
  const theme = useTheme();
  const { t } = useTranslation();
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const setStoreId = useAppStore((s) => s.setActiveAccountId);
  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const hourRowHeight = useAppStore((s) => s.hourRowHeight);
  const setHourRowHeight = useAppStore((s) => s.setHourRowHeight);
  const weekStartsOn = useAppStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useAppStore((s) => s.setWeekStartsOn);

  const [pendingTheme, setPendingTheme] = useState(themePreference);
  const [pendingWeek, setPendingWeek] = useState(weekStartsOn);
  useEffect(() => { setPendingTheme(themePreference); }, [themePreference]);
  useEffect(() => { setPendingWeek(weekStartsOn); }, [weekStartsOn]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setAppearanceOpen(false);
        setAccountsOpen(true);
      };
    }, [])
  );

  const deferredThemePref = useDeferredValue(themePreference);
  const themeSwitching = themePreference !== deferredThemePref;

  const DEFAULT_ZOOM = 60;
  const zoomLabel =
    hourRowHeight <= 45 ? t('settings.zoom.compact')
    : hourRowHeight <= 75 ? t('settings.zoom.normal')
    : hourRowHeight <= 120 ? t('settings.zoom.expanded')
    : t('settings.zoom.large');

  const tabBarHeight = useBottomTabBarHeight();

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: loadAccounts,
  });

  async function handleSetActive(id: string) {
    await setActiveAccountId(id);
    setStoreId(id);
    queryClient.invalidateQueries({ queryKey: [id] });
  }

  function handleDelete(id: string, displayName: string) {
    Alert.alert(t('settings.removeTitle'), t('settings.removeMsg', { name: displayName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'), style: 'destructive',
        onPress: async () => {
          await deleteAccount(id);
          const remaining = accounts.filter((a) => a.id !== id);
          queryClient.setQueryData(['accounts'], remaining);
          queryClient.removeQueries({ queryKey: [id] });
          queryClient.removeQueries({ queryKey: ['avatar', id] });
          if (activeAccountId === id) {
            const next = remaining[0]?.id ?? null;
            if (next) {
              await setActiveAccountId(next);
              setStoreId(next);
            } else {
              await clearActiveAccountId();
              setStoreId(null);
              router.replace('/(auth)/setup');
              return;
            }
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.pageHeader]}>
        <Text style={[styles.pageTitle, { color: theme.colors.text }]}>{t('settings.title')}</Text>
        <TouchableOpacity onPress={() => setAboutVisible(true)} hitSlop={8}>
          <Ionicons name="help-circle-outline" size={26} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAboutVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => {}}>
            <Image source={require('../../../assets/icon.png')} style={styles.appIcon} />
            <Text style={[styles.modalAppName, { color: theme.colors.text }]}>{t('settings.about.name')}</Text>
            <Text style={[styles.modalVersion, { color: theme.colors.textSecondary }]}>{t('settings.version', { version: appVersion })}</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              {t('settings.about.description')}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.chipActive, borderColor: theme.colors.primary }]}
              onPress={() => Linking.openURL(GITHUB_URL)}
            >
              <Ionicons name="logo-github" size={18} color={theme.colors.primaryText} />
              <Text style={[styles.modalBtnText, { color: theme.colors.primaryText }]}>{t('settings.about.github')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.chip, borderColor: theme.colors.border }]}
              onPress={() => Linking.openURL(ISSUES_URL)}
            >
              <Ionicons name="bug-outline" size={18} color={theme.colors.text} />
              <Text style={[styles.modalBtnText, { color: theme.colors.text }]}>{t('settings.about.reportBug')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAboutVisible(false)} style={styles.modalClose}>
              <Text style={[styles.modalCloseText, { color: theme.colors.textTertiary }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setAppearanceOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: appearanceOpen }}
        >
          <Text style={[styles.sectionHeader, styles.accordionTitle, { color: theme.colors.textTertiary }]}>{t('settings.appearance')}</Text>
          <Ionicons name={appearanceOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
        {appearanceOpen && (
          <>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.text }]}>{t('settings.theme')}</Text>
          <View style={styles.themeRow}>
            {THEME_VALUES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.colors.chip, borderColor: theme.colors.border },
                  pendingTheme === value && {
                    backgroundColor: theme.colors.chipActive,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => {
                  setPendingTheme(value);
                  setThemePreference(value);
                }}
              >
                {themeSwitching && pendingTheme === value ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryText} style={styles.themeChipSpinner} />
                ) : (
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: theme.colors.textSecondary },
                      pendingTheme === value && { color: theme.colors.primaryText, fontWeight: '600' },
                    ]}
                  >
                    {t(THEME_LABEL_KEY[value])}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.text }]}>{t('common.language')}</Text>
          <LanguageSheet />
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.cardLabel, { color: theme.colors.text }]}>{t('settings.weekStart')}</Text>
          <View style={styles.themeRow}>
            {([
              { labelKey: 'settings.sunday', value: 0 },
              { labelKey: 'settings.monday', value: 1 },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.colors.chip, borderColor: theme.colors.border },
                  pendingWeek === opt.value && {
                    backgroundColor: theme.colors.chipActive,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => {
                  setPendingWeek(opt.value);
                  setWeekStartsOn(opt.value);
                }}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: theme.colors.textSecondary },
                    pendingWeek === opt.value && { color: theme.colors.primaryText, fontWeight: '600' },
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.zoomHeader}>
            <Text style={[styles.cardLabel, { color: theme.colors.text, marginBottom: 0 }]}>{t('settings.calendarZoom')}</Text>
            <TouchableOpacity onPress={() => setHourRowHeight(DEFAULT_ZOOM)} disabled={hourRowHeight === DEFAULT_ZOOM}>
              <Text style={[styles.resetText, { color: hourRowHeight === DEFAULT_ZOOM ? theme.colors.textTertiary : theme.colors.primary }]}>{t('settings.reset')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.zoomRow}>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: theme.colors.chip, borderColor: theme.colors.border }]}
              onPress={() => setHourRowHeight(Math.max(hourRowHeight - 15, 30))}
              disabled={hourRowHeight <= 30}
            >
              <Text style={[styles.zoomBtnText, { color: hourRowHeight <= 30 ? theme.colors.textTertiary : theme.colors.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.zoomLabel, { color: theme.colors.textSecondary }]}>{zoomLabel}</Text>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: theme.colors.chip, borderColor: theme.colors.border }]}
              onPress={() => setHourRowHeight(Math.min(hourRowHeight + 15, 200))}
              disabled={hourRowHeight >= 200}
            >
              <Text style={[styles.zoomBtnText, { color: hourRowHeight >= 200 ? theme.colors.textTertiary : theme.colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
          </>
        )}

        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setAccountsOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: accountsOpen }}
        >
          <Text style={[styles.sectionHeader, styles.accordionTitle, { color: theme.colors.textTertiary }]}>{t('settings.accounts')}</Text>
          <Ionicons name={accountsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
        {accountsOpen && (
          <>
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            isActive={account.id === activeAccountId}
            onSetActive={() => handleSetActive(account.id)}
            onDelete={() => handleDelete(account.id, account.displayName)}
          />
        ))}
        <TouchableOpacity
          style={[styles.addBtn, { borderColor: theme.colors.primary }]}
          onPress={() => router.push('/(auth)/setup')}
        >
          <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>{t('settings.addAccount')}</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

