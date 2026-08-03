import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { deleteAccount, setActiveAccountId, clearActiveAccountId } from '@/services/nextcloud/auth';
import { useAccounts, refreshAccounts } from '@/hooks/useAccounts';
import { ClearDatabaseForAccount } from '@/database/DatabaseProvider';
import { storage } from '@/storage';
import { useAccountStore } from '@/stores/accountStore';
import { AccountCard } from '@/features/account/components/AccountCard';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { Button, Stack } from '@/ui/components';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const setStoreId = useAccountStore((s) => s.setActiveAccountId);
  const accounts = useAccounts();

  async function handleSetActive(id: string) {
    await setActiveAccountId(id);
    setStoreId(id);
  }

  function handleDelete(id: string, displayName: string) {
    Alert.alert(t('settings.removeTitle'), t('settings.removeMsg', { name: displayName }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'), style: 'destructive',
        onPress: async () => {
          await deleteAccount(id);
          await ClearDatabaseForAccount(id).catch(() => undefined);
          storage.remove(`avatar:${id}`);
          const remaining = await refreshAccounts();
          if (activeAccountId === id) {
            const next = remaining[0]?.id ?? null;
            if (next) {
              await setActiveAccountId(next);
              setStoreId(next);
            } else {
              await clearActiveAccountId();
              setStoreId(null);
              router.replace('/(auth)/setup');
            }
          }
        },
      },
    ]);
  }

  return (
    <SettingsPage title={t('settings.accounts')}>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          isActive={account.id === activeAccountId}
          onSetActive={() => handleSetActive(account.id)}
          onDelete={() => handleDelete(account.id, account.displayName)}
        />
      ))}
      <Stack padding={[16, 8]}>
        <Button
          variant="ghost"
          dashed
          title={t('settings.addAccount')}
          onPress={() => router.push('/(auth)/setup')}
        />
      </Stack>
    </SettingsPage>
  );
}
