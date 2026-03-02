# Feature: Historical Era Custom Range (Month-Year)

## Problem
The Monte Carlo Historical Era selector only supports fixed preset ranges. Users cannot target a specific month-year window (for example, excluding early/late months inside a preset) even though the underlying dataset is monthly.

## Goal
Add a `Custom` era option that lets users define an inclusive month-year range via a two-thumb slider. The selected custom range must drive both historical summary stats and Monte Carlo sampling.

## Scope
- Add `HistoricalEra.Custom` and `customHistoricalRange` to simulation contracts.
- Support custom-range query parameters on `GET /api/v1/historical/summary`.
- Refactor historical filtering so preset and custom ranges share the same inclusive month-year resolver.
- Add client state/snapshot wiring and compare lock/sync behavior for custom range.
- Add Historical Data Summary UI for two-thumb month-year range selection when `Custom` is active.
- Update canonical docs and regression tests.

## Non-goals
- No new simulation mode.
- No auto-run on range changes (run remains explicit via Run Simulation).
- No additional range text inputs (slider with endpoint labels only).
