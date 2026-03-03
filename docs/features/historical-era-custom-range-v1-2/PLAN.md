# Plan: Historical Era Custom Range v1.2 (Event Snap)

## Delta From Baseline
- Baseline: `docs/features/historical-era-custom-range/`
- Changes in this wave:
  - Add magnetic snap behavior near mapped event months.
  - Apply snapping symmetrically to both slider thumbs.

## Decisions Locked
- Snap threshold: 1 month from a mapped event month.
- Scope: only event months within active dataset bounds.
- Behavior: nearest-event snap when in threshold; otherwise retain raw month.

## Implementation
1. Extend historical events helper with month-ordinal snap resolver.
2. Use resolver in custom slider thumb `onChange` handlers before start/end clamping.
3. Add helper unit tests for threshold and in-range filtering.

## Canonical Docs Impact
- `docs/SPECS.md`: add note for light magnetic snapping behavior.
- No impact: `docs/SCENARIOS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md`.
