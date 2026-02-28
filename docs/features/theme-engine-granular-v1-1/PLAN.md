# Plan: Theme Engine Granular v1.1

## Delta From Baseline
- Baseline: `docs/features/themes/monokai/` and `docs/features/themes/synthwave84/`.
- Change: move from palette-only token consumption to explicit component slot model with deterministic inheritance and slot catalog contract.

## Decisions
1. Token model version is explicitly `2`.
2. Theme contract is expanded now (server + shared + client).
3. Inheritance order is:
   - `overrides[slot]`
   - `slots[slot]`
   - server `slotCatalog[].fallback`
   - semantic reference
   - primitive token value
4. Client resolves slot values to CSS variables named `--theme-slot-<kebab-slot-path>`.

## Implementation Slices
1. Shared contracts:
   - Add `ThemeTokenRef`, `ThemeTokenRefOrValue`, `ThemeSlotCatalogItem`.
   - Extend `ThemeDefinition` with `tokenModelVersion`, `semantic`, `slots`, optional `overrides`.
   - Extend `ThemesResponse` with `tokenModelVersion` and `slotCatalog`.
   - Update Zod schemas.
2. Server:
   - Add canonical `defaultSlotMap` and derive `slotCatalog`.
   - Augment built-in themes to token model v2 with semantic + slots maps.
   - Add token-model validation (invalid refs, unresolved slots, unknown slot keys, contrast checks for key slot pairs).
   - Return expanded `/themes` payload.
3. Client:
   - Add slot resolver/compiler (`themeResolver.ts`) and tests.
   - Apply slot vars from selected theme + slot catalog in `applyTheme`.
   - Store `slotCatalog` in theme state and include it in snapshot/store cloning.
   - Add slot-driven classes for command bar, shell/sidebar cards, section chrome, shared controls, stat cards, compare diff panel, chart panel, and stress panel.
4. Verification:
   - Route test asserts `tokenModelVersion` + `slotCatalog`.
   - Theme resolver + theme engine tests verify slot var emission and override precedence.
   - Full regression gate.

## Risks and Mitigations
- Risk: styling regressions from class-level migration.
  - Mitigation: keep existing base token variables and utility bridge while layering slot classes.
- Risk: older snapshots missing `slotCatalog`.
  - Mitigation: snapshot parser defaults `theme.slotCatalog` to `[]`.

## Canonical Docs Impact
- `docs/SPECS.md`: add slot-level theming capability note under Affordance #66.
- `docs/DATA_MODEL.md`: add theme token model v2 fields and slot catalog.
- `docs/API.md`: expand `/api/v1/themes` response shape.
- `docs/ARCHITECTURE.md`: describe resolver flow and slot CSS var strategy.
