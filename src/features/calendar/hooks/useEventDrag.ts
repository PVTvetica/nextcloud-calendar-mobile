import { useCallback, useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { SNAP_MINUTES, resolveDraggedBounds, snapDeltaMinutes } from '../utils/dragMath';
import { hitTestEvent, type DragMode } from '../utils/hitTest';
import type { PositionedEvent } from '../utils/eventLayout';
import type { GridEvent } from '../utils/toGridEvents';

const LONG_PRESS_MS = 300;
const DAY_MINUTES = 1440;

const MODE_MOVE = 0;
const MODE_RESIZE_START = 1;
const MODE_RESIZE_END = 2;

interface DragState {
  event: GridEvent;
  mode: DragMode;
  columnIndex: number;
}

interface Args {
  dates: Date[];
  layouts: PositionedEvent[][];
  hourRowHeight: number;
  columnWidth: number;
  onMoveEvent?: (event: GridEvent, nextStart: Date, nextEnd: Date) => void;
}

/**
 * One drag gesture for a whole page.
 *
 * Arming is delegated to `activateAfterLongPress` rather than composing a
 * LongPress with a Pan by hand: the pan simply does not activate until the
 * finger has been held still, so the vertical scroll and the pager keep
 * priority before that and lose it after. Hand-rolled arbitration is what cost
 * us a dead scroll in the grid's first pass.
 */
export function useEventDrag({
  dates,
  layouts,
  hourRowHeight,
  columnWidth,
  onMoveEvent,
}: Args) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const top = useSharedValue(0);
  const height = useSharedValue(0);
  const left = useSharedValue(0);

  // Where the ghost started, so onUpdate can position it absolutely from the
  // gesture's total translation rather than accumulating per-frame deltas.
  const topBase = useSharedValue(0);
  const heightBase = useSharedValue(0);
  const leftBase = useSharedValue(0);
  /** The drag mode, readable from the UI thread. `drag` is React state. */
  const modeFlag = useSharedValue(MODE_MOVE);

  // Read inside callbacks without re-creating the gesture on every render.
  const live = useRef({ dates, layouts, hourRowHeight, columnWidth, onMoveEvent, drag });
  live.current = { dates, layouts, hourRowHeight, columnWidth, onMoveEvent, drag };

  const begin = useCallback((x: number, y: number) => {
    const s = live.current;
    // Before the page's first onLayout, columnWidth is 0 and x / 0 is NaN,
    // which fails both bounds checks below (NaN < 0 and NaN >= length are
    // both false) and would otherwise fall through to hitTestEvent with NaN.
    if (s.columnWidth <= 0) return;
    const columnIndex = Math.floor(x / s.columnWidth);
    if (columnIndex < 0 || columnIndex >= s.dates.length) return;

    const hit = hitTestEvent(
      x - columnIndex * s.columnWidth,
      y,
      s.layouts[columnIndex] ?? [],
      s.columnWidth,
      s.hourRowHeight * 24,
    );
    if (!hit) return;

    const startMin = hit.event.start.getHours() * 60 + hit.event.start.getMinutes();
    const durationMin = (hit.event.end.getTime() - hit.event.start.getTime()) / 60_000;
    const startPx = (startMin / DAY_MINUTES) * s.hourRowHeight * 24;
    const heightPx = (durationMin / DAY_MINUTES) * s.hourRowHeight * 24;
    const leftPx = columnIndex * s.columnWidth;

    topBase.value = startPx;
    heightBase.value = heightPx;
    leftBase.value = leftPx;
    modeFlag.value =
      hit.mode === 'move'
        ? MODE_MOVE
        : hit.mode === 'resizeStart'
          ? MODE_RESIZE_START
          : MODE_RESIZE_END;

    top.value = startPx;
    height.value = heightPx;
    left.value = leftPx;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDrag({ event: hit.event, mode: hit.mode, columnIndex });
    // top/height/left/topBase/heightBase/leftBase/modeFlag are listed here (and
    // below, on `gesture`) even though nothing reads their *identity* — every
    // access is a `.value` read or write, so any instance of the container
    // works equally well. Real Reanimated's useSharedValue always returns the
    // same ref, so in production these deps never change and this memo never
    // re-runs. This project's Reanimated test mock hands back a fresh object
    // per render, so under test they do change every render, recreating
    // `begin`/`gesture` on every render. That's wasted work, not a bug: the
    // earlier `syncNode`-in-a-layout-effect incident (see TimeGridView.tsx)
    // came from an *effect* keyed on a churning shared value calling setState
    // every run, which schedules another render, which churns it again --
    // there is no effect here keyed on any of these, so there is nothing to
    // loop.
  }, [top, height, left, topBase, heightBase, leftBase, modeFlag]);

  const commit = useCallback((deltaMinutes: number, deltaColumns: number) => {
    const s = live.current;
    const current = s.drag;
    setDrag(null);
    if (!current || !s.onMoveEvent) return;
    if (deltaMinutes === 0 && deltaColumns === 0) return;

    const deltaDays = deltaColumns * DAY_MINUTES;
    const durationMin = (current.event.end.getTime() - current.event.start.getTime()) / 60_000;

    // Mirror onUpdate's pixel clamp (which never lets the ghost's height fall
    // below one SNAP_MINUTES step) in minutes, so the delta handed to
    // resolveDraggedBounds always matches what the ghost showed. Without
    // this, an overshoot the ghost quietly floors mid-drag hits
    // resolveDraggedBounds' own "shrank below one step" rejection on commit
    // and the event snaps back to its original size with no explanation.
    // resolveDraggedBounds itself is untouched: it's a ported contract with
    // its own tests, and other callers may rely on its rejection behaviour.
    const clampedDelta =
      current.mode === 'resizeStart'
        ? Math.min(deltaMinutes, durationMin - SNAP_MINUTES)
        : current.mode === 'resizeEnd'
          ? Math.max(deltaMinutes, SNAP_MINUTES - durationMin)
          : deltaMinutes;

    const bounds =
      current.mode === 'move'
        ? resolveDraggedBounds(
            current.event.start,
            current.event.end,
            deltaMinutes + deltaDays,
            deltaMinutes + deltaDays,
            SNAP_MINUTES,
          )
        : current.mode === 'resizeStart'
          ? resolveDraggedBounds(current.event.start, current.event.end, clampedDelta, 0, SNAP_MINUTES)
          : resolveDraggedBounds(current.event.start, current.event.end, 0, clampedDelta, SNAP_MINUTES);

    if (!bounds) return;
    s.onMoveEvent(current.event, bounds.start, bounds.end);
  }, []);

  const cancel = useCallback(() => setDrag(null), []);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_MS)
        .onStart((e) => {
          scheduleOnRN(begin, e.x, e.y);
        })
        .onUpdate((e) => {
          const snapped = snapDeltaMinutes(e.translationY, hourRowHeight, SNAP_MINUTES);
          const offsetPx = (snapped / 60) * hourRowHeight;
          const minPx = (SNAP_MINUTES / 60) * hourRowHeight;

          if (modeFlag.value === MODE_MOVE) {
            top.value = topBase.value + offsetPx;
            height.value = heightBase.value;
            left.value = leftBase.value + Math.round(e.translationX / columnWidth) * columnWidth;
            return;
          }

          // A resize never changes column, and never shrinks below one step.
          left.value = leftBase.value;
          if (modeFlag.value === MODE_RESIZE_START) {
            const clamped = Math.min(offsetPx, heightBase.value - minPx);
            top.value = topBase.value + clamped;
            height.value = heightBase.value - clamped;
          } else {
            top.value = topBase.value;
            height.value = Math.max(minPx, heightBase.value + offsetPx);
          }
        })
        .onEnd((e) => {
          const snapped = snapDeltaMinutes(e.translationY, hourRowHeight, SNAP_MINUTES);
          const columnDelta =
            modeFlag.value === MODE_MOVE ? Math.round(e.translationX / columnWidth) : 0;
          scheduleOnRN(commit, snapped, columnDelta);
        })
        .onFinalize(() => {
          scheduleOnRN(cancel);
        }),
    // The shared values below are safe to list despite the mock-vs-production
    // gap explained on `begin`'s own dependency list above: no effect here is
    // keyed on any of them, so a churning identity under test just rebuilds
    // this gesture, it does not loop.
    [
      begin, commit, cancel, hourRowHeight, columnWidth,
      top, height, left, topBase, heightBase, leftBase, modeFlag,
    ]
  );

  return { gesture, drag, top, height, left };
}
