import type { ThemeDefinition, ThemeFontFamilyId } from '@finapp/shared';

const FONT_FAMILY_MAP: Record<ThemeFontFamilyId, string> = {
  ibmPlexSans: '"IBM Plex Sans", sans-serif',
  ibmPlexMono: '"IBM Plex Mono", monospace',
  systemSans: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  systemMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  atkinsonHyperlegible: '"Atkinson Hyperlegible", "IBM Plex Sans", sans-serif',
};

export const THEME_PREFERENCE_STORAGE_KEY = 'finapp:theme-id';

const setVar = (name: string, value: string) => {
  document.documentElement.style.setProperty(name, value);
};

export const applyTheme = (theme: ThemeDefinition): void => {
  const { color, typography, spacing, radius, border, shadow, motion, state, chart } = theme.tokens;

  setVar('--theme-color-app-background', color.appBackground);
  setVar('--theme-color-surface-primary', color.surfacePrimary);
  setVar('--theme-color-surface-secondary', color.surfaceSecondary);
  setVar('--theme-color-surface-muted', color.surfaceMuted);
  setVar('--theme-color-overlay', color.overlay);
  setVar('--theme-color-border-subtle', color.borderSubtle);
  setVar('--theme-color-border-primary', color.borderPrimary);
  setVar('--theme-color-border-strong', color.borderStrong);
  setVar('--theme-color-text-primary', color.textPrimary);
  setVar('--theme-color-text-secondary', color.textSecondary);
  setVar('--theme-color-text-muted', color.textMuted);
  setVar('--theme-color-text-inverse', color.textInverse);
  setVar('--theme-color-focus-ring', color.focusRing);
  setVar('--theme-color-interactive-primary', color.interactivePrimary);
  setVar('--theme-color-interactive-primary-hover', color.interactivePrimaryHover);
  setVar('--theme-color-interactive-secondary', color.interactiveSecondary);
  setVar('--theme-color-interactive-secondary-hover', color.interactiveSecondaryHover);
  setVar('--theme-color-positive', color.positive);
  setVar('--theme-color-negative', color.negative);
  setVar('--theme-color-warning', color.warning);
  setVar('--theme-color-info', color.info);
  setVar('--theme-color-chart-grid', color.chartGrid);
  setVar('--theme-color-chart-axis', color.chartAxis);
  setVar('--theme-color-chart-text', color.chartText);
  setVar('--theme-color-chart-tooltip-background', color.chartTooltipBackground);
  setVar('--theme-color-chart-tooltip-border', color.chartTooltipBorder);
  setVar('--theme-color-chart-tooltip-text', color.chartTooltipText);
  setVar('--theme-color-brand-navy', color.brandNavy);
  setVar('--theme-color-brand-blue', color.brandBlue);
  setVar('--theme-color-asset-stocks', color.assetStocks);
  setVar('--theme-color-asset-bonds', color.assetBonds);
  setVar('--theme-color-asset-cash', color.assetCash);
  setVar('--theme-color-mc-band-outer', color.mcBandOuter);
  setVar('--theme-color-mc-band-inner', color.mcBandInner);
  setVar('--theme-color-stress-base', color.stressBase);
  setVar('--theme-color-stress-a', color.stressScenarioA);
  setVar('--theme-color-stress-b', color.stressScenarioB);
  setVar('--theme-color-stress-c', color.stressScenarioC);
  setVar('--theme-color-stress-d', color.stressScenarioD);

  setVar('--theme-font-sans', FONT_FAMILY_MAP[typography.fontSans]);
  setVar('--theme-font-mono', FONT_FAMILY_MAP[typography.fontMono]);
  setVar('--theme-font-size-xs', typography.fontSizeXs);
  setVar('--theme-font-size-sm', typography.fontSizeSm);
  setVar('--theme-font-size-md', typography.fontSizeMd);
  setVar('--theme-font-size-lg', typography.fontSizeLg);
  setVar('--theme-font-size-xl', typography.fontSizeXl);
  setVar('--theme-font-weight-regular', `${typography.fontWeightRegular}`);
  setVar('--theme-font-weight-medium', `${typography.fontWeightMedium}`);
  setVar('--theme-font-weight-semibold', `${typography.fontWeightSemibold}`);
  setVar('--theme-letter-spacing-wide', typography.letterSpacingWide);

  setVar('--theme-space-xs', spacing.xs);
  setVar('--theme-space-sm', spacing.sm);
  setVar('--theme-space-md', spacing.md);
  setVar('--theme-space-lg', spacing.lg);
  setVar('--theme-space-xl', spacing.xl);
  setVar('--theme-space-xxl', spacing.xxl);

  setVar('--theme-radius-sm', radius.sm);
  setVar('--theme-radius-md', radius.md);
  setVar('--theme-radius-lg', radius.lg);
  setVar('--theme-radius-xl', radius.xl);
  setVar('--theme-radius-pill', radius.pill);

  setVar('--theme-border-width-thin', border.widthThin);
  setVar('--theme-border-width-base', border.widthBase);
  setVar('--theme-border-width-thick', border.widthThick);

  setVar('--theme-shadow-panel', shadow.panel);
  setVar('--theme-shadow-popover', shadow.popover);
  setVar('--theme-shadow-focus', shadow.focus);

  setVar('--theme-motion-fast', `${motion.durationFastMs}ms`);
  setVar('--theme-motion-normal', `${motion.durationNormalMs}ms`);
  setVar('--theme-motion-slow', `${motion.durationSlowMs}ms`);
  setVar('--theme-motion-easing', motion.easingStandard);

  setVar('--theme-state-edited-cell-background', state.editedCellBackground);
  setVar('--theme-state-preserved-row-background', state.preservedRowBackground);
  setVar('--theme-state-stale-background', state.staleBackground);
  setVar('--theme-state-stale-text', state.staleText);
  setVar('--theme-state-selected-cell-outline', state.selectedCellOutline);

  setVar('--theme-chart-manual-line', chart.manualLine);
  setVar('--theme-chart-manual-area-top', chart.manualAreaTop);
  setVar('--theme-chart-manual-area-bottom', chart.manualAreaBottom);
  setVar('--theme-chart-mc-median-line', chart.mcMedianLine);
  setVar('--theme-chart-mc-band-outer', chart.mcBandOuter);
  setVar('--theme-chart-mc-band-inner', chart.mcBandInner);

  document.documentElement.setAttribute('data-theme-id', theme.id);
};

export const persistThemePreference = (themeId: string): void => {
  window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, themeId);
};

export const loadThemePreference = (): string | null =>
  window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
