# Compare Portfolios v2.0 (2..8) — Implementation Plan

## Summary

Implement a major Compare mode expansion from fixed A/B to a bounded multi-slot model (2..8 active slots). The implementation keeps the backend API surface unchanged and focuses changes in client state orchestration, snapshot compatibility, and compare-mode UX composition.

## Delta From Baseline

Baseline reference:
- `docs/features/compare-portfolios/`

Changed assumptions versus baseline:
1. Compare no longer assumes exactly two slots.
2. Compare state is slot-collection based (2..8), not fixed `left/right` keys.
3. Summary cards render all active slots, not only A/B.
4. Detail ledger is tabbed single-view in Compare mode, not dual pane.
5. Snapshot compare payload supports variable slot count.

Unchanged assumptions versus baseline:
1. Compare remains Planning-only.
2. Compare fairness rule still requires shared stochastic conditions across slots in a run.
3. Existing `/api/v1/simulate` and `/api/v1/stress-test` endpoints remain sufficient.
4. Partial failures remain slot-scoped and must preserve successful slot outputs.

## Public Interface and Type Changes

1. Store model
- Generalize compare workspace from fixed keys to slot map/array.
- Add `activeSlotId` and `baselineSlotId` selectors.
- Enforce `minSlots = 2`, `maxSlots = 8`.

2. Snapshot schema
- Add new schema version supporting N-slot compare payload.
- Add backward-compatible load adapters for:
  - legacy single snapshots
  - legacy pair snapshots (`left/right`)

3. Compare orchestration
- Run queue executes compare simulations/stress with bounded parallelism.
- Shared stochastic parity applies to all active slots in the run.

4. API surface
- No route changes.
- Documentation updates only for orchestration semantics.

## Implementation Slices

1. **State foundation**
- Refactor compare state and actions to slot collection model.
- Update selectors and mode-switch seeding logic.

2. **Run orchestration**
- Replace fixed two-call compare run logic with bounded parallel queue.
- Preserve per-slot status/error updates.

3. **Compare controls + chart**
- Replace A/B toggle with A..H slot controls and add/remove/clone affordances.
- Render all active slots on shared chart with stable slot color mapping.

4. **Stats cards**
- Render all active slot values per metric.
- Show baseline-relative deltas.

5. **Detail ledger**
- Replace side-by-side compare ledgers with tabbed single-ledger compare view.

6. **Snapshot compatibility**
- Implement N-slot compare save format.
- Add deterministic load targeting + legacy import adapters.

7. **Regression and docs**
- Update canonical docs and trackers.
- Run full validation gate.

## Failure and Edge Handling

1. Slot run failure
- Failed slot shows error while successful slot outputs remain visible.

2. Baseline slot removal
- If removed baseline slot was active baseline, fallback to first active slot deterministically.

3. Slot bounds
- Block add above 8; block remove below 2 with clear UI messaging.

4. Snapshot ambiguity
- Import prompts must always be deterministic for source/target mapping.

## Validation Plan

Automated:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Manual:
- 2-slot, 4-slot, and 8-slot compare flows.
- Baseline selector and delta rendering.
- Slot add/remove/clone lifecycle.
- Snapshot legacy and new-format import paths.

## Canonical Docs Impact

Must update:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
