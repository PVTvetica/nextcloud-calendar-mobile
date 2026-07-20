import { useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { validateCredentials } from '@/services/nextcloud/caldav';
import { saveAccount, setActiveAccountId } from '@/services/nextcloud/auth';
import { fetchUserInfo } from '@/services/nextcloud/nextcloud';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@react-navigation/native';
import { QrLoginScanner } from '@/components/QrLoginScanner';
import type { NcLoginData } from '@/components/QrLoginScanner';
import type { Account } from '@/types';
import { useTranslation } from 'react-i18next';
import { LanguageSheet } from '@/components/LanguageSheet';

export default function SetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const setStoreId = useAppStore((s) => s.setActiveAccountId);
  const { t } = useTranslation();

  const [baseUrl, setBaseUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  async function connectWith(params: {
    baseUrl: string;
    username: string;
    appPassword: string;
    displayName: string;
  }) {
    setError(null);
    let normalizedUrl = params.baseUrl.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    setLoading(true);
    try {
      const { davUserId } = await validateCredentials({
        baseUrl: normalizedUrl,
        username: params.username,
        appPassword: params.appPassword,
      });
      const userInfo = await fetchUserInfo({
        baseUrl: normalizedUrl,
        username: params.username,
        appPassword: params.appPassword,
        davUserId,
      });
      const account: Account = {
        id: Crypto.randomUUID(),
        displayName: params.displayName || params.username,
        baseUrl: normalizedUrl,
        username: params.username,
        appPassword: params.appPassword,
        davUserId,
        timezone: userInfo.timezone,
        email: userInfo.email,
      };
      await saveAccount(account);
      await setActiveAccountId(account.id);
      setStoreId(account.id);
      queryClient.setQueryData<Account[]>(['accounts'], (old = []) =>
        old.find((a) => a.id === account.id) ? old : [...old, account]
      );
      router.replace('/(tabs)/calendar');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes('401') || msg.includes('auth')
          ? t('setup.errors.invalidCreds')
          : t('setup.errors.connect', { msg })
      );
    } finally {
      setLoading(false);
    }
  }

  function handleAdd() {
    if (!baseUrl || !username || !appPassword) {
      setError(t('setup.errors.required'));
      return;
    }
    connectWith({ baseUrl, username, appPassword, displayName });
  }

  function handleQrScanned(data: NcLoginData) {
    setShowScanner(false);
    setBaseUrl(data.server);
    setUsername(data.user);
    setAppPassword(data.password);

    connectWith({ baseUrl: data.server, username: data.user, appPassword: data.password, displayName: '' });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <Text style={[styles.brandName, { color: theme.colors.primary }]}>{t('setup.brand')}</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>{t('setup.title')}</Text>

          <TouchableOpacity
            style={[styles.qrBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowScanner(true)}
            disabled={loading}
          >
            <Ionicons name="qr-code-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.qrBtnText}>{t('setup.scanQr')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerLabel, { color: theme.colors.textTertiary }]}>{t('setup.orManual')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>{t('setup.serverUrl')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('setup.placeholders.serverUrl')}
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={baseUrl}
            onChangeText={setBaseUrl}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>{t('setup.username')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('setup.placeholders.username')}
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={[styles.label, { color: theme.colors.text }]}>{t('setup.appPassword')}</Text>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TextInput
              style={[styles.inputInner, { color: theme.colors.text }]}
              placeholder={t('setup.placeholders.appPassword')}
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={appPassword}
              onChangeText={setAppPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.colors.text }]}>
            {t('setup.displayName')}{' '}
            <Text style={{ color: theme.colors.textTertiary, fontWeight: '400' }}>{t('setup.optional')}</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder={t('setup.placeholders.displayName')}
            placeholderTextColor={theme.colors.textTertiary}
            value={displayName}
            onChangeText={setDisplayName}
          />

          {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={handleAdd}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{t('setup.connect')}</Text>}
          </TouchableOpacity>

          <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
            {t('setup.hint')}
          </Text>

        </ScrollView>

        <Text style={[styles.footer, { color: theme.colors.textTertiary }]}>
          {t('setup.footer')}
        </Text>

      </KeyboardAvoidingView>

      <View style={[styles.langCorner, { top: insets.top + 8 }]}>
        <LanguageSheet variant="icon" />
      </View>

      <QrLoginScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleQrScanned}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  langCorner: { position: 'absolute', right: 16, zIndex: 10 },
  flex: { flex: 1 },
  content: { padding: 24, paddingTop: 24 },
  brandName: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 28 },
  qrBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, paddingVertical: 16, marginBottom: 8,
  },
  qrBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 10, marginBottom:0 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 13 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop:20 },
  input: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10,
  },
  inputInner: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16 },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 13 },
  error: { marginTop: 14, fontSize: 14 },
  button: {
    borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', marginTop: 28,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, marginTop: 20, lineHeight: 19 },
  footer: { fontSize: 12, textAlign: 'center', paddingBottom: 16, paddingTop: 8 },
});
