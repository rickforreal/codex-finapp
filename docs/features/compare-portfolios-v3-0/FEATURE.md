# Compare Portfolios v3.0 — Always-On Compare Within Planning/Tracking

## Problem Statement

Compare is currently a separate app mode. This forces users to context-switch between Planning/Tracking and Compare even though compare is fundamentally an input/output workspace pattern that can apply in both modes.

In Tracking, this separation blocks realistic workflows where users want to compare strategy forks from their current tracked state.

## Goal

Make compare always available in the sidebar slot manager while reducing mode complexity to only `Planning` and `Tracking`.

## Scope

In scope:
- Remove Compare from app mode toggle and mode contracts.
- Keep compare slot workspace model (`A`..`H`) but start with slot `A` only.
- Activate compare output behavior when active slot count is greater than 1.
- Support compare workflows in Tracking with canonical hard-floor boundary from slot `A`.
- Keep `A` non-removable and reduce compare min slots from 2 to 1.
- Run all active slots in multi-slot workflows in both Planning and Tracking.
- Hard-break legacy snapshots with `mode: "compare"`.

Out of scope:
- No simulation algorithm changes.
- No new backend endpoints.
- No new theme/token contract work.

## Success Criteria

1. Users can compare multiple portfolios without switching into a dedicated Compare mode.
2. Planning/Tracking mode toggle has two options only.
3. Single-slot behavior remains equivalent to existing single-portfolio UX.
4. Multi-slot behavior reuses compare chart/stats/ledger/stress in both Planning and Tracking.
5. Tracking compare follows canonical hard-floor behavior from slot `A`.

## Canonical Docs Impact

Expected updates:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`

No expected updates:
- `docs/PRD.md`
- `docs/ENGINEERING.md`
