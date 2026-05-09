import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { styles } from '@/styles/settingsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadAccounts, deleteAccount, setActiveAccountId, clearActiveAccountId } from '@/api/auth';
import { useAppStore, type ThemePreference } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { AccountCard } from '@/components/AccountCard';

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const setStoreId = useAppStore((s) => s.setActiveAccountId);
  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const hourRowHeight = useAppStore((s) => s.hourRowHeight);
  const setHourRowHeight = useAppStore((s) => s.setHourRowHeight);
  const weekStartsOn = useAppStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useAppStore((s) => s.setWeekStartsOn);

  const DEFAULT_ZOOM = 60;
  const zoomLabel = hourRowHeight <= 45 ? 'Compact' : hourRowHeight <= 75 ? 'Normal' : hourRowHeight <= 120 ? 'Expanded' : 'Large';

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
    Alert.alert('Remove Account', `Remove "${displayName}" from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        <Text style={[styles.sectionHeader, { color: theme.textTertiary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.chip, borderColor: theme.border },
                  themePreference === opt.value && {
                    backgroundColor: theme.chipActive,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setThemePreference(opt.value)}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: theme.textSecondary },
                    themePreference === opt.value && { color: theme.primaryText, fontWeight: '600' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.text }]}>Week Starts On</Text>
          <View style={styles.themeRow}>
            {([
              { label: 'Sunday', value: 0 },
              { label: 'Monday', value: 1 },
            ] as const).map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[
                  styles.themeChip,
                  { backgroundColor: theme.chip, borderColor: theme.border },
                  weekStartsOn === opt.value && {
                    backgroundColor: theme.chipActive,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setWeekStartsOn(opt.value)}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: theme.textSecondary },
                    weekStartsOn === opt.value && { color: theme.primaryText, fontWeight: '600' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.zoomHeader}>
            <Text style={[styles.cardLabel, { color: theme.text, marginBottom: 0 }]}>Calendar Zoom</Text>
            <TouchableOpacity onPress={() => setHourRowHeight(DEFAULT_ZOOM)} disabled={hourRowHeight === DEFAULT_ZOOM}>
              <Text style={[styles.resetText, { color: hourRowHeight === DEFAULT_ZOOM ? theme.textTertiary : theme.primary }]}>Reset</Text>
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

        <Text style={[styles.sectionHeader, { color: theme.textTertiary }]}>Accounts</Text>
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
          <Text style={[styles.addBtnText, { color: theme.primary }]}>+ Add Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

