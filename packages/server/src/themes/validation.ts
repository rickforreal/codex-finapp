import { type ThemeDefinition, type ThemeSlotCatalogItem, type ThemeValidationIssue } from '@finapp/shared';

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

const tokenValueMap = (theme: ThemeDefinition): Record<string, string> => {
  const out: Record<string, string> = {};

  const walk = (prefix: string, value: unknown) => {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string') {
        out[prefix] = value;
      }
      return;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      walk(nextPrefix, child);
    });
  };

  walk('tokens', theme.tokens as unknown as Record<string, unknown>);
  return out;
};

const resolveRefOrValue = (
  value: unknown,
  semantic: Record<string, unknown>,
  tokens: Record<string, string>,
): string | null => {
  if (typeof value !== 'string' && (typeof value !== 'object' || value === null || typeof (value as { ref?: unknown }).ref !== 'string')) {
    return null;
  }

  const ref = typeof value === 'string' ? value : (value as { ref: string }).ref;
  if (ref in semantic) {
    const semanticValue = semantic[ref];
    if (typeof semanticValue === 'string') {
      return semanticValue;
    }
    return null;
  }
  if (ref in tokens) {
    return tokens[ref] ?? null;
  }
  return ref;
};

export const validateThemeTokenModel = (
  theme: ThemeDefinition,
  slotCatalog: ThemeSlotCatalogItem[],
): ThemeValidationIssue[] => {
  const issues: ThemeValidationIssue[] = [];
  const tokenMap = tokenValueMap(theme);
  const semanticEntries = Object.entries(theme.semantic);
  const resolvedSlotValues: Record<string, string> = {};

  semanticEntries.forEach(([key, value]) => {
    const resolved = resolveRefOrValue(value, theme.semantic as Record<string, unknown>, tokenMap);
    if (resolved === null) {
      issues.push({
        themeId: theme.id,
        tokenPath: `semantic.${key}`,
        severity: 'warning',
        message: 'Semantic token cannot be resolved to a valid value.',
      });
    }
  });

  slotCatalog.forEach((slot) => {
    const raw = theme.overrides?.[slot.path] ?? theme.slots[slot.path] ?? slot.fallback;
    const resolved = resolveRefOrValue(raw, theme.semantic as Record<string, unknown>, tokenMap);
    if (resolved === null) {
      issues.push({
        themeId: theme.id,
        tokenPath: `slots.${slot.path}`,
        severity: 'warning',
        message: 'Slot token cannot be resolved to a valid value.',
      });
      return;
    }
    resolvedSlotValues[slot.path] = resolved;
  });

  Object.keys(theme.slots).forEach((slotKey) => {
    if (!slotCatalog.some((item) => item.path === slotKey)) {
      issues.push({
        themeId: theme.id,
        tokenPath: `slots.${slotKey}`,
        severity: 'warning',
        message: 'Slot key is not in slot catalog.',
      });
    }
  });

  const slotContrastChecks: Array<{ fg: string; bg: string; tokenPath: string }> = [
    {
      fg: 'commandBar.logo.text',
      bg: 'commandBar.shell.bg',
      tokenPath: 'slots.commandBar.logo.text/slots.commandBar.shell.bg',
    },
    {
      fg: 'summaryStats.value.text',
      bg: 'summaryStats.card.bg',
      tokenPath: 'slots.summaryStats.value.text/slots.summaryStats.card.bg',
    },
    {
      fg: 'portfolioChart.tooltip.text',
      bg: 'portfolioChart.tooltip.bg',
      tokenPath: 'slots.portfolioChart.tooltip.text/slots.portfolioChart.tooltip.bg',
    },
    {
      fg: 'detailLedger.header.text',
      bg: 'detailLedger.header.bg',
      tokenPath: 'slots.detailLedger.header.text/slots.detailLedger.header.bg',
    },
  ];
  const minimum = theme.isHighContrast ? 7 : 4.5;
  slotContrastChecks.forEach((check) => {
    const fg = resolvedSlotValues[check.fg];
    const bg = resolvedSlotValues[check.bg];
    if (!fg || !bg) {
      return;
    }
    const issue = validateContrast(theme, fg, bg, check.tokenPath, minimum);
    if (issue) {
      issues.push(issue);
    }
  });

  return issues;
};
