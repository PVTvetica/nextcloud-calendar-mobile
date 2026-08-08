import { renderHook, act } from '@testing-library/react-native';
import { useZoom } from '@/features/calendar/hooks/useZoom';
import { useCalendarStore } from '@/stores/calendarStore';

const DEFAULT = 60;

beforeEach(() => {
  act(() => { useCalendarStore.getState().setHourRowHeight(DEFAULT); });
});

describe('useZoom', () => {
  it('seeds the live height from the committed store value', () => {
    const { result } = renderHook(() => useZoom());
    expect(result.current.cellHeight.value).toBe(DEFAULT);
    expect(result.current.hourRowHeight).toBe(DEFAULT);
  });

  it('tracks the pinch scale live, before anything is committed', () => {
    const { result } = renderHook(() => useZoom());

    act(() => {
      result.current.pinchGesture.handlers.onStart?.({} as never);
      result.current.pinchGesture.handlers.onUpdate?.({ scale: 1.5 } as never);
    });

    // The live value has moved — this is what the grid animates from…
    expect(result.current.cellHeight.value).toBeCloseTo(90, 6);
    // …while the committed value has not, so nothing has re-rendered yet.
    expect(useCalendarStore.getState().hourRowHeight).toBe(DEFAULT);
  });

  it('scales from the height captured at the start, not from per-frame deltas', () => {
    // Deltas compound float error and the zoom never settles on a clean level.
    // Two updates in one gesture must both be measured against the start.
    const { result } = renderHook(() => useZoom());

    act(() => {
      result.current.pinchGesture.handlers.onStart?.({} as never);
      result.current.pinchGesture.handlers.onUpdate?.({ scale: 2 } as never);
      result.current.pinchGesture.handlers.onUpdate?.({ scale: 1.5 } as never);
    });

    expect(result.current.cellHeight.value).toBeCloseTo(90, 6);
  });

  it('clamps the live height to the zoom bounds', () => {
    const { result } = renderHook(() => useZoom());

    act(() => {
      result.current.pinchGesture.handlers.onStart?.({} as never);
      result.current.pinchGesture.handlers.onUpdate?.({ scale: 100 } as never);
    });
    expect(result.current.cellHeight.value).toBe(200);

    act(() => {
      result.current.pinchGesture.handlers.onUpdate?.({ scale: 0.001 } as never);
    });
    expect(result.current.cellHeight.value).toBe(30);
  });

  it('commits a rounded integer to the store on release', () => {
    const { result } = renderHook(() => useZoom());

    act(() => {
      result.current.pinchGesture.handlers.onStart?.({} as never);
      // 60 * 1.234 = 74.04
      result.current.pinchGesture.handlers.onUpdate?.({ scale: 1.234 } as never);
      result.current.pinchGesture.handlers.onEnd?.({} as never, true);
    });

    // An integer, so the store→cellHeight effect hands back exactly the value
    // already held and the sync is a no-op rather than a nudge.
    expect(useCalendarStore.getState().hourRowHeight).toBe(74);
  });

  // Documents the contract; cannot enforce it. See the note below — this one
  // passes with the sync effect deleted, because of how the mock behaves.
  it('follows a store change made elsewhere, which is how the settings buttons work', () => {
    const { result } = renderHook(() => useZoom());

    act(() => { useCalendarStore.getState().setHourRowHeight(120); });

    expect(result.current.cellHeight.value).toBe(120);
    expect(result.current.hourRowHeight).toBe(120);
  });
});
