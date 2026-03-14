# CHANGE: Raise Return and Spending Phase Limits to 8

- Change ID: `CHG-0013`
- Status: `Done`
- Created: `2026-03-13`
- Updated: `2026-03-13`

## Why

Power users need finer regime modeling and spending segmentation than the current 4-phase cap allows. Increasing the cap to 8 enables richer planning while preserving existing contiguous-phase behavior and compare sync semantics.

## Scope

- Raise `returnPhases` max from 4 to 8.
- Raise `spendingPhases` max from 4 to 8.
- Update client add-button guards and copy to reflect the new cap.
- Update snapshot return-phase parsing limit to 8.
- Add/adjust validation and store tests for 8-allowed / 9-rejected behavior.

## Non-goals

- No changes to stress scenario max (remains 4).
- No changes to simulation math or Monte Carlo algorithms.
- No changes to compare slot count or other collection limits.

## Surfaces Touched

- `packages/shared/src/contracts/schemas.ts`
- `packages/client/src/store/useAppStore.ts`
- `packages/client/src/components/inputs/ReturnPhases.tsx`
- `packages/client/src/components/inputs/SpendingPhases/SpendingPhases.tsx`
- `packages/client/src/store/snapshot.ts`
- `packages/client/src/store/snapshot.test.ts`
- `packages/client/src/store/useAppStore.compare.test.ts`
- `packages/server/tests/routes/simulation.test.ts`
- `docs/API.md`
- `docs/DATA_MODEL.md`
- `docs/SPECS.md`

## Classification Rationale

This is a minor change because it adjusts existing collection limits and UX copy without introducing new product capabilities, new endpoints, or architectural changes.

## Canonical Docs Impact

- `API.md`
- `DATA_MODEL.md`
- `SPECS.md`
