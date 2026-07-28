import React, { useRef, useState, type ReactNode } from 'react';
import { View, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { ChevronUp, ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from 'expo-router';

import Typography from './Typography';
import AnimatedPressable from './AnimatedPressable';
import Spinner from './Spinner';

export interface SelectOption<T> {
  value: T;
  label: string;
  leading?: (size: number) => ReactNode;
  hint?: string;
}

interface SelectProps<T> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  variant?: 'row' | 'icon';
  icon?: (color: string) => ReactNode;
  busy?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
}

const ROW_HEIGHT = 58;
const MAX_VISIBLE = 5;
const MAX_LIST_HEIGHT = ROW_HEIGHT * MAX_VISIBLE;
const ICON_DROPDOWN_WIDTH = 240;

type Anchor = { x: number; y: number; width: number; height: number };

function Select<T>({
  value, options, onChange, variant = 'row', icon, busy, accessibilityLabel, disabled,
}: SelectProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<View>(null);
  const { height: screenH } = useWindowDimensions();

  const active = options.find((o) => o.value === value) ?? options[0];

  function toggle() {
    triggerRef.current?.measureInWindow?.((x, y, width, height) => setAnchor({ x, y, width, height }));
    setOpen((v) => !v);
  }

  function select(next: T) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

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
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ expanded: open }}
            hitSlop={10}
            onPress={toggle}
          >
            {busy ? <Spinner size="small" color="secondary" /> : icon?.(colors.textSecondary)}
          </AnimatedPressable>
        ) : (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ expanded: open, disabled }}
            disabled={disabled}
            style={[
              styles.trigger,
              { backgroundColor: colors.surface, borderColor: open ? colors.primary : colors.border },
            ]}
            onPress={toggle}
          >
            {active?.leading?.(26)}
            <Typography variant="body1" color="text" nowrap style={active?.leading ? styles.name : undefined}>
              {active?.label ?? ''}
            </Typography>
            {active?.hint ? (
              <Typography color={colors.textTertiary} weight="400" style={styles.hint}>{active.hint}</Typography>
            ) : null}
            <View style={styles.spacer} />
            {busy
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
            {options.map((option, i) => (
              <AnimatedPressable
                key={String(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: option.value === value }}
                style={[
                  styles.option,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
                onPress={() => select(option.value)}
              >
                {option.leading?.(30)}
                <Typography variant="body1" color="text" style={option.leading ? styles.name : undefined}>
                  {option.label}
                </Typography>
                {option.hint ? (
                  <Typography color={colors.textTertiary} weight="400" style={styles.hint}>{option.hint}</Typography>
                ) : null}
                <View style={styles.spacer} />
                {option.value === value && <Check size={20} color={colors.primary} />}
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
  hint: { fontSize: 15, marginLeft: 6 },
  spacer: { flex: 1 },
});

export default Select;
