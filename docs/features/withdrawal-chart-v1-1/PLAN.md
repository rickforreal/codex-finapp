# Plan: Withdrawal Chart v1.1 (MC Confidence Bands)

## Delta From Baseline
Baseline feature: `/Users/ricknayar/Development/codex/finapp/docs/features/withdrawal-chart/`

Changes from baseline assumptions:
- Baseline assumed MC withdrawal chart is representative-line only.
- v1.1 adds withdrawal percentile curves and confidence bands in MC.
- Compare mode now includes baseline-slot withdrawal bands (in addition to slot median lines).

Unchanged from baseline:
- Shared chart panel layout and synchronized hover model.
- Breakdown mode behavior (stacked areas, no bands).
- Stress overlay behavior and server-side compute topology.

## Implementation
1. Extend shared MC result contract with optional `withdrawalPercentileCurvesReal`.
2. Populate withdrawal percentile curves in TS and Rust Monte Carlo engines from existing monthly cross-run withdrawal matrix.
3. Keep `withdrawalP50SeriesReal` for compatibility, deriving from percentile p50.
4. Update Withdrawal Chart rendering:
- Single MC: 10-90 area, 25-75 area, p50 line.
- Compare MC: same bands for selected baseline slot, slot median lines preserved.
- Tooltip/legend include percentile context.
- Fallback to current p50-only path when percentile curves are missing.
5. Update canonical docs (`SPECS.md`, `SCENARIOS.md`, `DATA_MODEL.md`, `API.md`).
6. Add/extend server tests for ordering/parity/response shape.
