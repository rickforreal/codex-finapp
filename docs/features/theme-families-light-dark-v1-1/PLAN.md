# Theme Families + Per-Theme Appearance v1.1 Plan

## Delta From Baseline

Baseline reference:
- `docs/features/theme-families-light-dark-v1/`

Changes from baseline assumptions:
1. Replaces user-facing Monokai with Circuit Breaker while preserving internal `monokai` IDs.
2. Replaces user-facing Synthwave '84 with Powell Pivot while preserving internal `synthwave84` IDs.
3. Adds targeted per-family light overrides for these two families to reduce samey light outputs.

## Implementation Plan

1. Server theme registry (`packages/server/src/themes/registry.ts`)
- Replace `ThemeVariantId.MonokaiDark` tokens/name/description with Circuit Breaker values.
- Replace `ThemeVariantId.Synthwave84Dark` tokens/name/description with Powell Pivot values.
- Keep IDs and family IDs unchanged for compatibility.
- Add post-generation light override function for `MonokaiLight` and `Synthwave84Light`.
- Update `families` display metadata for `ThemeFamilyId.Monokai` and `ThemeFamilyId.Synthwave84`.
- Update `catalog` display metadata for `ThemeId.Monokai` and `ThemeId.Synthwave84`.

2. Tests (`packages/server/tests/routes/themes.test.ts`)
- Assert replacement family names are present.
- Assert old family labels are absent from active family set.
- Assert both replacement families still support Light + Dark appearances.
- Keep legacy catalog-ID assertions for compatibility.

3. Canonical docs
- Update `docs/SPECS.md` Affordance #66 current family list.

4. Verification
- Run `npm run typecheck`
- Run `npm run lint`
- Run `npm test`
- Run `npm run build`

## Compatibility Notes

- Legacy snapshot/bookmark/local-preference references to `monokai` and `synthwave84` remain valid and resolve to replacement themes due to stable IDs.
- No schema/version migrations are required.

## Canonical Docs Impact

- Updated: `docs/SPECS.md`
- No canonical contract impact: `docs/API.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`
- No scenario text impact: `docs/SCENARIOS.md` unchanged
