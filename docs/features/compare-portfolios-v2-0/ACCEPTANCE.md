# Compare Portfolios v2.0 (2..8) — Acceptance

## Functional Acceptance

1. Slot capacity and lifecycle
- Compare mode supports 2 through 8 active slots.
- User can add a new slot by cloning any existing slot.
- User can remove slots while at least 2 remain.

2. Input editing
- Sidebar edits apply only to the selected active slot.
- Switching active slot preserves isolated slot state.

3. Compare run execution
- Run Simulation executes all active slots in compare mode.
- Execution uses bounded parallelism.
- Shared stochastic parity is preserved across all active slots.

4. Shared chart behavior
- Compare chart renders every active slot simultaneously.
- Legend and tooltip identify each active slot consistently.

5. Stats cards behavior
- Each summary metric card shows all active slot values.
- Cards include baseline-relative signed deltas.
- Baseline selector changes delta reference without rerunning simulation.

6. Detail ledger behavior
- Compare detail ledger uses one shared viewport with slot tabs.
- Monthly/annual and breakdown controls remain available and shared.
- Spreadsheet expand remains unavailable in compare mode.

7. Snapshot behavior
- New multi-slot compare snapshots save and restore active slots.
- Legacy single snapshots are importable into compare mode.
- Legacy pair snapshots are importable with deterministic source/target mapping.

## Regression Acceptance

1. Existing workflows
- Planning and Tracking continue to behave as before outside compare mode.
- Theme switching remains functional in compare mode.

2. API compatibility
- Compare mode continues to use existing `/simulate` and `/stress-test` endpoints.
- No contract regression in shared request/response schema.

3. Verification gate
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.

## Edge-Case Acceptance

1. Partial run failures
- Successful slots remain visible when one or more slots fail.
- Error messages are slot-specific.

2. Baseline fallback
- Removing current baseline slot reassigns baseline deterministically.

3. Slot-limit guards
- Add control blocks at 8 slots.
- Remove control blocks at 2 slots.

4. Snapshot validation
- Invalid or mismatched-version files do not mutate current state.
