# Compare Portfolios v2.1 — Differences-Only Parameter Table

## Problem Statement

Compare mode currently requires users to switch active slots in the input panel to remember how portfolio assumptions differ. This adds context-switch overhead and increases error risk during side-by-side analysis.

## Goal

Add a dense compare insight table that shows only parameter deltas across active compare slots (`A`..`H`), so users can quickly understand what changed without leaving the output context.

## Scope

In scope:
- New compare output panel: `Comparison Insight: Only Differences`.
- Table includes all editable input families.
- Only rows with true cross-slot differences are shown.
- Complex list-like inputs (phases, income events, expense events, glide path) use deterministic string summary rows.
- Panel is run-gated and based on current simulation mode config snapshots.
- Panel is hidden when there are no differences.

Out of scope:
- No changes to simulation algorithms or backend endpoints.
- No snapshot schema changes.
- No change to existing compare run orchestration semantics.

## Success Criteria

1. Users can see parameter differences across active slots in one panel, without switching sidebar slot context.
2. The panel only displays rows where active slot values differ.
3. No-difference states consume no vertical space (panel hidden).
4. Existing compare chart, stats, ledger, and stress behavior remains unchanged.

## Canonical Docs Impact

Expected updates:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/API.md`
- `docs/DATA_MODEL.md`

No expected updates:
- `docs/ARCHITECTURE.md`
- `docs/PRD.md`
- `docs/ENGINEERING.md`
