# ACCEPTANCE: Compare Stress Table Spec-Parity Restoration

- Bug ID: `BUG-0002`

## Functional Acceptance Criteria

- [x] Compare stress table headers are slot-aware (`Portfolio A..H`).
- [x] Compare table sections render in order: `Base`, then each `Scenario: <label>`.
- [x] Base section includes:
  - Terminal Portfolio Value
  - Total Drawdown (Real)
  - Median Monthly Withdrawal (Real)
  - Mean Monthly Withdrawal (Real)
  - Depletion Month
  - Probability of Success (MC only)
- [x] Scenario sections include full core rows and required delta rows.
- [x] Scenario rows are resolved by `scenarioId`, not positional index.
- [x] Missing slot/scenario data renders `—` without collapsing row/column structure.
- [x] Single-slot stress table behavior remains unchanged.

## Test Cases

1. Compare with A/B and two scenarios:
- verify base + two scenario sections.
- verify mean/median rows exist for base and scenarios.

2. Compare with scenario order mismatch by slot:
- verify correct scenario values are matched by `scenarioId`.

3. Monte Carlo compare:
- verify `Probability of Success` and `Δ Success vs. Base` rows present.

4. Manual compare:
- verify MC-only rows absent.

5. Partial data compare:
- remove one slot stress result and verify `—` fallback cells only for that slot.

## Regression Checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Closure

- [x] `docs/issues/INDEX.md` updated
- [x] `TASKS.md` updated with BUG-0002 task(s)
- [x] `PROGRESS.txt` append-only entries include BUG-0002 start and completion
