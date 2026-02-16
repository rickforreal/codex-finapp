import { ThemeId } from '../constants/enums';

export type ThemeFontFamilyId =
  | 'ibmPlexSans'
  | 'ibmPlexMono'
  | 'systemSans'
  | 'systemMono'
  | 'atkinsonHyperlegible';

export type ThemeColorTokens = {
  neutral50: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  neutral900: string;
  appBackground: string;
  surfacePrimary: string;
  surfaceSecondary: string;
  surfaceMuted: string;
  overlay: string;
  borderSubtle: string;
  borderPrimary: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  focusRing: string;
  interactivePrimary: string;
  interactivePrimaryHover: string;
  interactiveSecondary: string;
  interactiveSecondaryHover: string;
  positive: string;
  negative: string;
  warning: string;
  info: string;
  chartGrid: string;
  chartAxis: string;
  chartText: string;
  chartTooltipBackground: string;
  chartTooltipBorder: string;
  chartTooltipText: string;
  brandNavy: string;
  brandBlue: string;
  assetStocks: string;
  assetBonds: string;
  assetCash: string;
  mcBandOuter: string;
  mcBandInner: string;
  stressBase: string;
  stressScenarioA: string;
  stressScenarioB: string;
  stressScenarioC: string;
  stressScenarioD: string;
};

export type ThemeTypographyTokens = {
  fontSans: ThemeFontFamilyId;
  fontMono: ThemeFontFamilyId;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightSemibold: number;
  letterSpacingWide: string;
};

export type ThemeSpacingTokens = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
};

export type ThemeRadiusTokens = {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  pill: string;
};

export type ThemeBorderTokens = {
  widthThin: string;
  widthBase: string;
  widthThick: string;
};

export type ThemeShadowTokens = {
  panel: string;
  popover: string;
  focus: string;
};

export type ThemeMotionTokens = {
  durationFastMs: number;
  durationNormalMs: number;
  durationSlowMs: number;
  easingStandard: string;
};

export type ThemeStateTokens = {
  editedCellBackground: string;
  preservedRowBackground: string;
  staleBackground: string;
  staleText: string;
  selectedCellOutline: string;
};

export type ThemeChartTokens = {
  manualLine: string;
  manualAreaTop: string;
  manualAreaBottom: string;
  mcMedianLine: string;
  mcBandOuter: string;
  mcBandInner: string;
};

export type ThemeTokenBundle = {
  color: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  spacing: ThemeSpacingTokens;
  radius: ThemeRadiusTokens;
  border: ThemeBorderTokens;
  shadow: ThemeShadowTokens;
  motion: ThemeMotionTokens;
  state: ThemeStateTokens;
  chart: ThemeChartTokens;
};

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  version: string;
  isHighContrast: boolean;
  defaultForApp: boolean;
  tokens: ThemeTokenBundle;
};

export type ThemeCatalogItem = {
  id: ThemeId;
  name: string;
  description: string;
  version: string;
  isHighContrast: boolean;
  defaultForApp: boolean;
};

export type ThemeValidationIssue = {
  themeId: ThemeId;
  tokenPath: string;
  severity: 'warning';
  message: string;
};
