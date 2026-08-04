import { type ReactNode, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { setActiveAccountId } from '@/services/nextcloud/auth';
import { useAccounts } from '@/hooks/useAccounts';
import { useAccountStore } from '@/stores/accountStore';
import { AvatarImage } from '@/components/AvatarImage';
import { haptic, ImpactFeedbackStyle } from '@/utils/haptics';
import { Select, type SelectOption } from '@/ui/components';
import { hostnameOf } from '../utils/account';

/** Vertical travel before a drag counts as a switch. */
const SWIPE_THRESHOLD = 40;

interface Props {
  trigger: ReactNode;
  footer?: (close: () => void) => ReactNode;
}

export function AccountSwitcher({ trigger, footer }: Props) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const setStoreId = useAccountStore((s) => s.setActiveAccountId);

  const handleChange = useCallback(async (id: string) => {
    await setActiveAccountId(id);
    setStoreId(id);
  }, [setStoreId]);

  /** Step through the accounts, wrapping at either end. */
  const cycle = useCallback((direction: 1 | -1) => {
    if (accounts.length < 2) return;
    const current = accounts.findIndex((a) => a.id === activeAccountId);
    const from = current === -1 ? 0 : current;
    const next = accounts[(from + direction + accounts.length) % accounts.length];
    if (!next || next.id === activeAccountId) return;
    haptic(ImpactFeedbackStyle.Light);
    void handleChange(next.id);
  }, [accounts, activeAccountId, handleChange]);

  // Vertical only: the drawer this sits in owns horizontal drags, and the tap
  // that opens the list has to keep working, so the pan has to travel before it
  // claims the gesture.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-20, 20])
        .failOffsetX([-15, 15])
        .onEnd((event) => {
          if (event.translationY < -SWIPE_THRESHOLD) scheduleOnRN(cycle, 1);
          else if (event.translationY > SWIPE_THRESHOLD) scheduleOnRN(cycle, -1);
        }),
    [cycle],
  );

  const options: SelectOption<string>[] = accounts.map((account) => ({
    value: account.id,
    label: account.displayName || account.username,
    description: hostnameOf(account.baseUrl),
    leading: (size) => <AvatarImage account={account} size={size} />,
  }));

  return (
    <Select<string>
      value={activeAccountId ?? accounts[0]?.id ?? ''}
      options={options}
      onChange={(id) => { void handleChange(id); }}
      trigger={
        <GestureDetector gesture={swipe}>
          <View>{trigger}</View>
        </GestureDetector>
      }
      footer={footer}
      accessibilityLabel={t('settings.accounts')}
    />
  );
}
