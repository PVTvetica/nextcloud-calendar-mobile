import { useRef, useState, useDeferredValue } from 'react';
import { View, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Globe, ChevronUp, ChevronDown, Check } from 'lucide-react-native';
import CountryFlag from 'react-native-country-flag';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@react-navigation/native';
import { Typography, AnimatedPressable, Spinner } from '@/ui/components';
import { LANGUAGES, type AppLanguage } from '@/i18n/languages';

function Flag({ code, size = 28 }: { code: AppLanguage; size?: number }) {
  const region = LANGUAGES.find((l) => l.code === code)?.region ?? 'US';
  return (
    <View style={[styles.flagCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <CountryFlag isoCode={region.toLowerCase()} size={size} />
    </View>
  );
}

const ROW_HEIGHT = 58;
const MAX_VISIBLE = 5;
const MAX_LIST_HEIGHT = ROW_HEIGHT * MAX_VISIBLE;
const ICON_DROPDOWN_WIDTH = 240;

type Anchor = { x: number; y: number; width: number; height: number };

export function LanguageSheet({ variant = 'row' }: { variant?: 'row' | 'icon' } = {}) {
  const { colors } = useTheme();
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
      <View ref={triggerRef} collapsable={false}>
        {variant === 'icon' ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t('common.language')}
            accessibilityState={{ expanded: open }}
            hitSlop={10}
            onPress={toggle}
          >
            {switching
              ? <Spinner size="small" color="secondary" />
              : <Globe size={24} color={colors.textSecondary} />}
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={t('common.language')}
            accessibilityState={{ expanded: open }}
            style={[styles.trigger, { backgroundColor: colors.surface, borderColor: open ? colors.primary : colors.border }]}
            onPress={toggle}
          >
            <Flag code={active.code} size={26} />
            <Typography variant="body1" color="text" nowrap style={styles.name}>{active.label}</Typography>
            <Typography color={colors.textTertiary} weight="400" style={styles.code}>({active.region})</Typography>
            <View style={styles.spacer} />
            {switching
              ? <Spinner size="small" />
              : open
                ? <ChevronUp size={20} color={colors.textTertiary} />
                : <ChevronDown size={20} color={colors.textTertiary} />}
          </AnimatedPressable>
        )}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View style={[styles.dropdown, dropdownPos, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT }} bounces={false}>
            {LANGUAGES.map((l, i) => (
              <AnimatedPressable
                key={l.code}
                accessibilityRole="button"
                accessibilityState={{ selected: l.code === language }}
                style={[
                  styles.option,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
                onPress={() => select(l.code)}
              >
                <Flag code={l.code} size={30} />
                <Typography variant="body1" color="text" style={styles.name}>{l.label}</Typography>
                <Typography color={colors.textTertiary} weight="400" style={styles.code}>({l.region})</Typography>
                <View style={styles.spacer} />
                {l.code === language && <Check size={20} color={colors.primary} />}
              </AnimatedPressable>
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
  flagCircle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});
