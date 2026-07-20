import type { ReactElement } from 'react';
import { render as rtlRender, fireEvent } from '@testing-library/react-native';
import { ThemeWrapper } from '../helpers/theme';

const render = (ui: ReactElement, opts?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(ui, { wrapper: ThemeWrapper, ...opts });
import { LanguageSheet } from '../../src/components/LanguageSheet';
import { useAppStore } from '../../src/stores/appStore';
import i18n from '../../src/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('LanguageSheet', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useAppStore.setState({ language: 'en' });
  });

  it('shows the active language label on the trigger row', () => {
    const { getByText } = render(<LanguageSheet />);
    expect(getByText('English')).toBeTruthy();
  });

  it('opens the modal and lists all languages', () => {
    const { getByText, queryByText } = render(<LanguageSheet />);
    expect(queryByText('Deutsch')).toBeNull();
    fireEvent.press(getByText('English'));
    expect(getByText('Deutsch')).toBeTruthy();
    expect(getByText('Français')).toBeTruthy();
    expect(getByText('Español')).toBeTruthy();
  });

  it('selecting a language updates the store', () => {
    const { getByText } = render(<LanguageSheet />);
    fireEvent.press(getByText('English'));
    fireEvent.press(getByText('Français'));
    expect(useAppStore.getState().language).toBe('fr');
  });
});
