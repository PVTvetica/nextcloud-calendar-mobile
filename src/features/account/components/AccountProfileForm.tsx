import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Stack, TextField, Typography } from '@/ui/components';
import { describeMutationError } from '@/services/shared/errors';
import { useUpdateAccount } from '../hooks/useMutateAccount';
import { AccountFieldError, diffProfile, type FieldErrors } from '../utils/account';
import type { Account } from '@/types';

interface Props {
  account: Account;
  style?: object;
}

export function AccountProfileForm({ account, style }: Props) {
  const { t } = useTranslation();
  const update = useUpdateAccount(account);

  const [displayName, setDisplayName] = useState(account.displayName);
  const [email, setEmail] = useState(account.email ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(account.displayName);
    setEmail(account.email ?? '');
  }, [account.displayName, account.email]);

  const dirty = useMemo(
    () => Object.keys(diffProfile(account, { displayName, email })).length > 0,
    [account, displayName, email],
  );

  async function handleSave() {
    setErrors({});
    setFormError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ displayName, email });
      setSaved(true);
    } catch (error) {
      if (error instanceof AccountFieldError) setErrors(error.fields);
      else setFormError(describeMutationError(error));
    }
  }

  return (
    <Stack card gap={12} padding={16} hAlign="stretch" style={style}>
      <Typography variant="body1">{t('settings.account.profile')}</Typography>

      <TextField
        label={t('settings.account.displayName')}
        value={displayName}
        onChangeText={(value) => { setDisplayName(value); setSaved(false); }}
        error={errors.displayName ? t(`settings.account.errors.${errors.displayName}`) : undefined}
      />

      <TextField
        label={t('settings.account.email')}
        value={email}
        onChangeText={(value) => { setEmail(value); setSaved(false); }}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        error={errors.email ? t(`settings.account.errors.${errors.email}`) : undefined}
      />
      <Typography variant="caption" color="secondary">
        {t('settings.account.emailHint')}
      </Typography>

      {formError ? <Typography variant="caption" color="danger">{formError}</Typography> : null}
      {saved ? (
        <Typography variant="caption" color="primary">{t('settings.account.saved')}</Typography>
      ) : null}

      <Button
        variant="primary"
        title={t('settings.account.save')}
        loading={update.isPending}
        disabled={!dirty || update.isPending}
        onPress={handleSave}
      />
    </Stack>
  );
}
