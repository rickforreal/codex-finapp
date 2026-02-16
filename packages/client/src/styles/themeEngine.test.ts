import { describe, expect, it } from 'vitest';

import { ThemeId, type ThemeDefinition } from '@finapp/shared';

import { applyTheme } from './themeEngine';

const theme: ThemeDefinition = {
  id: ThemeId.Dark,
  name: 'Dark',
  description: 'test',
  version: '1.0.0',
  isHighContrast: false,
  defaultForApp: false,
  tokens: {
    color: {
      neutral50: '#010101',
      neutral100: '#020202',
      neutral200: '#030303',
      neutral300: '#040404',
      neutral400: '#050505',
      neutral500: '#060606',
      neutral600: '#070707',
      neutral700: '#080808',
      neutral800: '#090909',
      neutral900: '#0a0a0a',
      appBackground: '#000000',
      surfacePrimary: '#111111',
      surfaceSecondary: '#222222',
      surfaceMuted: '#333333',
      overlay: '#444444',
      borderSubtle: '#555555',
      borderPrimary: '#666666',
      borderStrong: '#777777',
      textPrimary: '#ffffff',
      textSecondary: '#eeeeee',
      textMuted: '#dddddd',
      textInverse: '#000000',
      focusRing: '#00ff00',
      interactivePrimary: '#123456',
      interactivePrimaryHover: '#123457',
      interactiveSecondary: '#123458',
      interactiveSecondaryHover: '#123459',
      positive: '#16a34a',
      negative: '#dc2626',
      warning: '#d97706',
      info: '#2563eb',
      chartGrid: '#bbbbbb',
      chartAxis: '#aaaaaa',
      chartText: '#999999',
      chartTooltipBackground: '#888888',
      chartTooltipBorder: '#777777',
      chartTooltipText: '#666666',
      brandNavy: '#555555',
      brandBlue: '#444444',
      assetStocks: '#333333',
      assetBonds: '#222222',
      assetCash: '#111111',
      mcBandOuter: '#101010',
      mcBandInner: '#202020',
      stressBase: '#303030',
      stressScenarioA: '#404040',
      stressScenarioB: '#505050',
      stressScenarioC: '#606060',
      stressScenarioD: '#707070',
    },
    typography: {
      fontSans: 'ibmPlexSans',
      fontMono: 'ibmPlexMono',
      fontSizeXs: '10px',
      fontSizeSm: '12px',
      fontSizeMd: '14px',
      fontSizeLg: '16px',
      fontSizeXl: '20px',
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      letterSpacingWide: '0.2em',
    },
    spacing: {
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
      xxl: '16px',
    },
    radius: {
      sm: '2px',
      md: '4px',
      lg: '6px',
      xl: '8px',
      pill: '9999px',
    },
    border: {
      widthThin: '1px',
      widthBase: '1px',
      widthThick: '2px',
    },
    shadow: {
      panel: 'none',
      popover: 'none',
      focus: 'none',
    },
    motion: {
      durationFastMs: 100,
      durationNormalMs: 150,
      durationSlowMs: 250,
      easingStandard: 'ease',
    },
    state: {
      editedCellBackground: '#112233',
      preservedRowBackground: '#223344',
      staleBackground: '#334455',
      staleText: '#445566',
      selectedCellOutline: '#556677',
    },
    chart: {
      manualLine: '#665544',
      manualAreaTop: '#776655',
      manualAreaBottom: '#887766',
      mcMedianLine: '#998877',
      mcBandOuter: '#aa9988',
      mcBandInner: '#bbaa99',
    },
  },
};

describe('themeEngine', () => {
  it('applies CSS variables for active theme', () => {
    const styleState = new Map<string, string>();
    const attrs = new Map<string, string>();
    Object.assign(globalThis, {
      document: {
        documentElement: {
          style: {
            setProperty: (name: string, value: string) => {
              styleState.set(name, value);
            },
            getPropertyValue: (name: string) => styleState.get(name) ?? '',
          },
          setAttribute: (name: string, value: string) => {
            attrs.set(name, value);
          },
          getAttribute: (name: string) => attrs.get(name) ?? null,
        },
      },
    });

    applyTheme(theme);

    expect(styleState.get('--theme-color-brand-navy')).toBe('#555555');
    expect(styleState.get('--theme-chart-mc-median-line')).toBe('#998877');
    expect(attrs.get('data-theme-id')).toBe(ThemeId.Dark);
  });
});
