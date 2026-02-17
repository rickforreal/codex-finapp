# Compare Portfolios (SxS) — Implementation Plan

## Summary

Phase 14 introduces a new Planning-only mode, **Compare**, that lets users evaluate two portfolio configurations side by side. V1 compares exactly two portfolios (A/B) and focuses on three outcomes:

1. Shared chart with both portfolios plotted together
2. Shared stats with A/B values and deltas
3. Side-by-side detail ledgers

Stress scenarios are shared and run against both portfolios. Snapshot workflows support loading existing single snapshots and new pair snapshots with explicit target selection.

## Scope

In scope (V1):
- New `Compare` view mode (Planning-only).
- Two compare slots (`left`, `right`) with independent input workspaces.
- Input sidebar slot switcher to edit A or B using the same controls.
- One-click run that executes both slots using the selected simulation type.
- Shared chart rendering both slots.
- Shared stats cards showing both values and deltas.
- Dual detail ledgers with fixed scroll containers (no spreadsheet expansion in Compare).
- Shared stress scenario configuration applied to both slots.
- Snapshot load/save support for both single and pair formats with deterministic prompts.

Out of scope (V1):
- More than two compared portfolios.
- Tracking-mode compare support.
- New server compare endpoint (client orchestrates existing endpoints).

## UX Decisions Locked

1. Compare mode is available in Planning only.
2. Stats use dual-value cards (`A`, `B`, `Delta`) per metric.
3. Snapshot loading prompts for explicit target (`Left`, `Right`, `Replace both`).
4. Compare mode accepts both single and pair snapshot files.
5. Loading a pair file into one side prompts for source slot (`Pair A` or `Pair B`).

## Data and State Design

### App mode
- Extend `AppMode` with `compare`.

### Compare state
- Add compare workspace state with two slots (`left`, `right`) and active slot selection for sidebar editing.
- Keep Planning and Tracking state unchanged.
- Keep Compare isolated from Planning and Tracking caches.
- On switching into Compare mode from Planning or Tracking, seed Slot A from the currently open workspace.
- Initialize Slot B as a clone of Slot A on first Compare entry.

### Output caches
- Maintain per-slot simulation caches (`manual`, `monteCarlo`, status/error).
- Maintain compare stress results keyed by slot.

### Snapshot model
- Add versioned compare payload:
  - `compareWorkspace.left`
  - `compareWorkspace.right`
  - `compare.activeInputSlot`
  - compare output caches and compare stress caches
- Preserve compatibility:
  - Existing single snapshots can load into `Left` or `Right`.
  - Pair snapshots can load both or a selected pair slot into one side.

## UI / Component Changes

1. Command bar
- Extend mode selector: `Planning | Tracking | Compare`.
- Keep simulation type selector shared.
- Run Simulation triggers both slots in Compare mode.
- Snapshot load uses explicit import target prompts in Compare mode.

2. Sidebar
- Add compact compare slot switcher near top: `Portfolio A` / `Portfolio B`.
- Existing input cards bind to currently selected slot state.

3. Summary stats
- Keep current metric set.
- Each card shows:
  - A value
  - B value
  - delta (signed)

4. Chart
- Manual: two lines (A/B).
- Monte Carlo: two median lines with distinguishable bands/legend styling.
- Tooltip includes both slots at hovered month.

5. Detail table
- Render two table panes in same section (left/right).
- Keep monthly/annual and breakdown controls synchronized across both.
- Disable spreadsheet expand in Compare mode.

6. Stress test
- Scenario editor remains single shared panel.
- Stress run executes for both slots.
- Comparison output shows base/scenario metrics for each slot.

## API Strategy

No new backend endpoint in V1.

Client orchestration:
- `POST /simulate` called per slot.
- `POST /stress-test` called per slot.
- Existing request/response schemas unchanged.
- Stochastic parity requirement:
  - Compare runs must apply the same stochastic stream to both slots.
  - Manual mode: use one generated monthly-return stream and apply it to both slots.
  - Monte Carlo mode: use a shared seed/sampling stream so both slots experience identical market path sampling.

## Failure Handling

1. One slot invalid
- Block run with slot-specific validation message.

2. Partial failures
- If one slot run fails, preserve successful slot output and show per-slot error.

3. Snapshot ambiguity
- Always prompt for target side in Compare mode.
- Pair-to-single-side import requires explicit Pair A/B selection.

## Testing Plan

Unit/store:
- Compare state initialization and slot isolation.
- Active slot edits only mutate selected slot.
- Compare selectors resolve correct slot outputs.
- Snapshot parse/load flows for single and pair files.

Component:
- Mode toggle includes Compare.
- Sidebar slot switcher updates bound controls.
- Stats cards render A/B/Delta layout.
- Detail ledgers render side by side and remain scrollable.

Integration:
- Compare run performs two simulations and renders both series.
- Compare stress run applies same scenarios to both slots.
- Snapshot load flows:
  - single -> left/right
  - pair -> replace both
  - pair -> side import with A/B pick

Regression gate:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Deliverables

1. `docs/features/compare-portfolios/PLAN.md` (this file)
2. `docs/features/compare-portfolios/TASKS.md`
3. `docs/features/compare-portfolios/ACCEPTANCE.md`
4. Canonical docs updates:
  - `docs/SPECS.md`
  - `docs/DATA_MODEL.md`
  - `docs/API.md`
