# Compare Portfolios (SxS) — Tasks

- [ ] CP1: Add compare mode and shared types
Phase: 14 (Compare Portfolios)
Dependencies: none
Acceptance Criteria:
[AC1] Shared `AppMode` includes `compare`.
[AC2] Client store types define compare slot and compare workspace structures.
[AC3] Typecheck passes with no regressions in existing modes.

- [ ] CP2: Add compare store state and selectors
Phase: 14 (Compare Portfolios)
Dependencies: CP1
Acceptance Criteria:
[AC1] Store has isolated left/right compare workspaces and active input slot state.
[AC2] Compare simulation/stress caches are independent from Planning/Tracking caches.
[AC3] Selectors return slot-specific config and outputs.
[AC4] First switch to Compare seeds Slot A from the current Planning/Tracking workspace and initializes Slot B from Slot A.

- [ ] CP3: Add command bar and sidebar compare controls
Phase: 14 (Compare Portfolios)
Dependencies: CP2
Acceptance Criteria:
[AC1] Command bar mode selector includes Compare.
[AC2] Sidebar includes Portfolio A/B switcher.
[AC3] Editing controls update only the selected compare slot.

- [ ] CP4: Implement compare run orchestration
Phase: 14 (Compare Portfolios)
Dependencies: CP2
Acceptance Criteria:
[AC1] Compare run triggers two simulation requests (left/right).
[AC2] Status and errors are tracked per slot and surfaced in UI.
[AC3] Existing Planning/Tracking run behavior remains unchanged.
[AC4] Compare run uses shared stochastic inputs so both slots receive identical market randomness for the same month/path index.

- [ ] CP5: Render compare chart and dual-value stats
Phase: 14 (Compare Portfolios)
Dependencies: CP4
Acceptance Criteria:
[AC1] Chart renders both slot series with legend and tooltip values for both.
[AC2] Stats cards show A, B, and signed delta for each metric.
[AC3] Monte Carlo compare renders both median paths and confidence context legibly.

- [ ] CP6: Render side-by-side detail ledgers
Phase: 14 (Compare Portfolios)
Dependencies: CP4
Acceptance Criteria:
[AC1] Detail table renders left/right panes in Compare mode.
[AC2] Pane width is constrained; horizontal/vertical scrolling works.
[AC3] Spreadsheet expand control is disabled/hidden in Compare mode.

- [ ] CP7: Apply stress scenarios to both compare slots
Phase: 14 (Compare Portfolios)
Dependencies: CP4
Acceptance Criteria:
[AC1] Shared stress scenario set runs against both slots.
[AC2] Stress results are stored and displayed per slot.
[AC3] Stress chart/table outputs clearly identify slot A vs B.

- [ ] CP8: Extend snapshot support for single + pair compare workflows
Phase: 14 (Compare Portfolios)
Dependencies: CP2
Acceptance Criteria:
[AC1] Snapshot schema supports compare pair payloads.
[AC2] Compare mode load prompts for target: Left/Right/Replace both.
[AC3] Pair snapshot side-load prompts for Pair A/B slot selection.
[AC4] Existing single snapshot files remain loadable.

- [ ] CP9: Add tests and run regression gate
Phase: 14 (Compare Portfolios)
Dependencies: CP5, CP6, CP7, CP8
Acceptance Criteria:
[AC1] Unit/integration tests cover compare run orchestration and snapshot flows.
[AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
[AC3] Manual QA passes checklist in `docs/features/compare-portfolios/ACCEPTANCE.md`.
