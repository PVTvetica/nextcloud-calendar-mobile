import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'expo-router';
import { X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

import { IconButton, Spinner, Stack, ViewContainer } from '@/ui/components';
import { basicAuthHeader, nextcloudProfileUrl } from '../utils/account';
import type { Account } from '@/types';

interface Props {
  account: Account;
  visible: boolean;
  onClose: () => void;
}

export function AccountProfileWebModal({ account, visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onShow={() => setLoading(true)}
    >
      <ViewContainer>
        <SafeAreaView edges={['top']} style={styles.flex}>
          <View style={styles.flex}>
            <WebView
              source={{
                uri: nextcloudProfileUrl(account.baseUrl),
                headers: { Authorization: basicAuthHeader(account) },
              }}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              onLoadEnd={() => setLoading(false)}
              style={{ backgroundColor: colors.background }}
            />
            {loading ? (
              <Stack
                vAlign="center"
                hAlign="center"
                backgroundColor={colors.background}
                pointerEvents="none"
                style={styles.overlay}
              >
                <Spinner size="large" />
              </Stack>
            ) : null}
            <View style={styles.closeSlot}>
              <IconButton
                variant="ghost"
                round
                glass
                size={40}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={22} color={colors.text} />
              </IconButton>
            </View>
          </View>
        </SafeAreaView>
      </ViewContainer>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill },
  closeSlot: { position: 'absolute', top: 8, left: 8 },
});
