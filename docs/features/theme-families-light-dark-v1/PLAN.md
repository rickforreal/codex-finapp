# Theme Families + Per-Theme Appearance (Light/Dark) v1 Plan

## Delta From Baseline

Baseline reference:
- `docs/features/theme-engine-granular-v1-1/`

Changes from baseline assumptions:
1. Selection model changes from single `ThemeId` to `ThemeFamilyId + ThemeAppearance`.
2. `/api/v1/themes` expands with grouped family metadata and explicit variant list.
3. Legacy flat fields remain for one compatibility wave.

## Scope

In scope:
- shared type/contract changes for family+appearance model
- server registry emit `families`, `variants`, and `defaultSelection`
- client store, startup flow, and theme picker UI migration
- snapshot/local preference migration from legacy `ThemeId`
- canonical docs updates

Out of scope:
- user-authored runtime custom themes
- token model v2 resolver architecture changes
- additional accessibility mode semantics beyond single High Contrast family

## Implementation Notes

1. Shared contracts:
- Add `ThemeFamilyId`, `ThemeAppearance`, `ThemeVariantId`.
- `ThemeDefinition` now carries `familyId` and `appearance`.
- Add family catalog and default selection types.
- Expand `ThemesResponse` with `families`, `variants`, `defaultSelection`.

2. Server:
- Emit explicit variant list for all supported family/appearance combinations.
- Keep legacy `defaultThemeId/themes/catalog` aliases for compatibility.
- Validate all variants through existing accessibility + slot validation.

3. Client:
- Theme state tracks:
  - selected family
  - per-family remembered appearance
  - resolved active variant id
- Command bar theme menu renders family rows with per-row light/dark toggle.
- High Contrast row stays single-variant with A11y badge.
- Startup precedence preserved: snapshot > local preference > server default.

4. Migration:
- Snapshot parser accepts legacy `selectedThemeId/defaultThemeId` and maps to family+appearance.
- Local preference supports old key migration and writes new selection key.

## Canonical Docs Impact

Update required:
- `docs/SPECS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
