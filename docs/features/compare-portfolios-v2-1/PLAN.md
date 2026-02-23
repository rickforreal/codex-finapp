# Compare Portfolios v2.1 — Implementation Plan

## Summary

Add a run-gated, differences-only parameter table in Compare mode that renders between Summary Stats and Chart. The table covers all editable input families and only includes rows with normalized value deltas across active slots.

## Delta From Baseline

Baseline reference:
- `docs/features/compare-portfolios-v2-0/`

Changed assumptions versus baseline:
1. Compare output gains a new insight panel focused on input-parameter deltas.
2. Compare analysis surface now includes both output-metric deltas (stats) and configuration deltas (new table).
3. Compare parameter visibility is run-gated to snapshot config state from the last run.

Unchanged assumptions versus baseline:
1. Compare remains Planning-only.
2. Existing compare run fairness and slot orchestration remain unchanged.
3. Existing backend route surface remains unchanged.

## Public Interface and Type Changes

- No backend API changes.
- No shared data-contract changes.
- New client-only diff engine API:
  - `buildCompareParameterDiffs({ slotOrder, baselineSlotId, slotConfigsById })`.

## Implementation Slices

1. Diff engine
- Add `packages/client/src/lib/compareParameterDiffs.ts`.
- Implement canonical row catalog + normalization + baseline deviation flags.
- Include scalar rows and structured summary rows.

2. Compare panel component
- Add `packages/client/src/components/output/CompareParameterDiffTable.tsx`.
- Resolve current-mode config snapshots from compare slot run caches.
- Hide on missing run context or no differences.

3. App shell integration
- Update `packages/client/src/components/layout/AppShell.tsx`.
- Render panel between `SummaryStatsBar` and `PortfolioChart`.

4. Tests
- Add `packages/client/src/lib/compareParameterDiffs.test.ts`.
- Cover identical configs, scalar delta detection, strategy-type divergence, id-insensitive list summaries, baseline flags, and mixed multi-slot counts.

5. Canonical docs
- Update `docs/SPECS.md` and `docs/SCENARIOS.md` for new compare affordance behavior.

## Failure and Edge Handling

1. Missing run snapshots
- If any active slot lacks current-mode `configSnapshot`, panel stays hidden.

2. No differences
- Panel stays hidden.

3. Strategy parameter mismatch
- Unified strategy parameter rows display `N/A` when a parameter is not defined for a slot's strategy type.

4. List id noise
- List summary diff ignores ids and compares deterministic normalized strings.

## Validation Plan

Automated:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Manual:
- Compare with identical slots (panel hidden).
- Compare with one scalar difference (single/few rows).
- Compare with strategy type mismatch (`N/A` behavior).
- Compare with multiple slots and mixed differences.

## Canonical Docs Impact

Must update:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/API.md`
- `docs/DATA_MODEL.md`

No changes expected for:
- `docs/ARCHITECTURE.md`
- `docs/PRD.md`
- `docs/ENGINEERING.md`
