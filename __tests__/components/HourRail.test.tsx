import React from 'react';
import { render as rtlRender } from '@testing-library/react-native';
import { ThemeWrapper } from '../helpers/theme';
import { HourRail } from '@/features/calendar/components/HourRail';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: ThemeWrapper });

describe('HourRail', () => {
  it('renders one label per hour of the day', () => {
    const { getByText, queryByText } = render(<HourRail hourRowHeight={60} />);
    expect(getByText('0:00')).toBeTruthy();
    expect(getByText('9:00')).toBeTruthy();
    expect(getByText('23:00')).toBeTruthy();
    expect(queryByText('24:00')).toBeNull();
  });

  it('sizes each hour block from hourRowHeight', () => {
    const { getByTestId } = render(<HourRail hourRowHeight={80} />);
    expect(getByTestId('hour-block-9')).toHaveStyle({ height: 80 });
  });
});
