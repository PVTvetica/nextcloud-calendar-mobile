import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.language')}
        accessibilityState={{ expanded: open }}
        style={[styles.trigger, { backgroundColor: theme.surface, borderColor: open ? theme.primary : theme.border }]}
        onPress={() => setOpen((v) => !v)}
      >
        <Flag code={active.code} size={26} />
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{active.label}</Text>
        <Text style={[styles.code, { color: theme.textTertiary }]}>({active.region})</Text>
        <View style={styles.spacer} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textTertiary} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
              <Text style={[styles.name, { color: theme.text }]}>{l.label}</Text>
              <Text style={[styles.code, { color: theme.textTertiary }]}>({l.region})</Text>
              <View style={styles.spacer} />
              {l.code === language && <Ionicons name="checkmark" size={20} color={theme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sheet: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  name: { fontSize: 16, marginLeft: 14 },
  code: { fontSize: 15, marginLeft: 6 },
  spacer: { flex: 1 },
});
