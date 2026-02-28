import type { ThemeDefinition, ThemeSlotCatalogItem } from '@finapp/shared';

const isRefObject = (value: unknown): value is { ref: string } =>
  typeof value === 'object' &&
  value !== null &&
  'ref' in value &&
  typeof (value as { ref: unknown }).ref === 'string';

const toKebab = (value: string): string =>
  value
    .replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const buildTokenMap = (theme: ThemeDefinition): Record<string, string> => {
  const out: Record<string, string> = {};
  const walk = (prefix: string, value: unknown) => {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string') {
        out[prefix] = value;
      }
      return;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      walk(prefix ? `${prefix}.${key}` : key, child);
    });
  };
  walk('tokens', theme.tokens as unknown as Record<string, unknown>);
  return out;
};

const resolveWithRefs = (
  input: string | { ref: string } | undefined,
  context: {
    semantic: Record<string, string | { ref: string }>;
    tokens: Record<string, string>;
  },
  seen: Set<string>,
): string | null => {
  if (!input) {
    return null;
  }

  const raw = typeof input === 'string' ? input : input.ref;
  if (raw in context.tokens) {
    return context.tokens[raw] ?? null;
  }

  if (raw in context.semantic) {
    if (seen.has(raw)) {
      return null;
    }
    seen.add(raw);
    const nested = context.semantic[raw];
    return resolveWithRefs(
      typeof nested === 'string' ? nested : nested,
      context,
      seen,
    );
  }

  return raw;
};

export const compileThemeSlotVars = (
  theme: ThemeDefinition,
  slotCatalog: ThemeSlotCatalogItem[],
): Record<string, string> => {
  const tokenMap = buildTokenMap(theme);
  const semantic = theme.semantic as Record<string, string | { ref: string }>;
  const slotVars: Record<string, string> = {};

  slotCatalog.forEach((slot) => {
    const source = theme.overrides?.[slot.path] ?? theme.slots[slot.path] ?? slot.fallback;
    const resolved = resolveWithRefs(
      typeof source === 'string' || isRefObject(source) ? source : undefined,
      { semantic, tokens: tokenMap },
      new Set<string>(),
    );
    if (!resolved) {
      return;
    }
    slotVars[`--theme-slot-${toKebab(slot.path)}`] = resolved;
  });

  return slotVars;
};
