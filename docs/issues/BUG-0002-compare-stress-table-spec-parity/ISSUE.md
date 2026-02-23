# ISSUE: Compare Stress Table Missing Spec-Parity Metrics and Section Structure

- Bug ID: `BUG-0002`
- Status: `Done`
- Severity: `S1`
- Owner: `unassigned`
- Created: `2026-02-23`
- Updated: `2026-02-23`
- Affected Areas: `Stress Test panel`, `Compare mode`, `Metrics table`

## Summary

In compare-active mode, the Stress Test metrics table does not preserve parity with the single-portfolio stress table and documented stress metrics semantics.

## Reproduction Steps

1. Activate compare with at least two slots (for example `A` and `B`).
2. Run simulation and configure at least one stress scenario.
3. Open the Stress Test panel and inspect the metrics table.

## Expected Behavior

- Table headers are slot-aware (`Portfolio A`, `Portfolio B`, ...).
- Base and each scenario section include the full core metrics set, including:
  - `Median Monthly Withdrawal (Real)`
  - `Mean Monthly Withdrawal (Real)`
- Scenario sections include both primary metric rows and delta rows where applicable.

## Actual Behavior

- Table rendering drifted from spec parity:
  - Generic semantics persisted in compare mode.
  - Monthly mean/median rows were missing in compare sectioning.
  - Scenario content collapsed to delta-only rows rather than full metric parity.

## Scope and Impact

- Frequency: `always` in compare-active stress table view
- User impact: `high` for compare stress analysis quality
- Regression risk areas: compare stress table model, scenario alignment, MC conditional rows

## Evidence

- User report from current compare stress workflow.
- Current implementation renders reduced compare rows and omits mean/median in scenario sections.
