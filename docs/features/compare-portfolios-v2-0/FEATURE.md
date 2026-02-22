# Compare Portfolios v2.0 (2..8) — Feature Brief

## Problem Statement

Current Compare mode is fixed to two portfolios (A/B). This limits high-confidence strategy analysis where users need to evaluate multiple alternatives in one view without repeatedly loading snapshots.

## Goal

Expand Compare mode to support **2 through 8 active portfolios** while preserving fairness guarantees (shared stochastic conditions per run), snapshot portability, and planning-workspace isolation.

## Scope

In scope:
- Compare mode remains Planning-only.
- Compare slots scale from 2 to 8 (`A` through `H`).
- Shared chart always renders all active portfolios in Compare mode.
- Summary stats cards render all active portfolio values with baseline-relative deltas.
- Detail ledger switches from dual side-by-side panes to one ledger viewport with slot tabs.
- Compare slot lifecycle supports add/remove and clone seeding from an existing slot.
- Compare run orchestration uses bounded parallelism.
- Snapshot format supports N-slot compare payloads and remains backward-compatible with legacy single and pair snapshot files.

Out of scope:
- Tracking-mode compare.
- New server compare endpoint.
- User-defined slot names.

## Success Criteria

1. A user can configure and run any number of compare slots from 2 to 8.
2. Compare chart displays all active slots at once with stable slot identity and legend labels.
3. Stats cards present all active slots plus baseline-relative deltas for each metric.
4. Snapshot load/save remains deterministic and backward-compatible.
5. Existing Planning/Tracking workflows are unaffected.

## Canonical Docs Impact

Expected updates:
- `docs/SPECS.md` (Affordances #1, #3, #64, #65, #67–#72)
- `docs/SCENARIOS.md` (compare scenario update)
- `docs/DATA_MODEL.md` (compare state and snapshot model)
- `docs/API.md` (N-slot orchestration, unchanged endpoint surface)
- `docs/ARCHITECTURE.md` (store shape, selector boundaries, run flow)

No expected updates:
- `docs/PRD.md` (intent unchanged)
- `docs/ENGINEERING.md` (workflow unchanged)
