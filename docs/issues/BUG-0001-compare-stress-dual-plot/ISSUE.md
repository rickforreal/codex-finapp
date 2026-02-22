# ISSUE: Compare Stress Overlay Missing A/B Scenario Lines

- Bug ID: `BUG-0001`
- Status: `Done`
- Severity: `S2`
- Owner: `unassigned`
- Created: `2026-02-22`
- Updated: `2026-02-22`
- Affected Areas: `Compare mode chart`, `Stress overlay`, `Legend`, `Tooltip`

## Summary

In Compare mode, stress overlays render only one scenario line per configured stress scenario. The visible line corresponds to one portfolio path, so users cannot compare stress outcomes for both Portfolio A and Portfolio B.

## Reproduction Steps

1. Switch app mode to `Compare`.
2. Run a base simulation with both slots populated.
3. Add one stress scenario (e.g., Stock Crash) and wait for stress results.
4. Inspect chart overlays and legend.

## Expected Behavior

Each stress scenario renders two overlay lines: `<Scenario> (A)` and `<Scenario> (B)`, with legend/tooltip entries for both.

## Actual Behavior

Only one stress scenario line is rendered in Compare mode, effectively tied to one portfolio path.

## Scope and Impact

- Frequency: `always`
- User impact: `high` for compare-stress analysis
- Regression risk areas: compare chart rendering, stress panel run orchestration, compare workspace stress state

## Evidence

- User report and reproduced from current implementation path reading global `stress.result` in compare chart branch.
