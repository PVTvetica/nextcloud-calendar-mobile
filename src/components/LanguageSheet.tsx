import { useRef, useState, useDeferredValue } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@react-navigation/native';
import { LANGUAGES, type AppLanguage } from '@/i18n/languages';
import { Flag } from '@/i18n/flags';

const ROW_HEIGHT = 58;
const MAX_VISIBLE = 5;
const MAX_LIST_HEIGHT = ROW_HEIGHT * MAX_VISIBLE;
const ICON_DROPDOWN_WIDTH = 240;

type Anchor = { x: number; y: number; width: number; height: number };

export function LanguageSheet({ variant = 'row' }: { variant?: 'row' | 'icon' } = {}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<View>(null);

  const deferredLanguage = useDeferredValue(language);
  const switching = language !== deferredLanguage;

  const active = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  function toggle() {
    triggerRef.current?.measureInWindow?.((x, y, width, height) => setAnchor({ x, y, width, height }));
    setOpen((v) => !v);
  }

  function select(code: AppLanguage) {
    setOpen(false);
    if (code !== language) setLanguage(code);
  }

  const { height: screenH } = useWindowDimensions();
  const a = anchor;
  let dropdownPos: Record<string, number>;
  if (!a) {
    dropdownPos = { top: 120, left: 16, right: 16 };
  } else if (variant === 'icon') {
    dropdownPos = { top: a.y + a.height + 8, left: Math.max(8, a.x + a.width - ICON_DROPDOWN_WIDTH), width: ICON_DROPDOWN_WIDTH };
  } else {
    const openUp = a.y + a.height + MAX_LIST_HEIGHT + 8 > screenH;
    dropdownPos = openUp
      ? { bottom: screenH - a.y + 8, left: a.x, width: a.width }
      : { top: a.y + a.height + 8, left: a.x, width: a.width };
  }

  return (
    <View>
      {variant === 'icon' ? (
        <TouchableOpacity
          ref={triggerRef}
          accessibilityRole="button"
          accessibilityLabel={t('common.language')}
          accessibilityState={{ expanded: open }}
          hitSlop={10}
          onPress={toggle}
        >
          {switching
            ? <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            : <Ionicons name="globe-outline" size={24} color={theme.colors.textSecondary} />}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          ref={triggerRef}
          accessibilityRole="button"
          accessibilityLabel={t('common.language')}
          accessibilityState={{ expanded: open }}
          style={[styles.trigger, { backgroundColor: theme.colors.surface, borderColor: open ? theme.colors.primary : theme.colors.border }]}
          onPress={toggle}
        >
          <Flag code={active.code} size={26} />
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>{active.label}</Text>
          <Text style={[styles.code, { color: theme.colors.textTertiary }]}>({active.region})</Text>
          <View style={styles.spacer} />
          {switching
            ? <ActivityIndicator size="small" color={theme.colors.primary} />
            : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textTertiary} />}
        </TouchableOpacity>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={[styles.dropdown, dropdownPos, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT }} bounces={false}>
            {LANGUAGES.map((l, i) => (
              <TouchableOpacity
                key={l.code}
                accessibilityRole="button"
                accessibilityState={{ selected: l.code === language }}
                style={[
                  styles.option,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                ]}
                onPress={() => select(l.code)}
              >
                <Flag code={l.code} size={30} />
                <Text style={[styles.name, { color: theme.colors.text }]}>{l.label}</Text>
                <Text style={[styles.code, { color: theme.colors.textTertiary }]}>({l.region})</Text>
                <View style={styles.spacer} />
                {l.code === language && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  dropdown: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
