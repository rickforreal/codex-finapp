# Compare Portfolios (SxS) — Acceptance

## Functional Acceptance

1. Compare mode access
- Command bar mode selector includes `Compare`.
- Compare is Planning-only in V1.
- First switch into Compare seeds Portfolio A from the currently open Planning/Tracking workspace.

2. Compare slot editing
- Sidebar switcher toggles active input slot (`Portfolio A` / `Portfolio B`).
- Edits in one slot do not mutate the other slot.

3. Compare simulation run
- Clicking Run Simulation in Compare mode executes both slots.
- Output shows both slots in chart, stats, and detail ledgers.
- Both slots use the same stochastic market sequence for comparison fairness.

4. Stats comparison
- Each summary metric card shows A value, B value, and signed delta.
- Values use existing real/nominal conventions and formatting.

5. Detail ledgers
- Left/right ledgers render side by side.
- Both ledgers support scrolling and stay usable on laptop-width screens.
- Spreadsheet expand is unavailable in Compare mode.

6. Stress comparison
- Shared scenario definitions apply to both slots.
- Results are shown for both slots with clear visual labeling.

7. Snapshot workflows
- Single snapshot files can load into left or right slot in Compare mode.
- Pair snapshots can replace both slots.
- Pair snapshots loaded to one side require explicit `Pair A` or `Pair B` selection.
- Snapshot load behavior is deterministic and never silently swaps sides.

## Regression Acceptance

1. Existing mode behavior
- Planning and Tracking continue to work as before.
- Tracking actuals workflows are unaffected.

2. Themes and visuals
- Compare mode surfaces render correctly under built-in themes.
- No unreadable chart/table/stats states in dark themes.

3. Automated gate
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.

## Edge-Case Acceptance

1. Partial failure handling
- If one compare slot fails to run, successful slot output remains visible.
- Error message identifies the failed slot.

2. Empty state handling
- Compare mode with no runs shows a clear pre-run empty state.

3. Snapshot compatibility
- Older single snapshots remain loadable after compare schema changes.
