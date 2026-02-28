# Compare Portfolios v3.1 — Lockable/Syncable Input Parameters (A-Master)

## Problem Statement

Compare slots currently support independent editing, but users cannot selectively keep chosen assumptions aligned to Slot `A` while still exploring local deviations in follower slots.

## Goal

Introduce lockable/syncable input-parameter behavior for compare slots where Slot `A` is the immutable sync master and follower slots (`B..H`) can opt out per family/instance and later resync.

## Scope

In scope:
- Section-level lock/sync controls for all input families.
- Instance-level lock/sync controls for Spending Phases, Income Events, and Expense Events.
- `A` remains editable while locked; synced followers are read-only.
- Unsync/resync behavior at family and instance granularity per follower slot.
- Global list-lock exact mirror semantics.
- Instance-lock merge semantics and delete propagation.
- Snapshot/bookmark persistence for compare sync state.

Out of scope:
- Backend/API changes.
- Tracking detail-ledger lock model changes.
- Simulation algorithm changes.

## Success Criteria

1. Users can lock any input family from Slot `A` and keep followers synced/read-only.
2. Users can unsync and resync a follower slot per family/instance.
3. List-family global lock mirrors A exactly; instance lock merges by instance id.
4. Compare sync state survives snapshot/bookmark round-trips.

## Canonical Docs Impact

Expected updates:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/DATA_MODEL.md`
- `docs/ARCHITECTURE.md`

No expected updates:
- `docs/API.md`
- `docs/PRD.md`
- `docs/ENGINEERING.md`
