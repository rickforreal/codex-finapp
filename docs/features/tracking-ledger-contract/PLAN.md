# PLAN — Tracking Detail Ledger Contract v1.0

## Baseline
Current implementation allows broader ledger edit semantics and mixed stale behavior, which can create ambiguity in Tracking and compare workflows.

## Decisions (Locked)
1. Slot `A` is the only source of ledger actuals in Tracking.
2. Slot `A` editable fields are limited to start balances and withdrawal-by-asset fields.
3. `Withdrawal Total`, `Income`, and `Expenses` are ledger read-only.
4. Non-`A` ledger tabs are read-only in Tracking compare.
5. Tracking changes are stale-first and require explicit rerun in both Manual and Monte Carlo.
6. Compare Tracking runs use Slot `A` actual history for all slots.
7. Legacy `incomeTotal`/`expenseTotal` override fields remain schema-compatible but are ignored by the new ledger edit path.

## Implementation Slices
1. Editability gating
- Restrict editable columns and Slot `A`/month-window eligibility checks.

2. Same-row derived congruence
- Recompute dependent row fields immediately after start/withdrawal edits.

3. Tracking stale lifecycle
- Mark stale on ledger/input changes; clear stale on explicit run.

4. Compare canonicalization
- Normalize Tracking compare actual overrides so Slot `A` is canonical floor.

5. Run orchestration
- Ensure reruns preserve rows through `A.lastEditedMonthIndex` and resimulate only future rows.

6. Snapshot compatibility
- Accept legacy snapshot shapes; preserve Slot `A` overrides as canonical effective runtime history.

7. Tests
- Add/update unit/store tests for editability, month window, stale lifecycle, and compare canonicalization.

8. Documentation and trackers
- Update SPECS/SCENARIOS/ARCHITECTURE/DATA_MODEL.
- Update root TASKS/PROGRESS.

## Canonical Docs Impact
- Updated:
  - `docs/SPECS.md`
  - `docs/SCENARIOS.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
- No API contract changes required.
