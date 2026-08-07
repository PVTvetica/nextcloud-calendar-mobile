import { renderHook, act } from '@testing-library/react-native';
import { useEventDrag } from '@/features/calendar/hooks/useEventDrag';
import { layoutDay } from '@/features/calendar/utils/eventLayout';
import { SNAP_MINUTES } from '@/features/calendar/utils/dragMath';
import type { GridEvent } from '@/features/calendar/utils/toGridEvents';
import type { CalendarEvent } from '@/types';

// The gesture lives on the page (Task 7), so it is exercised here by calling
// its handlers directly -- `gesture.handlers.onStart/.onUpdate/.onEnd` are the
// same callbacks `.onStart(...)` etc. attach on the builder -- rather than via
// GestureDetector, which needs a native runtime this suite does not have.
// jest.setup.js's `scheduleOnRN` mock runs its callback synchronously, so
// calling a handler applies its effect (a `begin`/`commit`/`cancel` call)
// immediately.
//
// `onStart` must flush in its own `act` before `onUpdate`/`onEnd` run:
// `begin` commits the hit event via React state (`setDrag`), and `commit`
// later reads it back through `live.current.drag`, which is only refreshed
// when the hook body re-runs on that state update. Bundling all three calls
// into one `act` -- as a real gesture never would, since real frames land
// between them -- lets `onEnd` read the pre-`begin` (null) `drag` and skip
// the commit, which would fail these tests for a reason that has nothing to
// do with the drag maths they're checking.

// hourRowHeight chosen so 1px === 1 minute across the 24h grid (60 * 24 =
// 1440, the day's minute count) -- keeps every pixel/minute figure below
// legible without a conversion step.
const HOUR_ROW_HEIGHT = 60;
const COLUMN_WIDTH = 100;

function gridEvent(uid: string, startHour: number, durationMin: number): GridEvent {
  const start = new Date(2026, 7, 7, startHour, 0);
  const end = new Date(start.getTime() + durationMin * 60_000);
  const e: CalendarEvent = {
    uid, href: `/${uid}.ics`, calendarId: 'c1', accountId: 'a1',
    summary: uid, dtstart: start, dtend: end,
    allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
  };
  return { title: uid, start, end, color: e.color, _event: e };
}

function setup(events: GridEvent[], onMoveEvent = jest.fn()) {
  const layouts = [layoutDay(events)];
  const { result } = renderHook(() =>
    useEventDrag({
      dates: [events[0].start],
      layouts,
      hourRowHeight: HOUR_ROW_HEIGHT,
      columnWidth: COLUMN_WIDTH,
      onMoveEvent,
    })
  );
  return { result, onMoveEvent };
}

describe('useEventDrag', () => {
  it('a gesture with no movement commits nothing', () => {
    const event = gridEvent('a', 9, 60); // 09:00-10:00, top=540px, height=60px
    const { result, onMoveEvent } = setup([event]);

    // y=570 is the box's vertical middle -- outside both 20% resize zones,
    // so this is a plain move.
    act(() => { result.current.gesture.handlers.onStart?.({ x: 50, y: 570 } as never); });
    act(() => {
      result.current.gesture.handlers.onUpdate?.({ translationX: 0, translationY: 0 } as never);
      result.current.gesture.handlers.onEnd?.({ translationX: 0, translationY: 0 } as never, true);
    });

    expect(onMoveEvent).not.toHaveBeenCalled();
  });

  it('a move commits the snapped delta', () => {
    const event = gridEvent('a', 9, 60); // 09:00-10:00
    const { result, onMoveEvent } = setup([event]);

    act(() => { result.current.gesture.handlers.onStart?.({ x: 50, y: 570 } as never); });
    act(() => {
      // 32px of translationY snaps to 30 minutes (round((32/60)*60/15)*15).
      result.current.gesture.handlers.onUpdate?.({ translationX: 0, translationY: 32 } as never);
      result.current.gesture.handlers.onEnd?.({ translationX: 0, translationY: 32 } as never, true);
    });

    expect(onMoveEvent).toHaveBeenCalledTimes(1);
    const [calledEvent, nextStart, nextEnd] = onMoveEvent.mock.calls[0];
    expect(calledEvent).toBe(event);
    expect(nextStart).toEqual(new Date(2026, 7, 7, 9, 30));
    expect(nextEnd).toEqual(new Date(2026, 7, 7, 10, 30));
  });

  it('a resize that overshoots the floor commits the clamped duration rather than nothing', () => {
    // 60-minute box: top=540px, height=60px. MIN_RESIZE_DURATION_MIN (45) <=
    // 60, so the 20%-of-height resize zones (12px each) are active.
    const event = gridEvent('a', 9, 60);
    const { result, onMoveEvent } = setup([event]);

    // y=545 is 5px into the top zone [540, 552) -> resizeStart.
    act(() => { result.current.gesture.handlers.onStart?.({ x: 50, y: 545 } as never); });
    act(() => {
      // Drag the start handle down 90 minutes -- far past the 45-minute
      // (durationMin - SNAP_MINUTES) floor that keeps a valid box.
      result.current.gesture.handlers.onUpdate?.({ translationX: 0, translationY: 90 } as never);
      result.current.gesture.handlers.onEnd?.({ translationX: 0, translationY: 90 } as never, true);
    });

    // Must match what the ghost showed mid-drag: clamped to exactly one
    // SNAP_MINUTES step, not rejected outright (resolveDraggedBounds would
    // return null for the unclamped 90-minute delta -- see dragMath.ts).
    expect(onMoveEvent).toHaveBeenCalledTimes(1);
    const [, nextStart, nextEnd] = onMoveEvent.mock.calls[0];
    expect(nextEnd).toEqual(event.end);
    expect(nextStart).toEqual(new Date(nextEnd.getTime() - SNAP_MINUTES * 60_000));
  });

  it('a resizeEnd overshoot in the other direction also clamps instead of committing nothing', () => {
    const event = gridEvent('a', 9, 60); // 09:00-10:00, top=540px, height=60px
    const { result, onMoveEvent } = setup([event]);

    // y=595 is 7px into the bottom zone (595 > 540 + 60*0.8=588) -> resizeEnd.
    act(() => { result.current.gesture.handlers.onStart?.({ x: 50, y: 595 } as never); });
    act(() => {
      // Drag the end handle up 90 minutes -- far past the 45-minute
      // (SNAP_MINUTES - durationMin, i.e. -45) floor.
      result.current.gesture.handlers.onUpdate?.({ translationX: 0, translationY: -90 } as never);
      result.current.gesture.handlers.onEnd?.({ translationX: 0, translationY: -90 } as never, true);
    });

    expect(onMoveEvent).toHaveBeenCalledTimes(1);
    const [, nextStart, nextEnd] = onMoveEvent.mock.calls[0];
    expect(nextStart).toEqual(event.start);
    expect(nextEnd).toEqual(new Date(nextStart.getTime() + SNAP_MINUTES * 60_000));
  });

  it('does nothing when the page has not been measured yet (columnWidth 0)', () => {
    const event = gridEvent('a', 9, 60);
    const { result: unmeasured } = renderHook(() =>
      useEventDrag({
        dates: [event.start],
        layouts: [layoutDay([event])],
        hourRowHeight: HOUR_ROW_HEIGHT,
        columnWidth: 0,
        onMoveEvent: jest.fn(),
      })
    );

    expect(() => {
      act(() => {
        unmeasured.current.gesture.handlers.onStart?.({ x: 0, y: 570 } as never);
      });
    }).not.toThrow();
    expect(unmeasured.current.drag).toBeNull();
  });
});
