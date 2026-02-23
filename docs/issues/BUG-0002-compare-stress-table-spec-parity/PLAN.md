# PLAN: Compare Stress Table Spec-Parity Restoration

- Bug ID: `BUG-0002`
- Scope: Compare-mode stress table data model and rendering parity with Stress Test specs.
- Non-goals: No changes to stress scenario editor UX, chart overlay logic, API contracts, or backend compute behavior.

## Root Cause Summary

Compare stress table rendering drifted into a reduced model that did not mirror the full metric set and row semantics used in single-mode stress output, especially for monthly mean/median and scenario row composition.

## Implementation Plan

1. Introduce a pure compare stress table model builder that emits sectioned rows (`Base`, `Scenario: <label>`) with per-slot values.
2. Resolve scenario metrics by `scenarioId` per slot (not index-order assumptions).
3. Include full base core rows and scenario core rows plus delta rows where specified.
4. Keep MC-only rows conditional (`Probability of Success`, `Δ Success vs. Base`).
5. Replace compare branch table JSX in `StressTestPanel` to render from the model.
6. Keep single-slot stress table branch unchanged.
7. Add unit tests for row completeness, scenario-id alignment, MC/manual row conditions, and missing-data behavior.

## Files / Modules Expected to Change

- `/Users/ricknayar/Development/codex/finapp/packages/client/src/lib/compareStressTableModel.ts` (new)
- `/Users/ricknayar/Development/codex/finapp/packages/client/src/lib/compareStressTableModel.test.ts` (new)
- `/Users/ricknayar/Development/codex/finapp/packages/client/src/components/output/StressTestPanel.tsx`

## Testing Strategy

- Unit tests for pure model builder:
  - full row set in base + scenarios
  - scenario alignment by `scenarioId`
  - MC-only rows present only in MC
  - sparse/missing slot data uses `—`
  - mean/median values computed for base and scenario rows
- Regression checks:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`

## Canonical Docs Impact

- No canonical doc impact.
  - Rationale: This implementation restores behavior to existing documented intent in `docs/SPECS.md` Affordances `#59` and `#71` without changing product scope or contracts.

## Risks and Mitigations

- Risk: table width growth with up to 8 slots.
  - Mitigation: keep existing horizontal overflow container and compact text sizing.
- Risk: scenario mismatch across slot payloads.
  - Mitigation: strict `scenarioId` lookup and `—` fallback when missing.
