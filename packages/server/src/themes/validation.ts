import { type ThemeDefinition, type ThemeValidationIssue } from '@finapp/shared';

const HEX_COLOR_REGEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

const relativeLuminance = (hex: string): number | null => {
  if (!HEX_COLOR_REGEX.test(hex)) {
    return null;
  }

  const value = hex.slice(1, 7);
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;

  const linear = [r, g, b].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  const [lr, lg, lb] = linear;
  if (lr === undefined || lg === undefined || lb === undefined) {
    return null;
  }

  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

const contrastRatio = (foreground: string, background: string): number | null => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 === null || l2 === null) {
    return null;
  }

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

const validateContrast = (
  theme: ThemeDefinition,
  foreground: string,
  background: string,
  tokenPath: string,
  minimumRatio: number,
): ThemeValidationIssue | null => {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) {
    return {
      themeId: theme.id,
      tokenPath,
      severity: 'warning',
      message: 'Contrast validation skipped: expected hex color tokens.',
    };
  }

  if (ratio >= minimumRatio) {
    return null;
  }

  return {
    themeId: theme.id,
    tokenPath,
    severity: 'warning',
    message: `Contrast ratio ${ratio.toFixed(2)} is below target ${minimumRatio.toFixed(1)}:1`,
  };
};

export const validateThemeAccessibility = (theme: ThemeDefinition): ThemeValidationIssue[] => {
  const minimum = theme.isHighContrast ? 7 : 4.5;
  const checks: Array<ThemeValidationIssue | null> = [
    validateContrast(
      theme,
      theme.tokens.color.textPrimary,
      theme.tokens.color.surfacePrimary,
      'tokens.color.textPrimary/tokens.color.surfacePrimary',
      minimum,
    ),
    validateContrast(
      theme,
      theme.tokens.color.textSecondary,
      theme.tokens.color.surfacePrimary,
      'tokens.color.textSecondary/tokens.color.surfacePrimary',
      minimum,
    ),
    validateContrast(
      theme,
      theme.tokens.color.textInverse,
      theme.tokens.color.interactivePrimary,
      'tokens.color.textInverse/tokens.color.interactivePrimary',
      minimum,
    ),
    validateContrast(
      theme,
      theme.tokens.color.chartTooltipText,
      theme.tokens.color.chartTooltipBackground,
      'tokens.color.chartTooltipText/tokens.color.chartTooltipBackground',
      minimum,
    ),
  ];

  return checks.filter((issue): issue is ThemeValidationIssue => issue !== null);
};
