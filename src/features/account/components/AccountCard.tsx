import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { CircleCheck, Trash2 } from 'lucide-react-native';
import { AvatarImage } from '@/shared/components/AvatarImage';
import { Stack, Typography, Icon, IconButton, AnimatedPressable } from '@/ui/components';
import type { Account } from '@/types';

interface Props {
  account: Account;
  isActive: boolean;
  onSetActive: () => void;
  onDelete: () => void;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AccountCard({ account, isActive, onSetActive, onDelete }: Props) {
  const { colors } = useTheme();

  return (
    <Stack
      card
      direction="horizontal"
      vAlign="center"
      hAlign="center"
      gap={12}
      padding={12}
      backgroundColor={isActive ? `${colors.primary}14` : undefined}
      borderColor={isActive ? colors.primary : undefined}
      borderWidth={isActive ? 1.5 : undefined}
      style={{ marginHorizontal: 16, marginBottom: 12 }}
    >
      <AnimatedPressable onPress={onSetActive} accessibilityRole="button" style={{ flex: 1 }}>
        <Stack direction="horizontal" vAlign="center" hAlign="center" gap={12}>
          <AvatarImage account={account} size={44} />
          <Stack gap={2} flex>
            <Typography variant="body1" nowrap>{account.displayName}</Typography>
            <Typography variant="caption" color="secondary" nowrap>{hostnameOf(account.baseUrl)}</Typography>
          </Stack>
          {isActive ? (
            <Icon size={22}><CircleCheck color={colors.primary} /></Icon>
          ) : null}
        </Stack>
      </AnimatedPressable>

      <IconButton size={40} onPress={onDelete}>
        <Trash2 size={20} color={colors.danger} />
      </IconButton>
    </Stack>
  );
}
