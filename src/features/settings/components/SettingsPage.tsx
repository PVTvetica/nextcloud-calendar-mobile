import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ScreenHeader, ViewContainer } from '@/ui/components';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function SettingsPage({ title, children }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ViewContainer>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.column}>
          <ScreenHeader title={title} onBack={() => router.back()} />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.column}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </ViewContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 8 },
  column: { width: '100%', maxWidth: 700, alignSelf: 'center' },
});
