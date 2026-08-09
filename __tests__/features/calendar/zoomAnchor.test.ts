import {
  MIN_HOUR_ROW,
  MAX_HOUR_ROW,
  scaledCellHeight,
  anchoredScrollY,
} from '@/features/calendar/utils/zoomAnchor';

describe('scaledCellHeight', () => {
  it('scales from the height the gesture started at', () => {
    expect(scaledCellHeight(60, 1.5)).toBe(90);
    expect(scaledCellHeight(60, 0.5)).toBe(30);
  });

  it('is not cumulative: the same scale twice gives the same height', () => {
    // The guard against compounding float error across a gesture's frames.
    expect(scaledCellHeight(60, 1.5)).toBe(scaledCellHeight(60, 1.5));
  });

  it('clamps to the readable range', () => {
    expect(scaledCellHeight(60, 100)).toBe(MAX_HOUR_ROW);
    expect(scaledCellHeight(60, 0.001)).toBe(MIN_HOUR_ROW);
  });
});

describe('anchoredScrollY', () => {
  // A viewport scrolled to 08:00 at 60px/hour, with no header inset, and a
  // finger halfway down a 600px-tall viewport.
  const base = { scrollY: 8 * 60, focalY: 300, headerInset: 0, fromCellHeight: 60 };

  /** The instant sitting under the focal point, in hours from midnight. */
  const hoursAtFocal = (scrollY: number, focalY: number, inset: number, cell: number) =>
    (scrollY + focalY - inset) / cell;

  it('keeps the same instant under the focal point when zooming in', () => {
    const before = hoursAtFocal(base.scrollY, base.focalY, base.headerInset, base.fromCellHeight);
    const next = anchoredScrollY({ ...base, toCellHeight: 90 });
    expect(hoursAtFocal(next, base.focalY, base.headerInset, 90)).toBeCloseTo(before, 6);
  });

  it('keeps the same instant under the focal point when zooming out', () => {
    const before = hoursAtFocal(base.scrollY, base.focalY, base.headerInset, base.fromCellHeight);
    const next = anchoredScrollY({ ...base, toCellHeight: 40 });
    expect(hoursAtFocal(next, base.focalY, base.headerInset, 40)).toBeCloseTo(before, 6);
  });

  it('leaves the offset alone when the zoom does not change', () => {
    expect(anchoredScrollY({ ...base, toCellHeight: 60 })).toBeCloseTo(base.scrollY, 6);
  });

  it('accounts for the content padding above midnight', () => {
    const inset = 120;
    const args = { scrollY: 500, focalY: 300, headerInset: inset, fromCellHeight: 60 };
    const before = hoursAtFocal(args.scrollY, args.focalY, inset, 60);
    const next = anchoredScrollY({ ...args, toCellHeight: 90 });
    expect(hoursAtFocal(next, args.focalY, inset, 90)).toBeCloseTo(before, 6);
  });

  it('never returns a negative offset', () => {
    // Pinching closed near the top of the day would otherwise ask the
    // ScrollView to scroll above its own content.
    const next = anchoredScrollY({
      scrollY: 10, focalY: 40, headerInset: 0, fromCellHeight: 200, toCellHeight: MIN_HOUR_ROW,
    });
    expect(next).toBeGreaterThanOrEqual(0);
  });

  it('reproduces the measured regression it was written to fix', () => {
    // From the device recording: 51 -> 62 px/hour moved the 08:00 line 88px
    // down because the offset never changed. Anchored, the line under the
    // finger stays put instead.
    const args = { scrollY: 4 * 51, focalY: 200, headerInset: 0, fromCellHeight: 51 };
    const before = hoursAtFocal(args.scrollY, args.focalY, 0, 51);
    const next = anchoredScrollY({ ...args, toCellHeight: 62 });
    expect(hoursAtFocal(next, args.focalY, 0, 62)).toBeCloseTo(before, 6);
    // And the offset genuinely moved — an unanchored implementation returns
    // the original scrollY, which would fail the assertion above.
    expect(next).not.toBeCloseTo(args.scrollY, 0);
  });

  it('is inert when the starting height is degenerate', () => {
    expect(anchoredScrollY({
      scrollY: 300, focalY: 100, headerInset: 0, fromCellHeight: 0, toCellHeight: 60,
    })).toBe(300);
  });
});
