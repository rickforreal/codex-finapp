# Compare Portfolios v3.0 — Implementation Plan

## Summary

Reframe compare from a third mode to an always-on slot workspace available in both Planning and Tracking. Compare output rendering is driven by slot count (`slotOrder.length > 1`) instead of `AppMode.Compare`.

## Delta From Baseline

Baseline references:
- `docs/features/compare-portfolios-v2-0/`
- `docs/features/compare-portfolios-v2-1/`

Changed assumptions versus baseline:
1. App mode model changes from three modes (`Planning`, `Tracking`, `Compare`) to two (`Planning`, `Tracking`).
2. Compare slot manager is always visible in sidebar and starts from one slot (`A`) instead of two.
3. Compare activation is no longer mode-based; it is slot-count-based.
4. Tracking now supports compare workflows with canonical slot `A` hard-floor semantics.
5. Legacy snapshots with `mode: "compare"` are intentionally unsupported.

Unchanged assumptions versus baseline:
1. Compare slot identity remains `A`..`H` and slot `A` is non-removable.
2. Multi-slot runs preserve shared stochastic parity.
3. Compare chart/stats/ledger/stress surfaces remain the comparison UI pattern.

## Locked Product Decisions

1. Mode toggle: `Planning | Tracking` only.
2. Single-slot output uses single-portfolio surfaces; multi-slot uses compare surfaces.
3. `A` is canonical in tracking and defines immutable floor by month boundary.
4. In Tracking + multi-slot, run executes all active slots.
5. Clear Actuals clears active slot only.
6. Snapshot load remains silent full-state replace.
7. Hard remove of compare mode contracts/schemas; no compatibility shim.

## Public Interface and Type Changes

Breaking:
1. `packages/shared/src/constants/enums.ts`
- remove `AppMode.Compare`.

2. `packages/shared/src/domain/simulation.ts`
- `SimulationConfig.mode` limited to `planning | tracking`.

3. `packages/shared/src/contracts/schemas.ts`
- config schema mode enum updated.

Client/store:
4. `packages/client/src/store/useAppStore.ts`
- remove `setMode(AppMode.Compare)` branch.
- preserve `compareWorkspace` but min active slot count becomes 1.
- compare orchestration selection based on `slotOrder.length > 1`.
- add tracking hard-floor normalization helper keyed by slot `A` boundary.

Snapshot:
5. `packages/client/src/store/snapshot.ts`
- bump schema version to `5`.
- reject snapshots where `data.mode === "compare"` with explicit load error.

## Implementation Slices

1. Shared contracts and enums
- Remove `Compare` from `AppMode`.
- Update shared schemas/types and any compile-time references.

2. Store foundations
- Normalize compare workspace minimum to 1 slot.
- Add selector/helper: `isCompareActive` (`slotOrder.length > 1`).
- Remove compare-mode-specific state switching branch.
- Ensure config builders use current mode (`Planning`/`Tracking`) for all slots.

3. UI decoupling from mode
- CommandBar mode toggle to two segments.
- Sidebar compare slot manager always visible.
- AppShell and output components route single-vs-compare layout by `isCompareActive`.

4. Tracking canonical floor engine
- Implement utility to enforce: for non-`A` slots, remove overrides `<= A.lastEditedMonthIndex`.
- Apply on:
  - slot mutation while in Tracking,
  - `A` override updates,
  - run-start read path,
  - snapshot load hydration.
- Detail table editing guard: non-`A` cells pre-floor are read-only.

5. Run/stress unification
- CommandBar run path: multi-slot orchestration for both modes when compare active.
- Preserve bounded parallelism and shared seed.
- Stress runs in multi-slot tracking use effective slot overrides after hard-floor normalization.

6. Snapshot migration behavior
- bump snapshot schema version.
- explicit invalid-snapshot error on `compare` mode.
- keep silent replace behavior for valid payloads.

7. Tests and regression
- update existing compare/store/snapshot/component tests for new mode model and slot-count activation.
- run full regression gate.

## Edge and Failure Handling

1. Slot invariants
- `A` cannot be deleted.
- min slot count `1`, max `8`.

2. Tracking hard-floor conflicts
- Non-`A` overrides inside locked range are automatically dropped.
- Locked cells cannot be edited.

3. Snapshot compatibility
- Legacy compare-mode snapshots are rejected by design.

## Validation Plan

Automated:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Manual:
1. Planning, 1 slot (`A`): single-portfolio behavior unchanged.
2. Planning, >1 slots: compare surfaces active and run all slots.
3. Tracking, >1 slots: lock behavior before `A` boundary; editable after boundary.
4. Promote `A` boundary forward and verify non-`A` historical overrides are removed.
5. Load old compare snapshot and verify explicit unsupported error.

## Canonical Docs Impact

Must update:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`

No changes expected:
- `docs/PRD.md`
- `docs/ENGINEERING.md`
