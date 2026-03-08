# Acceptance Criteria: Absolute Date Core Parameters

## Core Parameter UI Updates
- [ ] "Starting Age" input is replaced by a "Birth Date" (Month/Year) picker.
- [ ] "Retirement Start" is renamed to "Portfolio Start" (Month/Year).
- [ ] "Retirement Duration" is replaced by "Portfolio End" (Month/Year).
- [ ] "Withdrawals Start At" input is completely removed.

## Spending Phase UI Updates
- [ ] Spending Phase start and end fields use Month/Year pickers instead of integer year inputs.
- [ ] The store enforces that there is always at least 1 Spending Phase (the last phase cannot be deleted).
- [ ] `minMonthlySpend` and `maxMonthlySpend` inputs can be left blank (optional).
- [ ] The store logic for maintaining contiguous phases (no gaps, no overlaps) works flawlessly with Month/Year objects.

## Simulation Engine
- [ ] The simulation loop calculates the total run duration based on the months between `portfolioStart` and `portfolioEnd`.
- [ ] The simulation applies withdrawals based *only* on whether the current simulated month falls within an active Spending Phase. If outside a phase, or if the phase has $0 bounds, the withdrawal logic handles it appropriately.
- [ ] If a Spending Phase has no `min` or `max` bounds defined, the withdrawal strategy output is not clamped.
- [ ] All 12 Withdrawal Strategies continue to function correctly without relying on a numeric `startingAge`.

## Detail Ledger
- [ ] The "Age" column in the detail ledger calculates the user's exact age (e.g., 65.5) dynamically by subtracting `birthDate` from the row's simulated Month/Year.
- [ ] The "Month 1" row accurately reflects the `portfolioStart` date.

## Event Bounds Validation
- [ ] The application prevents the creation or updating of Income Events, Expense Events, or Stress Scenarios that occur *before* the `portfolioStart` date.

## Code Quality
- [ ] Shared schemas (`@finapp/shared`) strictly enforce the chronological ordering of the new parameters (`birthDate` < `portfolioStart` < `portfolioEnd`).
- [ ] All client and server test suites are updated to use the new `SimulationConfig` shape.
- [ ] `npm run typecheck`, `npm run lint`, and `npm test` all pass.
