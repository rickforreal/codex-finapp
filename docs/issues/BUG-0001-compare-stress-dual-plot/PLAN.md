# PLAN: Compare Stress Overlay Missing A/B Scenario Lines

- Bug ID: `BUG-0001`
- Scope: Compare stress execution/storage/rendering so each scenario overlays A and B lines.
- Non-goals: No stress editor UX changes, no API contract changes, no >2 portfolio compare expansion.

## Root Cause Hypothesis

Compare chart overlays are sourced from global `state.stress.result`, which represents a single stress run payload, instead of per-slot compare workspace stress results.

## Implementation Plan

1. Add compare-slot stress state actions/selectors in store for status/result writes.
2. Update stress panel effect to run stress test per compare slot and persist slot-specific results.
3. Update compare chart overlay rendering to draw `<Scenario> (A)` and `<Scenario> (B)` using same scenario color with solid/dashed distinction.
4. Update compare chart legend and tooltip to expose scenario A/B entries.

## Files / Modules Expected to Change

- `/Users/ricknayar/Development/codex/finapp/packages/client/src/store/useAppStore.ts`
- `/Users/ricknayar/Development/codex/finapp/packages/client/src/components/output/StressTestPanel.tsx`
- `/Users/ricknayar/Development/codex/finapp/packages/client/src/components/output/PortfolioChart.tsx`

## Testing Strategy

- Regression checks: `npm run typecheck`, `npm run lint`, `npm run build`
- Targeted manual QA:
  - Compare + Manual: one scenario produces two lines (`(A)` solid, `(B)` dashed)
  - Compare + Monte Carlo: same A/B stress overlay behavior
  - Partial failure preserves successful slot overlays and surfaces slot-specific error text

## Canonical Docs Impact

- No canonical doc impact.
  - Rationale: This corrects compare stress rendering/flow to match intended existing behavior without changing product contracts, data model, architecture, or documented feature scope.

## Risks and Mitigations

- Risk: compare stress async orchestration may overwrite active-slot panel data.
  - Mitigation: update per-slot stress state first, then sync active/fallback slot result for panel display.
- Risk: tooltip/legend clutter with dual scenario entries.
  - Mitigation: clear `(A)/(B)` labeling and compact line-style markers.

