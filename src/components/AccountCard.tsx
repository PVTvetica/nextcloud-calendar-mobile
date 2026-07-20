import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { AvatarImage } from '@/components/AvatarImage';
import type { Account } from '@/types';

interface Props {
  account: Account;
  isActive: boolean;
  onSetActive: () => void;
  onDelete: () => void;
}

export function AccountCard({ account, isActive, onSetActive, onDelete }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const hostname = (() => { try { return new URL(account.baseUrl).hostname; } catch { return account.baseUrl; } })();

  const cardBg = isActive
    ? (theme.colors.background === '#ffffff' ? '#e3f2fd' : '#1a2e45')
    : theme.colors.surface;
  const cardBorder = isActive ? theme.colors.primary : theme.colors.border;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <TouchableOpacity style={styles.info} onPress={onSetActive}>
        <AvatarImage account={account} size={44} />
        <View style={styles.textBlock}>
          <Text style={[styles.displayName, { color: theme.colors.text }]}>{account.displayName}</Text>
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>{account.username}</Text>
        </View>
        {isActive && <Text style={[styles.activeBadge, { color: theme.colors.primary }]}>{t('settings.accountActive')}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={[styles.deleteText, { color: theme.colors.danger }]}>{t('common.remove')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12, marginHorizontal: 16,
    marginBottom: 12, padding: 16, borderWidth: 1,
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  textBlock: { flex: 1 },
  displayName: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 11 },
  activeBadge: { fontSize: 12, fontWeight: '600' },
  deleteBtn: { alignSelf: 'flex-end' },
  deleteText: { fontSize: 14 },
});
