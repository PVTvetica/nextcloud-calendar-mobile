import { useTranslation } from 'react-i18next';

import { Item, List, SectionHeader, Stack, Typography } from '@/ui/components';
import type { Account } from '@/types';

interface Props {
  account: Account;
  style?: object;
}

export function AccountProfileCard({ account, style }: Props) {
  const { t } = useTranslation();

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

      <Stack padding={[0, 12]} hAlign="stretch">
        <Typography variant="caption" color="secondary">
          {t('settings.account.profileManagedHint')}
        </Typography>
      </Stack>
    </Stack>
  );
}
