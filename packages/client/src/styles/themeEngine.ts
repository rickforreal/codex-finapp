import { ThemeAppearance, ThemeFamilyId, ThemeId, type ThemeDefinition, type ThemeFontFamilyId, type ThemeSlotCatalogItem } from '@finapp/shared';

import { compileThemeSlotVars } from './themeResolver';

const FONT_FAMILY_MAP: Record<ThemeFontFamilyId, string> = {
  ibmPlexSans: '"IBM Plex Sans", sans-serif',
  ibmPlexMono: '"IBM Plex Mono", monospace',
  systemSans: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  systemMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  atkinsonHyperlegible: '"Atkinson Hyperlegible", "IBM Plex Sans", sans-serif',
};

export type ThemePreferenceSelection = {
  familyId: ThemeFamilyId;
  appearance: ThemeAppearance;
};

export const THEME_PREFERENCE_STORAGE_KEY = 'finapp:theme-selection-v1';
const LEGACY_THEME_PREFERENCE_STORAGE_KEY = 'finapp:theme-id';

const setVar = (name: string, value: string) => {
  document.documentElement.style.setProperty(name, value);
};

export const applyTheme = (theme: ThemeDefinition, slotCatalog: ThemeSlotCatalogItem[] = []): void => {
  const { color, typography, spacing, radius, border, shadow, motion, state, chart } = theme.tokens;

  setVar('--theme-color-neutral-50', color.neutral50);
  setVar('--theme-color-neutral-100', color.neutral100);
  setVar('--theme-color-neutral-200', color.neutral200);
  setVar('--theme-color-neutral-300', color.neutral300);
  setVar('--theme-color-neutral-400', color.neutral400);
  setVar('--theme-color-neutral-500', color.neutral500);
  setVar('--theme-color-neutral-600', color.neutral600);
  setVar('--theme-color-neutral-700', color.neutral700);
  setVar('--theme-color-neutral-800', color.neutral800);
  setVar('--theme-color-neutral-900', color.neutral900);
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
  setVar('--theme-chart-compare-slot-a', chart.compareSlotA);
  setVar('--theme-chart-compare-slot-b', chart.compareSlotB);
  setVar('--theme-chart-compare-slot-c', chart.compareSlotC);
  setVar('--theme-chart-compare-slot-d', chart.compareSlotD);
  setVar('--theme-chart-compare-slot-e', chart.compareSlotE);
  setVar('--theme-chart-compare-slot-f', chart.compareSlotF);
  setVar('--theme-chart-compare-slot-g', chart.compareSlotG);
  setVar('--theme-chart-compare-slot-h', chart.compareSlotH);

  const slotVars = compileThemeSlotVars(theme, slotCatalog);
  Object.entries(slotVars).forEach(([key, value]) => {
    setVar(key, value);
  });

  document.documentElement.setAttribute('data-theme-id', theme.id);
  document.documentElement.setAttribute('data-theme-family', theme.familyId);
  document.documentElement.setAttribute('data-theme-appearance', theme.appearance);
};

const mapLegacyThemeIdToSelection = (themeId: ThemeId): ThemePreferenceSelection => {
  switch (themeId) {
    case ThemeId.Light:
      return { familyId: ThemeFamilyId.Default, appearance: ThemeAppearance.Light };
    case ThemeId.Dark:
      return { familyId: ThemeFamilyId.Default, appearance: ThemeAppearance.Dark };
    case ThemeId.Monokai:
      return { familyId: ThemeFamilyId.Monokai, appearance: ThemeAppearance.Dark };
    case ThemeId.Synthwave84:
      return { familyId: ThemeFamilyId.Synthwave84, appearance: ThemeAppearance.Dark };
    case ThemeId.StayTheCourse:
      return { familyId: ThemeFamilyId.StayTheCourse, appearance: ThemeAppearance.Dark };
    case ThemeId.HighContrast:
      return { familyId: ThemeFamilyId.HighContrast, appearance: ThemeAppearance.Dark };
  }
};

export const persistThemePreference = (selection: ThemePreferenceSelection): void => {
  window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, JSON.stringify(selection));
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const loadThemePreference = (): ThemePreferenceSelection | null => {
  const raw = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        isObjectRecord(parsed) &&
        parsed.familyId &&
        parsed.appearance &&
        Object.values(ThemeFamilyId).includes(parsed.familyId as ThemeFamilyId) &&
        Object.values(ThemeAppearance).includes(parsed.appearance as ThemeAppearance)
      ) {
        return {
          familyId: parsed.familyId as ThemeFamilyId,
          appearance: parsed.appearance as ThemeAppearance,
        };
      }
    } catch {
      // ignore malformed selection; fall through to legacy
    }
  }

  const legacy = window.localStorage.getItem(LEGACY_THEME_PREFERENCE_STORAGE_KEY);
  if (legacy && Object.values(ThemeId).includes(legacy as ThemeId)) {
    return mapLegacyThemeIdToSelection(legacy as ThemeId);
  }

  return null;
};
