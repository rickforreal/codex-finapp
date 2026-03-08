# CHANGE: Hopium Theme Swatch Refresh

- Change ID: `CHG-0012`
- Status: `Done`
- Created: `2026-03-08`
- Updated: `2026-03-08` (brown-dominant rebalance)

## Why

Hopium light/dark variants did not align with the provided palette direction. The theme needed a direct swatch-driven refresh to improve identity and consistency.

## Scope

- Update `ThemeVariantId.HopiumDark` token bundle to a swatch-inspired teal/aqua/copper palette.
- Add a dedicated `ThemeVariantId.HopiumLight` override so light appearance is distinct and not a generic generated clone.
- Rebalance both variants so brown tones dominate core backgrounds/surfaces while blue tones are used primarily as accents.
- Keep family and variant IDs unchanged for backward compatibility.

## Non-goals

- No enum or schema changes.
- No client state shape changes.
- No changes to other theme families.

## Surfaces Touched

- `packages/server/src/themes/registry.ts`

## Classification Rationale

Minor visual/token refinement for an existing theme family without model or contract impact.

## Canonical Docs Impact

No canonical doc impact.

Rationale: this change updates theme token values only; behavior/contracts remain unchanged.
