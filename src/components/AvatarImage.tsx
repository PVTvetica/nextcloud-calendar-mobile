import { Image, View, Text, StyleSheet } from 'react-native';
import { useAvatar } from '@/hooks/useAvatar';
import { useTheme } from '@/hooks/useTheme';
import type { Account } from '@/types';

interface Props {
  account: Account;
  size: number;
}

function getInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AvatarImage({ account, size }: Props) {
  const theme = useTheme();
  const { data: avatarUri } = useAvatar(account);

  const borderRadius = size / 2;
  const fontSize = Math.round(size * 0.38);

  if (avatarUri) {
    return (
      <Image
        source={{ uri: avatarUri }}
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius, backgroundColor: theme.primary },
      ]}
    >
      <Text style={{ color: '#fff', fontSize, fontWeight: '600', lineHeight: size }}>
        {getInitials(account.displayName)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
