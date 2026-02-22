# CHANGE: Monte Carlo Detail Ledger Start Total (p50) Reference Column

- Change ID: `CHG-0002`
- Status: `Done`
- Created: `2026-02-22`
- Updated: `2026-02-22`

## Why

Tracking users need a direct month-level comparison between their ledger `Start Total` and Monte Carlo central tendency for that same month. The current Monte Carlo table context does not provide an explicit per-row p50 start reference.

## Scope

- Add a `Start Total (p50)` column in Monte Carlo mode only.
- Position the new column between `Age` and `Start Total`.
- Add subtle column shading and a differentiated tone so it reads as a reference column.
- Add an info tooltip next to the column label with concise explanatory copy.
- Apply behavior consistently to monthly, annual, and compare ledgers when Monte Carlo mode is active.

## Non-goals

- No API or schema contract changes.
- No changes to Monte Carlo run count or server route behavior.
- No conversion to a full percentile-expanded table.
- No changes to Manual-mode column set or edit behavior.

## Surfaces Touched

- `packages/client/src/lib/detailTable.ts`
- `packages/client/src/components/output/DetailTable.tsx`
- `packages/client/src/lib/detailTable.test.ts`
- `docs/SPECS.md`
- `docs/SCENARIOS.md`

## Classification Rationale

This is a minor change (not a feature wave, not an issue) because:
- It is a targeted UI/UX refinement in an existing output surface.
- It does not alter data contracts, architecture boundaries, or product scope.

## Canonical Docs Impact

- `SPECS.md`
- `SCENARIOS.md`

No updates are expected for `PRD.md`, `DATA_MODEL.md`, `API.md`, `ARCHITECTURE.md`, or `ENGINEERING.md` because this change is presentation-layer behavior and copy refinement within existing Monte Carlo output semantics.
