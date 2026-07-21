import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import AnimatedPressable from './AnimatedPressable';
import Typography from './Typography';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <AnimatedPressable animated={false} onPress={onClose} style={styles.backdrop}>
        <View
          onStartShouldSetResponder={() => true}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title ? (
            <Typography variant="title" style={styles.title}>
              {title}
            </Typography>
          ) : null}
          {children}
        </View>
      </AnimatedPressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: { marginBottom: 4 },
});

export default React.memo(Sheet);
