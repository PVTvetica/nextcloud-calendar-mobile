import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { LANGUAGES } from '@/i18n/languages';

export function LanguageSheet() {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);

  const active = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.label, { color: theme.text }]}>{t('common.language')}</Text>
        <View style={styles.value}>
          <Text style={{ color: theme.textSecondary }}>{active.label}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.textTertiary} style={{ marginLeft: 6 }} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={styles.option}
                onPress={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, { color: theme.text }]}>{l.label}</Text>
                {l.code === language && <Ionicons name="checkmark" size={18} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  label: { fontSize: 14, fontWeight: '600' },
  value: { flexDirection: 'row', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 32 },
  sheet: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  optionText: { fontSize: 16 },
});
