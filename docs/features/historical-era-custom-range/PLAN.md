# Plan: Historical Era Custom Range (Month-Year)

## Decision Lock
- Add `HistoricalEra.Custom`.
- Add `customHistoricalRange` to `SimulationConfig`:
  - `{ start: { month, year }, end: { month, year } } | null`.
- Validation contract:
  - Required when `selectedHistoricalEra === custom`.
  - Must satisfy `start <= end` (month-year comparison).
- Custom range is inclusive on both boundaries.

## Implementation

### 1. Shared contracts and schemas
- Extend `HistoricalEra` enum with `Custom`.
- Add reusable month-year range types to shared simulation domain.
- Extend `SimulationConfig` with `customHistoricalRange`.
- Extend `simulateRequestSchema` refinement rules for Custom requirements.
- Extend historical summary route query contract to carry custom range params.

### 2. Server historical range resolver
- Refactor historical data utilities to resolve a single selected range from:
  - preset era definitions, or
  - explicit custom month-year input.
- Use this resolver for:
  - historical summary endpoint response content, and
  - Monte Carlo sampling source rows.
- Keep default behavior unchanged for preset eras.

### 3. Client store and persistence
- Add `customHistoricalRange` to:
  - `WorkspaceSnapshot`, `SnapshotState`, and live store state.
  - workspace/snapshot/config conversion helpers.
  - compare sync copy logic for `historicalEra` family.
- Add setter actions:
  - `setCustomHistoricalRange`.
  - `initializeCustomHistoricalRangeFromSelectedEra`.
- Ensure Tracking stale-state behavior matches existing historical-era updates.
- Preserve backward compatibility in snapshot load by defaulting missing values.

### 4. UI
- Add `Custom` option to Historical Era dropdown.
- On first switch to `Custom`, initialize to current preset span.
- Render two-thumb month-year slider with endpoint labels (`MMM YYYY`) when custom selected.
- Range updates call store setter and refetch historical summary for custom selection.
- Respect `readOnly` compare follower state for all custom controls.

### 5. Tests
- Shared schema tests for valid/invalid custom configs.
- Server tests for month-boundary filtering and custom summary query.
- Monte Carlo tests for custom range execution.
- Store/snapshot tests for custom range persistence and compare sync propagation.
- UI-level logic tests where applicable.

## Canonical Docs Impact
- `docs/SPECS.md` (Affordance #11a behavior/UI update).
- `docs/SCENARIOS.md` (Monte Carlo scenario with sidebar selector + custom flow).
- `docs/DATA_MODEL.md` (new config field).
- `docs/API.md` (new simulate + historical summary query contract details).
- `docs/ARCHITECTURE.md` (historical filtering resolver + MC input path).
- `docs/PRD.md`: No canonical doc impact expected (feature is within existing scope).

## Locked Defaults
- Dataset bounds are actual CSV bounds (currently Jul 1926 through Dec 2025).
- First switch to custom uses current preset span.
- Switching away and back to custom preserves previously selected custom range.
- Slider-only custom UX (no separate month/year inputs).
