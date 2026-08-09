import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from 'expo-router';

/** Hour boundaries 1..23. Midnight needs no line: it is the grid's own top edge. */
const HOUR_LINES = Array.from({ length: 23 }, (_, i) => i + 1);
/** Half-hour boundaries, the fainter set between them. */
const HALF_LINES = Array.from({ length: 24 }, (_, i) => i);

/**
 * Every horizontal rule of the grid, drawn once for the whole view.
 *
 * These lines used to live inside each DayColumn — 24 flex cells per column,
 * each holding a half-hour child. Identical in every column and every page, and
 * all of them re-laid out on every frame of a pinch: in week view with the
 * pager's buffer that came to roughly a thousand flex nodes per frame, which is
 * what made the live zoom stutter. They span the full width and do not move
 * when the pager slides horizontally, so one global set is enough.
 *
 * Positioned as percentages of the 24-hour span — pure time fractions,
 * independent of the zoom — so they follow the animated container height with
 * no animated node of their own.
 */
function GridLinesImpl() {
  const { colors } = useTheme();
  return (
    <View testID="grid-lines" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {HALF_LINES.map((hour) => (
        <View
          key={`half-${hour}`}
          testID={`half-hour-line-${hour}`}
          style={[styles.line, { top: `${((hour + 0.5) / 24) * 100}%`, backgroundColor: colors.borderSubtle }]}
        />
      ))}
      {HOUR_LINES.map((hour) => (
        <View
          key={`hour-${hour}`}
          testID={`hour-line-${hour}`}
          style={[styles.line, { top: `${(hour / 24) * 100}%`, backgroundColor: colors.border }]}
        />
      ))}
    </View>
  );
}

export const GridLines = memo(GridLinesImpl);

const styles = StyleSheet.create({
  // Hairlines, absolutely positioned: leaves that take no part in their
  // siblings' layout, unlike the flex cells they replace.
  line: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
});
