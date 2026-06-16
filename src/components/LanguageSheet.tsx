import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { LANGUAGES } from '@/i18n/languages';
import { Flag } from '@/i18n/flags';

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
        accessibilityLabel={t('common.language')}
        style={[styles.trigger, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="globe-outline" size={20} color={theme.textTertiary} />
        <Flag code={active.code} size={24} />
        <Text style={[styles.triggerText, { color: theme.text }]} numberOfLines={1}>
          {active.label}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.textTertiary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => {}}
          >
            {LANGUAGES.map((l, i) => (
              <TouchableOpacity
                key={l.code}
                accessibilityRole="button"
                accessibilityState={{ selected: l.code === language }}
                style={[
                  styles.option,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}
                onPress={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
              >
                <Flag code={l.code} size={30} />
                <Text style={[styles.optionText, { color: theme.text }]}>{l.label}</Text>
                {l.code === language && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  triggerText: { flex: 1, fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  sheet: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionText: { flex: 1, fontSize: 16 },
});
