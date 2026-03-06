# CHANGE: Monte Carlo Summary Stats Cross-Run Aggregation

- Change ID: `CHG-0010`
- Status: `Done`
- Created: `2026-03-05`
- Updated: `2026-03-05`

## Why

Monte Carlo summary cards for monthly withdrawal metrics were derived from a single representative path, which caused high run-to-run variance and did not match user expectations for cross-run Monte Carlo aggregation.

## Scope

- Add server-side Monte Carlo month-aligned aggregation for real monthly withdrawal metrics (compute monthly cross-run p50 first, then summarize).
- Expose aggregated withdrawal stats in Monte Carlo response payload.
- Update client summary cards (#35-#39) to use cross-run aggregated values when Monte Carlo mode is active.
- Preserve existing manual-mode behavior and representative-path table/chart behavior.

## Non-goals

- No change to Monte Carlo run count or sampling algorithm.
- No change to representative-path selection logic for table/chart.
- No change to drawdown strategy or withdrawal strategy engine formulas.

## Surfaces Touched

- `packages/shared/src/domain/simulation.ts`
- `packages/server/src/engine/monteCarlo.ts`
- `packages/server/tests/engine/monteCarlo.test.ts`
- `packages/server/tests/routes/simulation.test.ts`
- `packages/client/src/components/output/SummaryStatsBar.tsx`
- `docs/SPECS.md`

## Classification Rationale

This is a minor change because it refines existing summary-metric semantics within established Monte Carlo output surfaces, without introducing new product capabilities or changing API route boundaries.

## Canonical Docs Impact

- `SPECS.md`
- `API.md`
- `DATA_MODEL.md`

No impact on `PRD.md`, `SCENARIOS.md`, `ARCHITECTURE.md`, or `ENGINEERING.md`.
