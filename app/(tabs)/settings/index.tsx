import { View, Text, TouchableOpacity, Pressable, ScrollView, Alert, Modal, Linking, Image, ActivityIndicator } from 'react-native';
import { useDeferredValue, useState, useEffect, useCallback } from 'react';
import { styles } from '@/styles/settingsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadAccounts, deleteAccount, setActiveAccountId, clearActiveAccountId } from '@/api/auth';
import { useAppStore, type ThemePreference } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.pageHeader]}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>{t('settings.title')}</Text>
        <TouchableOpacity onPress={() => setAboutVisible(true)} hitSlop={8}>
          <Ionicons name="help-circle-outline" size={26} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={aboutVisible} transparent animationType="fade" onRequestClose={() => setAboutVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAboutVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => {}}>
            <Image source={require('../../../assets/icon.png')} style={styles.appIcon} />
            <Text style={[styles.modalAppName, { color: theme.text }]}>{t('settings.about.name')}</Text>
            <Text style={[styles.modalVersion, { color: theme.textSecondary }]}>{t('settings.version', { version: appVersion })}</Text>
            <Text style={[styles.modalDescription, { color: theme.textSecondary }]}>
              {t('settings.about.description')}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.chipActive, borderColor: theme.primary }]}
              onPress={() => Linking.openURL(GITHUB_URL)}
            >
              <Ionicons name="logo-github" size={18} color={theme.primaryText} />
              <Text style={[styles.modalBtnText, { color: theme.primaryText }]}>{t('settings.about.github')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
              onPress={() => Linking.openURL(ISSUES_URL)}
            >
              <Ionicons name="bug-outline" size={18} color={theme.text} />
              <Text style={[styles.modalBtnText, { color: theme.text }]}>{t('settings.about.reportBug')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAboutVisible(false)} style={styles.modalClose}>
              <Text style={[styles.modalCloseText, { color: theme.textTertiary }]}>{t('common.close')}</Text>
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
          <Text style={[styles.sectionHeader, styles.accordionTitle, { color: theme.textTertiary }]}>{t('settings.appearance')}</Text>
          <Ionicons name={appearanceOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
        </TouchableOpacity>
        {appearanceOpen && (
          <>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('settings.theme')}</Text>
          <View style={styles.themeRow}>
            {THEME_VALUES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.chip, borderColor: theme.border },
                  pendingTheme === value && {
                    backgroundColor: theme.chipActive,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => {
                  setPendingTheme(value);
                  setThemePreference(value);
                }}
              >
                {themeSwitching && pendingTheme === value ? (
                  <ActivityIndicator size="small" color={theme.primaryText} style={styles.themeChipSpinner} />
                ) : (
                  <Text
                    style={[
                      styles.themeChipText,
                      { color: theme.textSecondary },
                      pendingTheme === value && { color: theme.primaryText, fontWeight: '600' },
                    ]}
                  >
                    {t(THEME_LABEL_KEY[value])}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('common.language')}</Text>
          <LanguageSheet />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>{t('settings.weekStart')}</Text>
          <View style={styles.themeRow}>
            {([
              { labelKey: 'settings.sunday', value: 0 },
              { labelKey: 'settings.monday', value: 1 },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.chip, borderColor: theme.border },
                  pendingWeek === opt.value && {
                    backgroundColor: theme.chipActive,
                    borderColor: theme.primary,
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
                    { color: theme.textSecondary },
                    pendingWeek === opt.value && { color: theme.primaryText, fontWeight: '600' },
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.zoomHeader}>
            <Text style={[styles.cardLabel, { color: theme.text, marginBottom: 0 }]}>{t('settings.calendarZoom')}</Text>
            <TouchableOpacity onPress={() => setHourRowHeight(DEFAULT_ZOOM)} disabled={hourRowHeight === DEFAULT_ZOOM}>
              <Text style={[styles.resetText, { color: hourRowHeight === DEFAULT_ZOOM ? theme.textTertiary : theme.primary }]}>{t('settings.reset')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.zoomRow}>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
              onPress={() => setHourRowHeight(Math.max(hourRowHeight - 15, 30))}
              disabled={hourRowHeight <= 30}
            >
              <Text style={[styles.zoomBtnText, { color: hourRowHeight <= 30 ? theme.textTertiary : theme.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.zoomLabel, { color: theme.textSecondary }]}>{zoomLabel}</Text>
            <TouchableOpacity
              style={[styles.zoomBtn, { backgroundColor: theme.chip, borderColor: theme.border }]}
              onPress={() => setHourRowHeight(Math.min(hourRowHeight + 15, 200))}
              disabled={hourRowHeight >= 200}
            >
              <Text style={[styles.zoomBtnText, { color: hourRowHeight >= 200 ? theme.textTertiary : theme.text }]}>+</Text>
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
          <Text style={[styles.sectionHeader, styles.accordionTitle, { color: theme.textTertiary }]}>{t('settings.accounts')}</Text>
          <Ionicons name={accountsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
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
          style={[styles.addBtn, { borderColor: theme.primary }]}
          onPress={() => router.push('/(auth)/setup')}
        >
          <Text style={[styles.addBtnText, { color: theme.primary }]}>{t('settings.addAccount')}</Text>
        </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

