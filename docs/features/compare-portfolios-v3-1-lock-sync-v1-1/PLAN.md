# Compare Portfolios v3.1.1 — Implementation Plan

## Delta From Baseline

Baseline reference:
- `docs/features/compare-portfolios-v3-1-lock-sync/`

Changes vs baseline assumptions:
1. Spending Phase instance locks are no longer free-form.
2. Eligible lock targets are constrained by previous-phase lock state.
3. Unlock is cascading for Spending phases.

## Implementation

1. Store helpers
- Add Spending prefix helpers and normalization into compare-sync pipeline.

2. Toggle behavior
- In `toggleCompareInstanceLock('spendingPhases', id)`:
  - block non-eligible lock attempts
  - unlock selected + all later locked phases

3. UI affordance
- Disable Slot `A` Spending lock icon when phase is not lock-eligible.
- Tooltip: `Lock prior phase first`.

4. Persistence behavior
- Normalize non-prefix locks on load via existing compare-sync normalization path.

## Canonical Docs Impact

- Update SPECS/SCENARIOS/DATA_MODEL/ARCHITECTURE for sequential rule.
