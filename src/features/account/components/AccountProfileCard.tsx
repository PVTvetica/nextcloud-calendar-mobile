import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react-native';
import { useTheme } from 'expo-router';

import { Button, Icon, Item, List, SectionHeader, Stack, Typography } from '@/ui/components';
import { syncAccountProfile } from '../hooks/useAccountProfileSync';
import { AccountProfileWebModal } from './AccountProfileWebModal';
import type { Account } from '@/types';

interface Props {
  account: Account;
  style?: object;
}

export function AccountProfileCard({ account, style }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [webOpen, setWebOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await syncAccountProfile(account);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }

  function handleCloseWeb() {
    setWebOpen(false);
    void refresh();
  }

  return (
    <Stack style={style} hAlign="stretch">
      <SectionHeader title={t('settings.account.profile')} />
      <List>
        <Item
          title={t('settings.account.displayName')}
          description={account.displayName || '—'}
        />
        <Item
          title={t('settings.account.email')}
          description={account.email || t('settings.account.emailMissing')}
        />
      </List>

      <Stack gap={8} padding={[0, 12]} hAlign="stretch">
        <Typography variant="caption" color="secondary">
          {t('settings.account.profileManagedHint')}
        </Typography>
        <Button
          variant="secondary"
          title={t('settings.account.openNextcloudProfile')}
          icon={<Icon size={18}><ExternalLink color={colors.text} /></Icon>}
          onPress={() => setWebOpen(true)}
        />
        <Button
          variant="ghost"
          size="small"
          title={t('settings.account.refreshProfile')}
          loading={refreshing}
          disabled={refreshing}
          onPress={refresh}
        />
      </Stack>

      <AccountProfileWebModal account={account} visible={webOpen} onClose={handleCloseWeb} />
    </Stack>
  );
}
