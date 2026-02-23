# CHANGE: Compare Slot Theme-Adaptive Visual Refinement

- Change ID: `CHG-0003`
- Status: `Done`
- Created: `2026-02-23`
- Updated: `2026-02-23`

## Why

Compare mode slot visuals currently use hardcoded colors for baseline and remove affordances, which can become illegible or visually inconsistent across built-in themes. Slot chips/tabs also do not consistently share a canonical color source with compare chart lines.

## Scope

- Replace hardcoded baseline styling with theme-adaptive, slot-color-based baseline visuals.
- Update compare slot remove hover control to a solid red circular affordance with high-contrast `X` glyph.
- Ensure each compare slot uses a stable slot-specific color across:
  - sidebar compare chips,
  - compare detail ledger tabs,
  - compare chart line/legend rendering.
- Extend theme chart token surface to include explicit compare slot colors (`A..H`) and wire those tokens through shared contracts, server registry, and client theme engine.

## Non-goals

- No compare behavior/workflow changes (active select, baseline double-click, remove rules, clone rules remain unchanged).
- No changes to compare snapshot payload structure.
- No Monte Carlo algorithm changes.
- No backend route additions.

## Surfaces Touched

- `packages/shared/src/domain/theme.ts`
- `packages/shared/src/contracts/schemas.ts`
- `packages/server/src/themes/registry.ts`
- `packages/client/src/styles/themeEngine.ts`
- `packages/client/src/styles/themeEngine.test.ts`
- `packages/client/src/lib/compareSlotColors.ts`
- `packages/client/src/components/layout/Sidebar.tsx`
- `packages/client/src/components/output/DetailTable.tsx`
- `packages/client/src/components/output/PortfolioChart.tsx`
- `docs/API.md`
- `docs/DATA_MODEL.md`
- `docs/SPECS.md`
- `docs/SCENARIOS.md`

## Classification Rationale

This is a minor change (not a feature wave, not an issue) because:
- It is a targeted visual/theming refinement of existing compare surfaces.
- It does not introduce a new workflow, engine behavior, or route.
- It extends theme token contracts for presentation consistency, without changing retirement planning domain semantics.

## Canonical Docs Impact

- `API.md`
- `DATA_MODEL.md`
- `SPECS.md`
- `SCENARIOS.md`

No updates are expected for `PRD.md`, `ARCHITECTURE.md`, or `ENGINEERING.md` because this change does not alter scope, system boundaries, or process rules.
