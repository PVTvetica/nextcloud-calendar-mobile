import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import Typography from './Typography';
import IconButton from './IconButton';


interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

function ScreenHeader({ title, onBack, left, right }: ScreenHeaderProps) {
  const { colors } = useTheme();

  const leftSlot = onBack ? (
    <IconButton variant="plain" size={40} onPress={onBack}>
      <ChevronLeft size={24} color={colors.primary} />
    </IconButton>
  ) : (
    left
  );

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: colors.headerBackground, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.side}>{leftSlot}</View>
      {title ? (
        <Typography variant="title" align="center" nowrap style={styles.title}>
          {title}
        </Typography>
      ) : (
        <View style={styles.title} />
      )}
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 56,
    borderBottomWidth: 1,
  },
  side: { minWidth: 56, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { flex: 1 },
});

export default React.memo(ScreenHeader);
