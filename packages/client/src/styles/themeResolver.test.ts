import { describe, expect, it } from 'vitest';

import { ThemeId, type ThemeDefinition } from '@finapp/shared';

import { compileThemeSlotVars } from './themeResolver';

const theme: ThemeDefinition = {
  id: ThemeId.Light,
  name: 'Light',
  description: 'test',
  version: '1.0.0',
  tokenModelVersion: '2',
  isHighContrast: false,
  defaultForApp: true,
  semantic: {
    'semantic.text.primary': 'tokens.color.textPrimary',
    'semantic.surface.card': 'tokens.color.surfacePrimary',
  },
  slots: {
    'commandBar.logo.text': 'semantic.text.primary',
    'commandBar.shell.bg': 'semantic.surface.card',
  },
  overrides: {
    'commandBar.logo.text': '#abcdef',
  },
  tokens: {
    color: {
      neutral50: '#fff',
      neutral100: '#fff',
      neutral200: '#fff',
      neutral300: '#fff',
      neutral400: '#fff',
      neutral500: '#fff',
      neutral600: '#fff',
      neutral700: '#fff',
      neutral800: '#fff',
      neutral900: '#fff',
      appBackground: '#fff',
      surfacePrimary: '#010203',
      surfaceSecondary: '#fff',
      surfaceMuted: '#fff',
      overlay: '#fff',
      borderSubtle: '#fff',
      borderPrimary: '#fff',
      borderStrong: '#fff',
      textPrimary: '#111111',
      textSecondary: '#fff',
      textMuted: '#fff',
      textInverse: '#fff',
      focusRing: '#fff',
      interactivePrimary: '#fff',
      interactivePrimaryHover: '#fff',
      interactiveSecondary: '#fff',
      interactiveSecondaryHover: '#fff',
      positive: '#fff',
      negative: '#fff',
      warning: '#fff',
      info: '#fff',
      chartGrid: '#fff',
      chartAxis: '#fff',
      chartText: '#fff',
      chartTooltipBackground: '#fff',
      chartTooltipBorder: '#fff',
      chartTooltipText: '#fff',
      brandNavy: '#fff',
      brandBlue: '#fff',
      assetStocks: '#fff',
      assetBonds: '#fff',
      assetCash: '#fff',
      mcBandOuter: '#fff',
      mcBandInner: '#fff',
      stressBase: '#fff',
      stressScenarioA: '#fff',
      stressScenarioB: '#fff',
      stressScenarioC: '#fff',
      stressScenarioD: '#fff',
    },
    typography: {
      fontSans: 'ibmPlexSans',
      fontMono: 'ibmPlexMono',
      fontSizeXs: '12px',
      fontSizeSm: '12px',
      fontSizeMd: '12px',
      fontSizeLg: '12px',
      fontSizeXl: '12px',
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      letterSpacingWide: '0.1em',
    },
    spacing: {
      xs: '1px',
      sm: '2px',
      md: '3px',
      lg: '4px',
      xl: '5px',
      xxl: '6px',
    },
    radius: {
      sm: '1px',
      md: '2px',
      lg: '3px',
      xl: '4px',
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
      easingStandard: 'linear',
    },
    state: {
      editedCellBackground: '#fff',
      preservedRowBackground: '#fff',
      staleBackground: '#fff',
      staleText: '#fff',
      selectedCellOutline: '#fff',
    },
    chart: {
      manualLine: '#fff',
      manualAreaTop: '#fff',
      manualAreaBottom: '#fff',
      mcMedianLine: '#fff',
      mcBandOuter: '#fff',
      mcBandInner: '#fff',
      compareSlotA: '#fff',
      compareSlotB: '#fff',
      compareSlotC: '#fff',
      compareSlotD: '#fff',
      compareSlotE: '#fff',
      compareSlotF: '#fff',
      compareSlotG: '#fff',
      compareSlotH: '#fff',
    },
  },
};

describe('compileThemeSlotVars', () => {
  it('resolves slot vars with override precedence', () => {
    const vars = compileThemeSlotVars(theme, [
      {
        path: 'commandBar.logo.text',
        category: 'commandBar',
        description: 'text',
        fallback: 'semantic.text.primary',
      },
      {
        path: 'commandBar.shell.bg',
        category: 'commandBar',
        description: 'bg',
        fallback: 'semantic.surface.card',
      },
    ]);

    expect(vars['--theme-slot-command-bar-logo-text']).toBe('#abcdef');
    expect(vars['--theme-slot-command-bar-shell-bg']).toBe('#010203');
  });
});
