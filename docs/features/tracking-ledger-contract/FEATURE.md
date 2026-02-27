# Tracking Detail Ledger Contract v1.0 (Actuals Anchors + Compare Read-Only Forks)

## Problem
Tracking mode has become ambiguous between planning-ledger behavior and spreadsheet-like behavior. Users need a strict contract for what is editable, what is derived, and when projections update.

## Goal
Define a predictable Tracking ledger contract that preserves FinApp as a planning/tracking tool (not a full accounting spreadsheet) while supporting fast capture of real-world actuals.

## Scope
- Slot `A` is the canonical source of Tracking actuals.
- Editable ledger fields in Tracking monthly view (Slot `A` only):
  - `Start Stocks`, `Start Bonds`, `Start Cash`
  - `Wd Stocks`, `Wd Bonds`, `Wd Cash`
- `Withdrawal Total` is computed (not editable).
- `Income` and `Expenses` are ledger read-only.
- Non-`A` compare ledger tabs are fully read-only.
- Tracking changes (ledger edits and input-panel changes) are stale-first and require explicit `Run Simulation`.
- Slot `A` month edit window: sequential (`lastEditedMonthIndex + 1`), bounded by horizon, with Month 1 editable initially.
- Same-row derived values must remain congruent immediately after edit.

## Non-Goals
- No expansion to finance-manager style transaction tracking.
- No server API contract changes for `/simulate`.
- No change to stress scenario editor UX.

## User Value
- Predictable editing behavior.
- Clear distinction between actuals vs projections.
- Cleaner compare semantics: one actual history, many what-if forks.
