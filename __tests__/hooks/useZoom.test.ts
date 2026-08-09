import { renderHook, act } from '@testing-library/react-native';
import { useZoom } from '@/features/calendar/hooks/useZoom';
import { useCalendarStore } from '@/stores/calendarStore';

const DEFAULT = 60;

beforeEach(() => {
  act(() => { useCalendarStore.getState().setHourRowHeight(DEFAULT); });
});

// The pinch gesture itself lives in TimeGridView now — an anchored zoom has to
// move the scroll offset in the same frame it changes the height, and the
// ScrollView is that component's to drive. The arithmetic it runs is pure and
// covered in __tests__/features/calendar/zoomAnchor.test.ts. What is left here
// is what this hook still owns: the seed, the commit, and the one-way sync.
describe('useZoom', () => {
  it('seeds the live height from the committed store value', () => {
    const { result } = renderHook(() => useZoom());
    expect(result.current.cellHeight.value).toBe(DEFAULT);
    expect(result.current.hourRowHeight).toBe(DEFAULT);
  });

  it('rounds the height a gesture landed on before persisting it', () => {
    const { result } = renderHook(() => useZoom());

    act(() => { result.current.commitZoom(74.04); });

    // An integer, so the store→cellHeight effect hands back exactly the value
    // already held and the sync is a no-op rather than a nudge.
    expect(useCalendarStore.getState().hourRowHeight).toBe(74);
  });

  it('commits whatever the gesture reached, without clamping it again', () => {
    // Clamping belongs to scaledCellHeight, which the gesture already applied;
    // doing it twice would be two places to keep in step.
    const { result } = renderHook(() => useZoom());

    act(() => { result.current.commitZoom(155.5); });

    expect(useCalendarStore.getState().hourRowHeight).toBe(156);
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
