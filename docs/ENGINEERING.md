# Engineering — Retirement Forecasting App

## 1. Overview

This document is the Engineering Manager's manifest. It defines **how** the application is built: in what order, to what standard, and with what workflow. It does not specify what the system is made of (see **ARCHITECTURE.md**) or what the user experiences (see **SPECS.md** and **SCENARIOS.md**). It is written for the developer — human or AI — who will execute the build.

**Document relationships:**

| Document | Role |
|---|---|
| PRD.md | Why the product exists |
| SPECS.md | What the user sees and does (65 affordances). UX Affordances are referred to by their number (e.g. "#7) in this document. |
| SCENARIOS.md | How real users exercise the features (23 scenarios) |
| ARCHITECTURE.md | What the system is made of (tech stack, structure, data flow) |
| WITHDRAWAL_STRATEGIES.md | The mathematical formulas the engine implements |
| DATA_MODEL.md | The TypeScript type definitions |
| API.md | The HTTP endpoint contracts |
| **ENGINEERING.md** | **How to build it (this document)** |
| TASKS.md | The individual work items (derived from this document) |
| PROGRESS.txt | Reverse-chronological build log |
| AGENTS.md | Ground rules for the AI implementer |
| Historical-Returns.csv | Historical returns for Stocks, Bonds and Cash |

---

## 2. Development Environment

### 2.1 Prerequisites

- Node.js ≥ 20 LTS
- npm ≥ 10
- TypeScript ≥ 5.4 (installed as devDependency, not global)
- Git

### 2.2 Initial Setup

```bash
git clone <repo-url>
cd retirement-forecaster
npm install          # installs all workspace dependencies
npm run build        # builds shared package first, then client + server
```

### 2.3 Dev Server Startup

```bash
npm run dev          # starts both client (Vite) and server (Fastify) concurrently
```

The client dev server proxies API requests to the Fastify server. Both support hot reload — Vite via HMR, Fastify via `tsx watch` or equivalent.

### 2.4 Environment Variables

Minimal for v1:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Fastify server port |
| `CLIENT_PORT` | `5173` | Vite dev server port |
| `LOG_LEVEL` | `info` | Fastify log level |

No secrets, no API keys, no database connection strings. The server is stateless and authenticates nothing.

---

## 3. Build Phases

### 3.1 Philosophy

The application is built in **12 phases**, ordered so that each phase produces a verifiable layer of functionality on top of the previous ones. The guiding principles:

**Verify early, verify often.** Each phase has an explicit Definition of Done (Section 4). A phase is not complete until every item in its DoD checklist passes. No phase is started until the previous phase's DoD is fully met.

**Engine before UI.** The simulation engine is the financial core — if its math is wrong, nothing else matters. Phase 2 builds and tests the engine before any UI exists. Phase 6 adds all 12 strategies and tests each one. The engine is verified through automated tests, not visual inspection.

**Inputs before outputs.** The input panel (Phase 3) is built before the output displays (Phases 4–5). This ensures the Zustand store is fully wired and the data model is exercised before any rendering logic depends on it.

**Core before extensions.** Manual mode (Phases 2–6) is fully working before Monte Carlo (Phase 8), Tracking Mode (Phase 9), or Stress Testing (Phase 10). Each extension builds on a stable foundation.

**Polish last.** Animations, transitions, error boundaries, and edge-case handling (Phase 12) come after all features work correctly. Never polish a feature that might change.

### 3.2 Phase Summary

| Phase | Name | Server | Client | Key Deliverable |
|---|---|---|---|---|
| 1 | Foundation | Fastify skeleton, health endpoint | React shell, Zustand store scaffold, Tailwind | Project compiles and runs |
| 2 | Simulation Engine Core | Simulation loop, Constant Dollar, Bucket drawdown, `/simulate` endpoint | — | Engine produces correct numbers (verified by tests) |
| 3 | Input Panel | — | All sidebar sections wired to store | Every input renders and updates state |
| 4 | Output: Chart & Stats | — | Portfolio chart, summary stats bar | Simulation results visualized |
| 5 | Output: Detail Table | — | Virtualized table with toggles and sorting | Monthly/annual data browsable |
| 6 | All Withdrawal Strategies | 11 remaining strategies + registry | Strategy selector + dynamic params | All 12 strategies produce correct withdrawals |
| 7 | Drawdown & Events | Rebalancing drawdown, event processing | Income/expense event UI, drawdown config | Events and drawdown affect simulation |
| 8 | Monte Carlo | MC runner, historical data loading | Confidence bands, PoS stat, era selector | MC mode fully functional |
| 9 | Tracking Mode | Deterministic reforecast endpoint | Mode toggle, editable actuals, stale indicators | Actuals drive re-forecast |
| 10 | Stress Testing | Stress engine | Scenario cards, comparison charts | Stress scenarios runnable and comparable |
| 11 | Undo/Redo & Snapshots | — | Undo middleware, snapshot save/load | State management features complete |
| 12 | Polish & Hardening | Error responses, logging | Animations, error boundaries, CSV export, responsive fixes | Production-ready |

---

### Phase 1: Foundation

**Goal:** The monorepo compiles, dev servers start, and the client renders a shell layout that communicates with the server.

**Server:**
- Fastify app with CORS and structured logging.
- `GET /api/v1/health` returns `{ status: "ok" }`.
- Server starts and listens on the configured port.

**Shared:**
- Package structure with `domain/`, `contracts/`, `ui/`, `constants/` directories.
- Placeholder type files with at least `SimulationConfig` and `SimulationResult` stubs.
- Enums: `AssetClass`, `WithdrawalStrategyType`, `SimulationMode`.
- ESLint rule enforcing the import boundary: `contracts/` and `domain/` cannot import from `ui/`.

**Client:**
- Vite + React + Tailwind configured.
- `AppShell` layout: sidebar placeholder (empty, correct width) + output area placeholder.
- `CommandBar` with static placeholder buttons (no functionality).
- Zustand store created with empty slices matching the ARCHITECTURE store tree.
- Tailwind custom theme with the app's color palette from SPECS.md.
- API client wrapper that calls the health endpoint and logs the response on app mount.

**Tooling:**
- `npm run dev` starts both client and server concurrently.
- `npm run build` compiles all three packages.
- `npm run lint` runs ESLint across all packages.
- `npm run typecheck` runs `tsc --noEmit` across all packages.
- `npm test` runs Vitest (no tests yet, but the runner works).

**Definition of Done:**
- [ ] `npm install` succeeds from a clean clone.
- [ ] `npm run build` compiles with zero errors.
- [ ] `npm run dev` starts both servers.
- [ ] Browser shows the app shell with sidebar and output area.
- [ ] Browser console logs `{ status: "ok" }` from the health endpoint.
- [ ] `npm run lint` passes with zero warnings.
- [ ] `npm run typecheck` passes.
- [ ] Shared package import boundaries enforced (a test import of `ui/colors` from `contracts/api` fails lint).

---

### Phase 2: Simulation Engine Core

**Goal:** The server can run a complete retirement simulation for the Constant Dollar strategy with Bucket drawdown, and return correct results via the API. No UI displays results yet — verification is through unit tests and direct API calls.

**Server:**
- `engine/simulator.ts`: the core month-by-month loop (see ARCHITECTURE Section 7.2).
- `engine/strategies/constantDollar.ts`: implements the Constant Dollar formula (see WITHDRAWAL_STRATEGIES.md Strategy 1).
- `engine/drawdown/bucket.ts`: implements the Bucket drawdown algorithm (see WITHDRAWAL_STRATEGIES.md Drawdown A).
- `engine/helpers/pmt.ts`: PMT financial function (needed by later strategies but good to build and test now).
- `engine/helpers/rounding.ts`: the `roundToCents` function.
- `engine/helpers/inflation.ts`: inflation adjustment utilities.
- `engine/helpers/returns.ts`: random normal return generator (for Manual mode stochastic returns).
- `POST /api/v1/simulate` route: accepts a `SimulateRequest`, validates via Zod, runs the engine, returns `SimulateResponse`.

**Shared:**
- Full `SimulationConfig` type (all fields, not just stubs).
- `SinglePathResult` type with monthly time series.
- `SimulateRequest` and `SimulateResponse` contracts.
- Zod schema for `SimulateRequest`.

**Tests (required before phase is complete):**
- `constantDollar.test.ts`: Year 1 calculation, 5-year sequence with known returns, inflation compounding, edge cases (zero portfolio, final year).
- `bucket.test.ts`: sequential depletion across 3 asset classes, partial fulfillment, single-class depletion.
- `simulator.test.ts`: full 10-year simulation with predetermined monthly returns, verifying end-of-year withdrawal calculation, monthly application, and final portfolio value.
- `pmt.test.ts`: 5+ cases validated against a financial calculator.
- `rounding.test.ts`: boundary cases (.5, .4999, .5001, negatives, zero).
- `routes/simulation.test.ts`: valid request returns 200, invalid request returns 400 with structured error.

**Definition of Done:**
- [ ] All unit tests pass.
- [ ] A curl/httpie call to `POST /api/v1/simulate` with a valid Constant Dollar config returns a complete `SimulateResponse` with monthly time series.
- [ ] The response's Year 1 withdrawal matches the hand-calculated expected value: `portfolio × rate`.
- [ ] The response's Year 2 withdrawal = Year 1 × (1 + inflation).
- [ ] The Bucket drawdown depletes Cash first (default order), then Bonds, then Stocks — verifiable in the response's per-asset-class balances.
- [ ] Invalid requests (missing fields, out-of-range values) return 400 with field-level error details.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.

---

### Phase 3: Input Panel

**Goal:** Every sidebar section renders correctly with all its controls, and every input change updates the Zustand store. No simulation is triggered — this phase is pure input wiring.

**Client:**
- `CoreParameters` section: Starting Age (#4), Withdrawals Start At (#4b), Retirement Start Date (#4c), Retirement Duration (#5), Inflation Rate (#6).
- `StartingPortfolio` section: Stocks (#7), Bonds (#8), Cash (#9), Total Display with donut chart (#10).
- `ReturnAssumptions` section: Expected Return and Std Dev for each asset class (#11–#16). Visible only in Manual mode.
- `SpendingPhases` section: Phase cards (#17), Add Phase (#18), Remove Phase (#19). Cascade logic for year boundaries.
- `WithdrawalStrategy` section: Strategy Selector dropdown (#20), Info Tooltip (#22). Parameter panel shows Constant Dollar params only (other strategies in Phase 6).
- `DrawdownStrategy` section: Bucket/Rebalancing segmented toggle (#23), Bucket priority list (#24). Rebalancing UI deferred to Phase 7.
- `CommandBar`: Mode Toggle (#1) wired to store, Simulation Mode Selector (#2) wired, Run Simulation button (#3) visible but calls the API (results are not displayed yet — they go into the store cache).

**Shared components built in this phase:**
- `NumericInput`, `CurrencyInput`, `PercentInput`, `SegmentedToggle`, `Dropdown`, `MonthYearPicker`, `ToggleSwitch`, `DonutChart`, `CollapsibleSection`.

**Store verification:** Every input must round-trip: render the default value from the store, accept user input, update the store, and re-render the updated value. This is verified by inspection for each control.

**Definition of Done:**
- [ ] Every sidebar section renders and is visually consistent with SPECS.md descriptions.
- [ ] Every input accepts user input and updates the corresponding Zustand store field.
- [ ] The donut chart (#10) updates reactively when portfolio values change.
- [ ] Spending phase cascade logic works: changing a phase's end year updates the next phase's start year.
- [ ] Adding a 4th phase works; adding a 5th is prevented.
- [ ] Removing phases works; removing the last phase is prevented.
- [ ] The strategy selector shows all 12 strategy names (only Constant Dollar shows parameters; others show "Parameters coming in Phase 6").
- [ ] Mode toggle switches between Planning and Tracking (store updates, no behavioral difference yet).
- [ ] Simulation mode selector switches between Manual and Monte Carlo (store updates, Return Assumptions section visibility toggles).
- [ ] Clicking Run Simulation sends a valid API request and stores the response (viewable in browser devtools/React devtools, no UI display yet).
- [ ] Collapsible sections expand/collapse with chevron animation.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] Phase 2 tests still pass (regression check).

---

### Phase 4: Output — Chart & Stats

**Goal:** Simulation results are visualized. The user can configure inputs (Phase 3), click Run Simulation, and see a portfolio chart and summary statistics.

**Client:**
- `SummaryStatsBar` with `StatCard` components: Total Drawdown Nominal (#33), Total Drawdown Real (#34), Median Monthly (#35), Mean Monthly (#36), Std. Deviation (#37), 25th Percentile (#38), 75th Percentile (#39), Terminal Value (#40). Probability of Success (#41) is present but hidden (MC mode only, built in Phase 8).
- `PortfolioChart`: line chart for Manual mode single path (#42). Real/Nominal toggle (#43). Asset class breakdown toggle (#44) — stacked area view.
- `ChartTooltip` (#47): crosshair + data display on hover.
- `ZoomPanControls` (#48): range selector bar below chart.
- Color-coded terminal value card (green for survival, red for depletion) (#40).

**Data flow verification:** Change an input → click Run → verify chart and stats update. Change inputs again → stats show stale data from previous run → click Run again → verify update.

**Definition of Done:**
- [ ] After clicking Run Simulation, the portfolio chart renders a line showing portfolio value over time.
- [ ] Summary stats bar shows all 8 stat cards (9th hidden) with correct values.
- [ ] Terminal value card shows green for surviving portfolios, red for depleted ones.
- [ ] Real/Nominal toggle switches the chart's y-axis values.
- [ ] Asset class breakdown toggle switches between single line and stacked area.
- [ ] Chart tooltip shows period, portfolio value, and withdrawal on hover.
- [ ] Range selector allows zooming into a sub-range; Reset Zoom restores full view.
- [ ] Chart re-renders when a new simulation is run (not on input change alone).
- [ ] `npm run typecheck` passes.
- [ ] Phase 2 tests still pass.

---

### Phase 5: Output — Detail Table

**Goal:** Simulation results are browsable in a detailed table with monthly and annual views, column toggling, and sorting.

**Client:**
- `DetailTable` with TanStack Table + TanStack Virtual.
- Monthly/Annual toggle (#49).
- Asset class columns toggle (#50).
- Sticky header row (#51).
- Column sorting on click (#53).
- Proper number formatting (currency, percentages).
- Row virtualization for 480-row monthly view.

**Definition of Done:**
- [ ] Table renders all monthly rows (up to 480) after a simulation run.
- [ ] Monthly/Annual toggle switches between 480-row and 40-row views.
- [ ] Asset class toggle shows/hides the Stocks/Bonds/Cash breakdown columns.
- [ ] Clicking a column header sorts ascending; clicking again sorts descending; third click removes sort.
- [ ] Header row stays visible during scroll (sticky).
- [ ] Table scrolls smoothly at 60fps (no jank with 480 rows).
- [ ] Period column is sticky horizontally (stays visible during horizontal scroll).
- [ ] `npm run typecheck` passes.
- [ ] Phases 2–4 still function correctly.

---

### Phase 6: All Withdrawal Strategies

**Goal:** All 12 withdrawal strategies are implemented, tested, and selectable in the UI with their strategy-specific parameter panels.

**Server:**
- Implement the remaining 11 strategies in `engine/strategies/`:
  - Percent of Portfolio, 1/N, VPW, Dynamic SWR, Sensible Withdrawals, 95% Rule, Guyton-Klinger, Vanguard Dynamic Spending, Endowment, Hebeler Autopilot II, CAPE-Based.
- Strategy registry maps all 12 enum values to their functions.

**Client:**
- `StrategyParams` dynamically renders the correct parameter inputs for the selected strategy.
- Each strategy's parameter panel matches SPECS.md: correct labels, ranges, defaults, computed helpers.
- `StrategyTooltip` (#22) shows the correct content per strategy.

**Tests (required):**
- One test file per strategy (12 total). Each file covers: Year 1 calculation, multi-year sequence (5–10 years), edge cases.
- Guyton-Klinger gets expanded tests: all four rules individually, rule interaction, sunset provision activation, the full worked example from WITHDRAWAL_STRATEGIES.md.
- VPW and Hebeler get PMT-specific tests verifying the drawdown target and weight parameters.
- CAPE-Based gets tests at multiple CAPE values verifying the rate formula.

**Verification approach:** With the table from Phase 5, run simulations with each strategy and visually verify that withdrawal patterns differ as expected: Constant Dollar is flat (inflation-adjusted), Percent of Portfolio is volatile, Guyton-Klinger shows cuts and raises, VPW increases over time, etc.

**Definition of Done:**
- [ ] All 12 strategy test files pass.
- [ ] Selecting each strategy from the dropdown renders its parameter panel with correct defaults.
- [ ] Changing strategy-specific parameters updates the store.
- [ ] Running a simulation with each strategy produces distinct results visible in the chart and table.
- [ ] Strategy info tooltip shows the correct description for each strategy.
- [ ] Guyton-Klinger's worked example from WITHDRAWAL_STRATEGIES.md is reproduced exactly by the engine (within rounding tolerance).
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] Phases 2–5 still function correctly.

---

### Phase 7: Drawdown & Events

**Goal:** The Rebalancing drawdown strategy works, income and expense events are configurable in the UI and processed by the engine, and the glide path editor is functional.

**Server:**
- `engine/drawdown/rebalancing.ts`: implements the Rebalancing algorithm (see WITHDRAWAL_STRATEGIES.md Drawdown B).
- Engine processes income events (deposits into specified asset class at the correct month/frequency).
- Engine processes expense events (deductions from specified asset class or via drawdown strategy at the correct month/frequency).
- Inflation adjustment for recurring events.
- Partial fulfillment when portfolio can't cover an expense.

**Client:**
- `RebalancingConfig` (#25): target allocation inputs with validation (must sum to 100%).
- `GlidePathToggle` (#25b) and `GlidePathEditor` (#26): waypoint list, add/remove, mini preview chart.
- `IncomeEvents` section: event cards (#27), add button with presets (#28), remove (#29).
- `ExpenseEvents` section: event cards (#30), add button with presets (#31), remove (#32).
- All event sub-controls: name, amount, deposit/source, start date, end date, frequency, inflation toggle.

**Tests:**
- `rebalancing.test.ts`: overweight sourcing, proportional distribution, glide path interpolation, asset class depletion.
- `events.test.ts`: income deposit timing, expense deduction timing, recurring frequencies, inflation adjustment, partial fulfillment.
- Simulator integration test: run a simulation with income events, expense events, and Rebalancing drawdown — verify portfolio trajectory matches expected values.

**Definition of Done:**
- [ ] Switching to Rebalancing drawdown shows target allocation inputs.
- [ ] Allocation inputs validate to 100% total; Run Simulation is blocked if total ≠ 100%.
- [ ] Glide path editor adds/removes waypoints; mini preview chart updates.
- [ ] Income event cards can be added (blank and preset), configured, and removed.
- [ ] Expense event cards can be added (blank and preset), configured, and removed.
- [ ] Running a simulation with income/expense events shows their impact in the chart and table (portfolio bumps up on income months, drops on expense months).
- [ ] Recurring events appear at the correct frequency in the table.
- [ ] All drawdown and event tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Phases 2–6 still function correctly.

---

### Phase 8: Monte Carlo

**Goal:** Monte Carlo simulation mode is fully functional — historical data drives 1,000 simulations, confidence bands render on the chart, and probability of success is displayed.

**Server:**
- `engine/historicalData.ts`: CSV loader, in-memory store, era filtering.
- `engine/monteCarlo.ts`: runs N simulations by sampling historical months with replacement.
- `/api/v1/simulate` extended to handle MC mode (returns `MonteCarloResult` with percentile curves).
- Seed support for deterministic MC runs in tests.

**Shared:**
- `MonteCarloResult` type: percentile curves (5th, 10th, 25th, 50th, 75th, 90th, 95th), probability of success, per-simulation terminal values.
- `HistoricalEra` enum and era definitions in `constants/`.

**Client:**
- `HistoricalEraSelector` (#11a) in CommandBar (visible only in MC mode).
- `HistoricalDataSummary` in sidebar (replaces Return Assumptions section in MC mode).
- `ConfidenceBands` (#45) on the portfolio chart — layered areas at different opacities.
- `ProbabilityOfSuccess` stat card (#41) — visible only in MC mode, with color-coded thresholds.
- Summary stats computed from the median simulation path.

**Tests:**
- `historicalData.test.ts`: CSV parsing, era filtering returns correct date ranges.
- `monteCarlo.test.ts`: determinism (same seed = same result), probability of success at extremes (always-survive config = 100%, always-fail = 0%), 1,000 runs complete within the 3-second performance target.
- Integration test: MC run with Full History era produces a probability of success within a plausible range for a 4% Constant Dollar config (~93–97%).

**Definition of Done:**
- [ ] Switching to Monte Carlo mode shows the era selector and hides Return Assumptions.
- [ ] Running a Monte Carlo simulation completes within 3 seconds.
- [ ] The chart shows confidence bands (multiple shaded areas) instead of a single line.
- [ ] Probability of Success stat card appears with correct color coding (green ≥90%, amber 75–89%, red <75%).
- [ ] Switching between Manual and MC mode swaps which cached result is displayed (no re-run needed).
- [ ] Changing the historical era updates the data summary but does not auto-run.
- [ ] All MC tests pass, including the determinism test.
- [ ] `npm run typecheck` passes.
- [ ] Phases 2–7 still function correctly.

---

### Phase 9: Tracking Mode

**Goal:** Tracking Mode is fully operational — users can enter actuals, see a deterministic re-forecast, and MC results show stale indicators when actuals change.

**Server:**
- `engine/deterministic.ts`: deterministic reforecast engine (fixed monthly returns, no randomness).
- `POST /api/v1/reforecast` endpoint: accepts config + actuals, returns deterministic projection.

**Client:**
- Mode toggle (#1) switches between Planning and Tracking with behavioral differences.
- `EditableCell` (#52) in the detail table: click to edit, blue dot for modified cells.
- Actuals watermark (#60): persistent "TRACKING" indicator.
- Debounced reforecast on actual/input edits (300ms for continuous, immediate for discrete).
- AbortController for canceling in-flight reforecast requests.
- Optimistic UI: edited cell updates immediately, projected rows show loading skeleton until server responds.
- Stale MC indicators: when actuals change and MC results exist, dim the confidence bands and PoS, show ⚠ icon.
- Clear Actuals button (#61).

**Tests:**
- `deterministic.test.ts`: verify fixed monthly return formula `(1 + annual)^(1/12) - 1`, verify actuals are locked, verify identical inputs produce identical outputs.
- `reforecast.test.ts` (route): valid request returns 200, response shape correct, completes within 50ms.
- Client store test: verify `mcStale` flag is set when actuals change with MC results present.

**Definition of Done:**
- [ ] Switching to Tracking Mode enables editable cells in the table for past months.
- [ ] Editing an actual cell shows a blue dot indicator and triggers a reforecast.
- [ ] The reforecast completes and updates projected rows within ~200ms total round-trip.
- [ ] Rapid edits (typing quickly) produce only one reforecast call (debounce working).
- [ ] If MC results exist, editing an actual dims them and shows the stale indicator.
- [ ] Re-running Monte Carlo in Tracking Mode produces results "from" the last actual forward.
- [ ] Clear Actuals resets all edited cells and triggers a reforecast.
- [ ] `POST /api/v1/reforecast` completes within 50ms server-side.
- [ ] All deterministic and reforecast tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Phases 2–8 still function correctly.

---

### Phase 10: Stress Testing

**Goal:** Users can define up to 4 stress scenarios, run them against the base simulation, and compare results.

**Server:**
- Stress engine: clones config, overlays shock parameters, runs simulation with same seed.
- `POST /api/v1/stress-test` endpoint.

**Client:**
- `StressTestPanel` (collapsible section below the main output area).
- `ScenarioCard` (#57) with label, shock type selector, shock parameters, timing.
- Add/Remove scenario buttons (#58), max 4.
- `ComparisonBarChart`: grouped bars comparing base vs. scenarios on key metrics.
- `ComparisonMetricsTable`: side-by-side stats.
- `TimingSensitivityChart`: line chart showing how shock timing affects outcomes (Manual mode only).

**Tests:**
- Stress engine test: verify that a scenario with identical parameters to the base produces identical results (same seed). Verify that a −30% shock in Year 1 produces a measurably worse outcome than the base.

**Definition of Done:**
- [ ] Stress test panel expands/collapses below the main output.
- [ ] Up to 4 scenarios can be added and configured.
- [ ] Running stress test produces comparison charts and metrics.
- [ ] The "no shock" scenario matches the base simulation exactly.
- [ ] Timing sensitivity chart renders in Manual mode (hidden in MC mode).
- [ ] Stress test tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Phases 2–9 still function correctly.

---

### Phase 11: Undo/Redo & Snapshots

**Goal:** Undo/redo and snapshot save/load work as specified.

**Client:**
- `undoMiddleware.ts`: Zustand middleware that captures state changes, maintains past/future stacks (max 100), supports batching/debouncing for rapid changes.
- Ctrl+Z / Ctrl+Shift+Z (Cmd on Mac) keyboard shortcuts wired via `useUndoRedo` hook.
- Undo/Redo buttons in CommandBar — disabled state when stack is empty.
- `useSnapshot` hook: save (serialize → JSON → download) and load (file picker → parse → validate → restore).
- Save Snapshot button (#64): opens name modal → downloads `.json` file.
- Load Snapshot button (#65): file picker → Zod validation → state replacement → clear undo history → clear simulation results.
- Schema version check on load (reject if higher than current).
- Error toast on invalid snapshot file.

**Tests:**
- `undoMiddleware.test.ts`: state capture, undo restores previous, redo re-applies, new action clears redo stack, history capped at 100, batching collapses rapid changes.
- `snapshot.test.ts`: round-trip (serialize → deserialize = identical state), schema version rejection, invalid data rejection.

**Definition of Done:**
- [ ] Changing any input, then pressing Ctrl+Z, restores the previous value.
- [ ] Ctrl+Shift+Z re-applies the undone change.
- [ ] Making a new change after an undo clears the redo stack.
- [ ] Rapid slider drags produce a single undo entry (not one per pixel).
- [ ] Undo/Redo buttons show disabled state when respective stacks are empty.
- [ ] Save Snapshot downloads a `.json` file with the correct envelope structure.
- [ ] Load Snapshot restores the full input state from a saved file.
- [ ] Loading a snapshot clears undo history and simulation results.
- [ ] Loading an invalid file shows an error toast and does not modify state.
- [ ] Loading a file with a future schema version shows a version error.
- [ ] All undo/redo and snapshot tests pass.
- [ ] `npm run typecheck` passes.
- [ ] Phases 2–10 still function correctly.

---

### Phase 12: Polish & Hardening

**Goal:** The application feels finished. Animations are smooth, errors are handled gracefully, edge cases are covered, and the CSV export works.

**Client:**
- CSS transitions and animations per SPECS.md: section expand/collapse, strategy parameter panel crossfade, card add/remove, chart draw-on animation, value clamping amber flash.
- Error boundaries around major sections (chart, table, input panel) — display a friendly message instead of a white screen.
- CSV export button (#56): exports the detail table to a `.csv` file download.
- Responsive edge cases: minimum viable sidebar width, output area reflow.
- Loading states: spinner or skeleton while simulation is running.
- Empty states: output area before first simulation run.

**Server:**
- Structured error responses for all failure modes.
- Request logging (method, path, duration, status code).

**Performance verification:**
- Monte Carlo (1,000 runs) completes in <3 seconds.
- Chart zoom/pan is 60fps (test by dragging the range selector).
- Table scroll is 60fps (test by scrolling 480-row monthly view).
- Undo/redo is instantaneous (<16ms).

**Definition of Done:**
- [ ] Section expand/collapse animates smoothly.
- [ ] Strategy parameter panels crossfade on strategy change.
- [ ] Chart has draw-on animation on initial render.
- [ ] Value clamping produces the amber flash described in SPECS.md.
- [ ] A JavaScript error in the chart component does not crash the entire app.
- [ ] CSV export downloads a correctly formatted file with all visible table columns.
- [ ] The output area shows a meaningful empty state before any simulation is run.
- [ ] A loading indicator appears while a simulation is in progress.
- [ ] Performance targets from ARCHITECTURE Section 10 are met.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] All tests across all packages pass.
- [ ] Full regression: Phases 2–11 functionality confirmed intact.

---

## 4. Definition of Done

### 4.1 Per-Phase Checklist

Every phase includes a Definition of Done checklist (shown above). A phase is complete when:

1. **Every checklist item is checked.** No exceptions, no "we'll come back to this."
2. **All existing tests pass.** Every phase must run the full test suite, not just its own tests. Regressions are fixed before moving on.
3. **`npm run typecheck` passes.** Type errors are not deferred.
4. **`npm run lint` passes.** Lint warnings are not deferred.
5. **A commit is made and pushed** with a message referencing the completed phase.

### 4.2 Verification Methods

| Method | When to use |
|---|---|
| **Unit test** | Engine calculations, state management logic, utility functions. Must produce the expected numeric output for known inputs. |
| **Integration test** | API endpoints. Use Fastify's `inject()` — no actual HTTP needed. |
| **Visual inspection** | UI layout, styling, animations, chart rendering. Compare against SPECS.md descriptions. |
| **Manual interaction** | Input wiring (type a value, verify it appears in the store), flow testing (configure → run → view results). |
| **DevTools inspection** | Store state (React DevTools or console logging), network requests (browser Network tab), response payloads. |

### 4.3 Regression Rule

Before marking any phase as complete, run:

```bash
npm test              # all tests across all packages
npm run typecheck     # full type check
npm run lint          # full lint
```

All three must pass with zero errors and zero warnings. If a new phase breaks an earlier test, the regression is fixed in the current phase — not deferred.

---

## 5. Git Workflow

The repository is initialized locally and pushed to GitHub before development begins. There is one branch: `main`. No feature branches, no pull requests, no merge ceremonies.

**When to commit:** After completing each task (see TASKS.md). A task is the smallest unit of work that leaves the codebase in a working state. Never commit code that fails to compile.

**Commit message format:**

```
<phase>-<task>: <short description>

<optional body: what changed and why, not how>
```

Examples:
```
P2-T3: implement Constant Dollar strategy

P3-T7: wire spending phase cascade logic

P6-T2: implement Guyton-Klinger strategy with all four rules

P8-T1: load and parse historical returns CSV
```

**When to push:** After every commit. The remote is always up to date.

---

## 6. Code Conventions

### 6.1 Error Handling Patterns

| Situation | Pattern |
|---|---|
| User input out of range | Clamp to nearest valid value. Flash the amber indicator (client). Never throw. |
| API request with invalid body | Return 400 with structured error. Never throw unhandled. |
| Strategy formula produces negative withdrawal | Clamp to 0. Log a warning (server). Never throw. |
| Strategy formula hits division by zero | Use the documented fallback (e.g., PMT with rate=0 → `pv / nper`). Never throw. |
| Portfolio value goes negative | Floor at 0. Record the shortfall in the result. Never throw. |
| Unexpected server error | Catch at Fastify error handler. Return 500 with generic message. Log the stack trace. |
| Network error on API call (client) | Show error toast. Preserve current state. Allow retry. |
| Snapshot file invalid | Show error toast with reason. Do not modify state. |

**General rule:** The simulation engine never throws during normal operation. Defensive clamps and fallback formulas handle impossible states. The engine logs warnings for conditions that indicate a bug (negative portfolio, zero division) but continues execution.

### 6.2 Logging

- **Server:** Use Fastify's built-in Pino logger. Log at `info` level for request lifecycle (received, completed, duration). Log at `warn` for defensive clamps (negative portfolio, formula fallback). Log at `error` for unexpected exceptions.
- **Client:** Use `console.warn` sparingly for unexpected conditions. No `console.log` in committed code (use only during development).

### 6.3 Comments

- **Do comment:** Non-obvious financial formulas (reference WITHDRAWAL_STRATEGIES.md by strategy number), defensive clamps with rationale ("floor at 0 because..."), workarounds for library limitations.
- **Do not comment:** What the code does (the code should be readable), TypeScript types (they are self-documenting), obvious control flow.
- **Preferred format:** Single-line `//` comments above the relevant line. No JSDoc blocks unless generating API documentation.

### 6.4 Import Ordering

Within every file, organize imports in this order (with a blank line between groups):

1. Node built-ins (`fs`, `path`)
2. Third-party packages (`react`, `zustand`, `fastify`, `zod`)
3. Shared package imports (`@shared/domain/...`, `@shared/contracts/...`)
4. Intra-package imports (relative paths: `../engine/simulator`, `./PhaseCard`)

---

## 7. Scripts and Commands

### 7.1 Root-Level Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | Starts client + server concurrently | Primary development command |
| `npm run build` | Builds shared → server → client | Full production build |
| `npm test` | Runs Vitest across all packages | Full test suite |
| `npm run typecheck` | `tsc --noEmit` in all packages | Type verification |
| `npm run lint` | ESLint across all packages | Code quality check |
| `npm run lint:fix` | ESLint with `--fix` | Auto-fix lint issues |
| `npm run format` | Prettier `--write` | Auto-format all files |
| `npm run format:check` | Prettier `--check` | Verify formatting (CI) |

### 7.2 Per-Package Scripts

| Package | Script | Description |
|---|---|---|
| `packages/server` | `npm run dev` | Start Fastify with file watching |
| `packages/server` | `npm test` | Run server tests only |
| `packages/client` | `npm run dev` | Start Vite dev server |
| `packages/client` | `npm test` | Run client tests only |
| `packages/shared` | `npm run build` | Compile TypeScript |

---

## 8. Testing Workflow

### 8.1 When to Write Tests

| Phase | Testing approach |
|---|---|
| Phase 2 (Engine Core) | Tests first. Write the test with expected values, then implement until it passes. The financial math must be verified against hand calculations. |
| Phase 3 (Input Panel) | No automated tests. Verify by visual inspection and manual interaction. |
| Phase 4–5 (Chart, Table) | No automated tests. Verify visually. |
| Phase 6 (All Strategies) | Tests first for each strategy. One test file per strategy, written before implementation. |
| Phase 7 (Drawdown & Events) | Tests first for Rebalancing drawdown and event processing. |
| Phase 8 (Monte Carlo) | Tests first for MC runner and historical data loading. |
| Phase 9 (Tracking Mode) | Tests first for deterministic engine. Client debounce logic tested. |
| Phase 10 (Stress Testing) | Tests for stress engine. |
| Phase 11 (Undo/Snapshots) | Tests for undo middleware and snapshot serialization. |
| Phase 12 (Polish) | No new tests. Run full suite for regression. |

### 8.2 Test Naming Convention

```
describe('<ModuleName>', () => {
  describe('<functionName>', () => {
    it('should <expected behavior> when <condition>', () => { ... });
  });
});
```

Example:
```typescript
describe('ConstantDollar', () => {
  describe('calculateWithdrawal', () => {
    it('should return portfolio × rate in Year 1', () => { ... });
    it('should inflate the previous withdrawal in Year 2+', () => { ... });
    it('should return 0 when portfolio is 0', () => { ... });
  });
});
```

### 8.3 Running Tests

```bash
# All tests
npm test

# Specific package
npm test -w packages/server

# Specific file
npx vitest run packages/server/tests/engine/strategies/guytonKlinger.test.ts

# Watch mode (during development)
npx vitest watch packages/server/tests/engine/strategies/guytonKlinger.test.ts
```

### 8.4 Coverage Expectations

| Area | Coverage target | Rationale |
|---|---|---|
| Engine strategies (12 files) | High (every formula path) | Financial correctness is the highest-risk area. |
| Engine drawdown (2 files) | High | Asset sourcing errors cascade through the simulation. |
| Engine helpers (PMT, rounding) | High | Utility functions used everywhere. |
| Engine simulator loop | Medium | Integration-level; individual components are tested. |
| Engine Monte Carlo | Medium | Statistical properties, determinism, performance. |
| Zustand middleware (undo) | High | Complex state logic that's hard to verify by inspection. |
| Snapshot serialization | Medium | Round-trip and validation. |
| React components | Low/None | Verified visually. Test only complex interactive logic. |

---

## 9. Roadblock Protocol

### 9.1 Triage Steps

When a task is blocked or taking significantly longer than expected:

1. **Timebox the investigation.** Spend no more than 15 minutes diagnosing the issue. If the root cause is not found in 15 minutes, stop investigating and move to step 2.

2. **Classify the blocker:**
   - **Missing information:** A spec is ambiguous or a formula is unclear. → Record the question in PROGRESS.txt and make a reasonable assumption. Document the assumption explicitly. Continue with the task.
   - **Technical obstacle:** A library doesn't work as expected, a performance target is missed, or an approach is fundamentally flawed. → Move to step 3.
   - **Dependency blocker:** The task depends on something from a future phase. → Skip the task, mark it as deferred in TASKS.md with the reason, and continue with the next task.

3. **Attempt one alternative approach.** If the first approach doesn't work, try one different approach. If that also fails, move to step 4.

4. **Record and defer.** Add a detailed entry to PROGRESS.txt (see Section 11) describing: what was attempted, what failed, and what information is needed to unblock. Mark the task as blocked in TASKS.md. Move to the next task.

### 9.2 When to Refactor vs. When to Defer

**Refactor now** if:
- The current code structure makes the current task impossible or unreasonably complex.
- The refactor is small (< 30 minutes) and localized (affects ≤ 3 files).
- Not refactoring would create a known bug or data integrity issue.

**Defer to Phase 12** if:
- The refactor is large or touches many files.
- The current code works correctly but is inelegant.
- The refactor is about performance optimization that isn't failing a performance target.
- The refactor is about code style or organization preferences.

**Never refactor** across phase boundaries. If Phase 6 reveals that a Phase 2 abstraction is wrong, fix the abstraction in Phase 6 — but only if it's blocking Phase 6 work. If it's merely suboptimal, record it in PROGRESS.txt and defer.

### 9.3 How to Record Decisions and Follow-ups

When making an assumption, deferring work, or discovering something unexpected:

1. **Add a PROGRESS.txt entry** (see Section 11) at the time of the decision.
2. **If the decision affects a spec**, add a `[ASSUMPTION]` note inline in the task's section of TASKS.md: `[ASSUMPTION: Interpreted "real gains" in Sensible Withdrawals as portfolio growth minus inflation, not including withdrawals. See WITHDRAWAL_STRATEGIES.md Section 6 for formula.]`
3. **If work is deferred**, add a `[DEFERRED]` entry in TASKS.md with the reason and the phase it's deferred to.
4. **If a follow-up is needed from the user**, prefix the PROGRESS.txt entry with `[QUESTION]` so it's easy to scan for open questions.

---

## 10. Task Derivation Rules (TASKS.md)

**TASKS.md is deliberately left empty at the start of the project.**

### 10.1 Task Granularity

Each task in TASKS.md should be:

- **Completable in one sitting** (roughly 30–90 minutes of focused work for a human; proportionally less for an AI agent). If a task feels like it will take more than 2 hours, split it.
- **Independently verifiable.** After completing the task, there is a concrete way to confirm it works — a test passes, a component renders, a value appears in the store. If you can't articulate the verification, the task is too vague.
- **Commit-worthy.** Each completed task results in a commit. If a task is too small to justify a commit (e.g., "rename a variable"), merge it into an adjacent task.

### 10.2 Dependencies and Acceptance Criteria

Every task specifies:

- **Phase:** which build phase it belongs to.
- **Dependencies:** which task(s) must be completed first (by ID). Keep dependency chains short — aim for tasks that depend on at most 1–2 prior tasks within the same phase. Cross-phase dependencies are implicit (Phase N depends on Phase N-1 being complete).
- **Acceptance criteria:** 1–3 concrete, verifiable conditions. Use the format:
  - `[AC1] Running the test file X produces 0 failures.`
  - `[AC2] The dropdown renders all 12 strategy names.`
  - `[AC3] Changing the selector updates store.withdrawalStrategy.type.`

### 10.3 Task Status and Check-Off

Each task in TASKS.md has a status:

```
- [ ] P2-T1: Implement roundToCents helper
- [x] P1-T1: Scaffold monorepo with npm workspaces
- [BLOCKED] P9-T3: Wire debounced reforecast — waiting on reforecast endpoint
- [DEFERRED] P7-T8: Glide path chart animation — deferred to Phase 12
```

Statuses:
- `[ ]` — not started.
- `[x]` — complete. All acceptance criteria met. Committed and pushed.
- `[BLOCKED]` — cannot proceed. Reason noted. Will be unblocked later.
- `[DEFERRED]` — intentionally postponed. Phase and reason noted.
- `[DROPPED]` — removed from scope. Reason noted.

Tasks are never deleted from TASKS.md — their history is preserved for context.

### 10.4 TASKS.md is emergent (do not pre-populate)

TASKS.md is not meant to be exhaustively authored upfront.

- Start each phase by creating only the smallest set of tasks needed to make progress on that phase’s DoD.
- Add tasks incrementally as implementation reveals concrete work (new constraints, refactors, missing utilities, test fixtures, UI wiring).
- Prefer adjusting tasks over forcing the code to match a stale plan. The plan serves the build, not the other way around.
- Keep tasks tied to verifiable acceptance criteria (tests, API responses, visible UI behaviors). If a task cannot be verified, rewrite or split it.
- At the start of each phase, create a short ‘Phase Plan’ block (3–8 tasks) before writing code; revise freely as you learn.

---

## 11. Progress Logging (PROGRESS.txt)

### 11.1 Required Entry Template

Every PROGRESS.txt entry follows this structure:

```
## YYYY-MM-DD HH:MM — <Phase>-<Task> | <Status>

<What was done, in 1–3 sentences.>

<If applicable: what was decided, assumed, or deferred. Prefix with [ASSUMPTION], [DECISION], [DEFERRED], or [QUESTION] for scannability.>

<If applicable: what didn't work and why.>
```

Example entries:

```
## 2026-03-15 14:22 — P2-T3 | COMPLETE

Implemented Constant Dollar strategy. Year 1 = portfolio × rate, subsequent years inflate by (1 + inflationRate). All 6 test cases pass including zero-portfolio edge case.

## 2026-03-15 15:45 — P6-T8 | COMPLETE

Implemented Guyton-Klinger strategy. All four rules applied in order: Withdrawal Rule → Capital Preservation → Prosperity. Sunset provision activates at year (N - guardrailsSunset).

[ASSUMPTION] Rule 1 checks previous year's portfolio return (rₜ₋₁), not the current year's. This matches WITHDRAWAL_STRATEGIES.md but differs from some online implementations that check the current year's return. Going with our spec.

## 2026-03-16 09:10 — P7-T5 | BLOCKED

Attempted to implement inflation adjustment for recurring expenses. The engine processes events monthly, but the inflation adjustment is annual — need to decide: does a monthly recurring expense inflate once per year (January) or every month (1/12th of annual inflation)? SPECS says "adjust for inflation annually" but doesn't specify the month.

[QUESTION] When does annual inflation adjustment apply to recurring events? Assuming January of each year for now. Will proceed with this assumption unless corrected.

## 2026-03-16 10:30 — P8-T2 | COMPLETE

Loaded and parsed historical-returns.csv. 1,176 months from Jan 1926 to Dec 2024. Each row has stocks, bonds, cash returns as decimals and CAPE ratio. Era filtering works for all 8 predefined eras.

[DECISION] CSV has CAPE data for all months. Will use historical CAPE values in Monte Carlo mode for the CAPE-Based strategy (Strategy 12) rather than falling back to constant CAPE.
```

### 11.2 When to Log

Log an entry when:

- A task is completed (even if straightforward).
- A task is blocked or deferred.
- An assumption is made that isn't explicitly covered by the specs.
- A decision is made between two reasonable approaches.
- Something unexpected is discovered (bug, performance issue, spec ambiguity).
- A question arises that needs user input.

Do not log routine work-in-progress. The log is for completed states, decisions, and blockers — not a stream of consciousness.

### 11.3 Context Reset Hygiene

PROGRESS.txt is the primary context recovery tool when starting a new session. To support this:

- **Entries are reverse-chronological** (newest at top). The first 10–20 lines should tell a new session everything it needs to know about the current state.
- **Every entry includes the Phase-Task ID.** This allows cross-referencing with TASKS.md to see what's done, what's next, and what's blocked.
- **The first entry of each session** should be a brief orientation line: `## YYYY-MM-DD HH:MM — SESSION START | Resuming from P6-T4. Last completed: P6-T3 (VPW strategy). Next: P6-T4 (Dynamic SWR).` This costs almost nothing to write and saves significant context-reconstruction time.
- **Assumptions and decisions are marked with prefixes** (`[ASSUMPTION]`, `[DECISION]`, `[QUESTION]`, `[DEFERRED]`) so they can be scanned quickly without reading every entry.
- **Keep entries concise.** 1–5 lines per entry. If an entry needs more than 5 lines, the detail probably belongs in a code comment or a doc update, not in the log.