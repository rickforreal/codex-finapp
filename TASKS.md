# TASKS

## Phase 1 Plan — Foundation

- [x] P1-T1: Initialize monorepo workspace scaffolding
Phase: 1 (Foundation)
Dependencies: none
Acceptance Criteria:
[AC1] Root workspace files exist: `package.json`, `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`.
[AC2] Workspace directories exist: `packages/shared`, `packages/server`, `packages/client`.
[AC3] Root scripts for `dev`, `build`, `test`, `typecheck`, and `lint` are defined in `package.json`.

- [x] P1-T2: Scaffold shared package structure and placeholder types
Phase: 1 (Foundation)
Dependencies: P1-T1
Acceptance Criteria:
[AC1] `packages/shared/src/{domain,contracts,ui,constants}` exists with placeholder files for `SimulationConfig` and `SimulationResult`.
[AC2] Enums include `AssetClass`, `WithdrawalStrategyType`, and `SimulationMode`.
[AC3] ESLint import boundary rule is configured so `domain`/`contracts` cannot import from `ui`.

- [x] P1-T3: Scaffold Fastify server with health route
Phase: 1 (Foundation)
Dependencies: P1-T1, P1-T2
Acceptance Criteria:
[AC1] `packages/server` contains Fastify app bootstrap with CORS and structured logging.
[AC2] `GET /api/v1/health` returns `{ "status": "ok" }`.
[AC3] Server start script listens on configurable `PORT`.

- [x] P1-T4: Scaffold React client shell with Tailwind theme and health call
Phase: 1 (Foundation)
Dependencies: P1-T1, P1-T2, P1-T3
Acceptance Criteria:
[AC1] `packages/client` has Vite + React + Tailwind configured.
[AC2] `AppShell` renders sidebar placeholder and output placeholder; `CommandBar` renders static placeholder controls.
[AC3] On mount, client calls health endpoint via an API wrapper and logs the response.

- [x] P1-T5: Create Zustand store skeleton matching architecture slices
Phase: 1 (Foundation)
Dependencies: P1-T4
Acceptance Criteria:
[AC1] `useAppStore` exists with empty slice structure matching `ARCHITECTURE.md` Section 6.2.
[AC2] Store types are imported from `@shared` placeholders without circular imports.
[AC3] Client compiles with store wired into app bootstrapping.

- [x] P1-T6: Validate Phase 1 tooling and DoD checks
Phase: 1 (Foundation)
Dependencies: P1-T2, P1-T3, P1-T4, P1-T5
Acceptance Criteria:
[AC1] `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` run successfully from root.
[AC2] `npm run dev` starts both client and server.
[AC3] Manual check confirms app shell renders and browser console logs health response.

## Phase 2 Plan — Simulation Engine Core

- [x] P2-T1: Expand shared domain/contracts for simulation engine
Phase: 2 (Simulation Engine Core)
Dependencies: P1-T6
Acceptance Criteria:
[AC1] `SimulationConfig` includes core params, portfolio, assumptions, spending phases, strategy config, and drawdown config.
[AC2] `SinglePathResult`, `SimulateRequest`, and `SimulateResponse` are defined in shared package exports.
[AC3] Zod schema validates `SimulateRequest` with field-level errors.

- [x] P2-T2: Implement helper modules (`rounding`, `pmt`, `inflation`, `returns`)
Phase: 2 (Simulation Engine Core)
Dependencies: P2-T1
Acceptance Criteria:
[AC1] `roundToCents` is centralized in server helpers and used by engine modules.
[AC2] PMT helper supports zero-rate fallback and positive-rate formula.
[AC3] Inflation and return helpers provide reusable annual/monthly conversions.

- [x] P2-T3: Implement Constant Dollar strategy and Bucket drawdown
Phase: 2 (Simulation Engine Core)
Dependencies: P2-T2
Acceptance Criteria:
[AC1] Constant Dollar computes Year 1 as `portfolio × rate` and Year 2+ as prior clamped withdrawal × (1 + inflation).
[AC2] Bucket drawdown depletes by configured order and reports shortfall on partial funding.
[AC3] Both modules expose pure functions testable in isolation.

- [x] P2-T4: Implement simulator loop and `/api/v1/simulate` route
Phase: 2 (Simulation Engine Core)
Dependencies: P2-T1, P2-T2, P2-T3
Acceptance Criteria:
[AC1] Simulator processes month-by-month returns, annual withdrawal calc, and monthly drawdown for full duration.
[AC2] `POST /api/v1/simulate` validates request via shared Zod schema and returns `SimulateResponse`.
[AC3] Invalid requests return 400 with structured `fieldErrors`.

- [x] P2-T5: Add required Phase 2 tests
Phase: 2 (Simulation Engine Core)
Dependencies: P2-T2, P2-T3, P2-T4
Acceptance Criteria:
[AC1] Test files exist and pass: `constantDollar.test.ts`, `bucket.test.ts`, `simulator.test.ts`, `pmt.test.ts`, `rounding.test.ts`, `routes/simulation.test.ts`.
[AC2] Route integration tests use Fastify `inject()` for valid and invalid simulation requests.
[AC3] Simulator tests verify Year 1/Year 2 withdrawals and bucket depletion behavior.

- [x] P2-T6: Run Phase 2 DoD verification
Phase: 2 (Simulation Engine Core)
Dependencies: P2-T5
Acceptance Criteria:
[AC1] `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass from root.
[AC2] Curl call to `POST /api/v1/simulate` returns monthly rows and expected Year 1/Year 2 withdrawal pattern.
[AC3] Verification confirms cash depletes before bonds and stocks in bucket ordering.

## Phase 3 Plan — Input Panel

- [x] P3-T1: Expand client store actions for input round-trip wiring
Phase: 3 (Input Panel)
Dependencies: P2-T6
Acceptance Criteria:
[AC1] Every Phase 3 input field has a corresponding store update action.
[AC2] Spending phase cascade logic updates adjacent boundaries when end year changes.
[AC3] Add/remove limits are enforced (max 4 phases, cannot remove last phase).

- [x] P3-T2: Build shared form/display components used by sidebar sections
Phase: 3 (Input Panel)
Dependencies: P3-T1
Acceptance Criteria:
[AC1] Shared components exist: `NumericInput`, `CurrencyInput`, `PercentInput`, `SegmentedToggle`, `Dropdown`, `MonthYearPicker`, `ToggleSwitch`, `DonutChart`, `CollapsibleSection`.
[AC2] Components are reusable and typed for store-driven controlled inputs.
[AC3] Collapsible section includes chevron state transition.

- [x] P3-T3: Implement all sidebar sections and wire to store
Phase: 3 (Input Panel)
Dependencies: P3-T1, P3-T2
Acceptance Criteria:
[AC1] Core Parameters, Starting Portfolio, Return Assumptions, Spending Phases, Withdrawal Strategy, Drawdown Strategy, Income Events, Expense Events render in sidebar.
[AC2] Every control updates store and re-renders current value.
[AC3] Return Assumptions visibility toggles with Manual/Monte Carlo simulation mode.

- [x] P3-T4: Wire command bar controls and run-simulation integration
Phase: 3 (Input Panel)
Dependencies: P3-T1, P3-T3
Acceptance Criteria:
[AC1] Mode toggle and simulation mode selector update store.
[AC2] Run Simulation posts a valid request to `/api/v1/simulate` and writes response into simulation cache.
[AC3] Strategy selector lists all 12 strategies; non-Constant params show “coming in Phase 6”.
[ASSUMPTION: Until Phase 6 (strategies) and Phase 7 (rebalancing), run requests coerce unsupported strategy/drawdown selections to Constant Dollar + Bucket so the API call remains valid.]

- [x] P3-T5: Regression and static checks for Phase 3 changes
Phase: 3 (Input Panel)
Dependencies: P3-T4
Acceptance Criteria:
[AC1] `npm run build` passes.
[AC2] `npm run typecheck` and `npm run lint` pass.
[AC3] Phase 2 server tests continue to pass.

- [x] P3-T6: Visual/manual DoD verification pass
Phase: 3 (Input Panel)
Dependencies: P3-T5
Acceptance Criteria:
[AC1] Manual UI pass confirms all sidebar sections render and round-trip correctly.
[AC2] Manual UI pass confirms donut reacts to portfolio changes and collapsible behavior works.
[AC3] Manual UI pass confirms Run Simulation writes response cache while output display remains deferred.

## Phase 4 Plan — Output: Chart & Stats

- [x] P4-T1: Build output data selectors and statistics helpers
Phase: 4 (Output: Chart & Stats)
Dependencies: P3-T6
Acceptance Criteria:
[AC1] Active simulation result selector resolves current mode result cache for rendering.
[AC2] Summary metrics helper computes cards #33–#40 from monthly rows with inflation-adjusted real values.
[AC3] Formatting helpers support compact dollars, full currency, percentages, and period labels.

- [x] P4-T2: Implement Summary Statistics Bar with stat cards
Phase: 4 (Output: Chart & Stats)
Dependencies: P4-T1
Acceptance Criteria:
[AC1] Eight visible stat cards render: #33–#40; #41 remains hidden in Phase 4.
[AC2] Terminal Value card uses green styling for positive terminal value and red styling for depletion.
[AC3] Idle state (no run) shows placeholder values and updates after simulation completes.

- [x] P4-T3: Implement Portfolio Chart rendering (line + asset breakdown)
Phase: 4 (Output: Chart & Stats)
Dependencies: P4-T1
Acceptance Criteria:
[AC1] Manual-mode result renders a total-portfolio line over time after a run.
[AC2] Asset Class Breakdown toggle switches to stacked area (stocks/bonds/cash) and back.
[AC3] Real/Nominal toggle switches y-axis and plotted values using inflation-adjusted series.

- [x] P4-T4: Add chart tooltip and zoom/range controls
Phase: 4 (Output: Chart & Stats)
Dependencies: P4-T3
Acceptance Criteria:
[AC1] Hover tooltip shows period, portfolio value, and withdrawal for nearest month.
[AC2] Range selector can constrain visible start/end range for zoom.
[AC3] Reset Zoom restores full range.

- [x] P4-T5: Integrate output components into app shell and stale-result behavior
Phase: 4 (Output: Chart & Stats)
Dependencies: P4-T2, P4-T4
Acceptance Criteria:
[AC1] Output area renders empty state before run and chart + stats after run.
[AC2] Changing inputs without rerunning keeps last results visible; rerun updates both chart and stats.
[AC3] Chart display updates only from cached run results, not direct input edits.

- [x] P4-T6: Run Phase 4 verification and complete DoD
Phase: 4 (Output: Chart & Stats)
Dependencies: P4-T5
Acceptance Criteria:
[AC1] `npm run typecheck` passes.
[AC2] `npm run lint` passes.
[AC3] Phase 2 server tests remain passing via `npm test`.
[AC4] Manual visual check confirms DoD items for chart/stats/toggles/tooltip/zoom/rerun behavior.

## Phase 5 Plan — Output: Detail Table

- [x] P5-T1: Add table view state/actions and row transformation helpers
Phase: 5 (Output: Detail Table)
Dependencies: P4-T6
Acceptance Criteria:
[AC1] Store includes setters for monthly/annual view, asset-columns toggle, and table sort state.
[AC2] Helpers transform simulation rows into monthly and annual table datasets.
[AC3] Sorting supports numeric/date columns in ascending/descending order.

- [x] P5-T2: Implement Detail Table controls and base table layout
Phase: 5 (Output: Detail Table)
Dependencies: P5-T1
Acceptance Criteria:
[AC1] Monthly/Annual toggle (#49) is wired and switches displayed dataset.
[AC2] Asset class columns toggle (#50) is wired and controls expanded asset columns.
[AC3] Header row is sticky (#51) and empty-state layout renders before first run.

- [x] P5-T3: Implement sortable columns and formatting
Phase: 5 (Output: Detail Table)
Dependencies: P5-T2
Acceptance Criteria:
[AC1] Clicking sortable headers toggles ascending/descending sort (#53).
[AC2] Currency and percentage cells are consistently formatted for readability.
[AC3] Sorting updates rendered rows for both monthly and annual views.

- [x] P5-T4: Implement row virtualization for monthly view scale
Phase: 5 (Output: Detail Table)
Dependencies: P5-T3
Acceptance Criteria:
[AC1] Monthly view can handle 480 rows with smooth scrolling in constrained table viewport.
[AC2] Virtualized rendering only mounts visible row window plus small overscan.
[AC3] Sticky header remains aligned during vertical scroll.

- [x] P5-T5: Integrate Detail Table into output flow and verify rerun behavior
Phase: 5 (Output: Detail Table)
Dependencies: P5-T4
Acceptance Criteria:
[AC1] Table appears below chart and updates only after Run Simulation.
[AC2] Changing inputs without rerun preserves prior table results.
[AC3] Rerunning simulation refreshes table dataset and preserves active controls where valid.

- [x] P5-T6: Run Phase 5 verification and complete DoD
Phase: 5 (Output: Detail Table)
Dependencies: P5-T5
Acceptance Criteria:
[AC1] `npm run build` passes.
[AC2] `npm run typecheck`, `npm run lint`, and `npm test` pass.
[AC3] Manual check confirms 480-row monthly browsing, annual toggle, asset columns toggle, sticky header, and sorting.

## Phase 6 Plan — All Withdrawal Strategies

- [x] P6-T1: Expand shared strategy types and request validation for all 12 strategies
Phase: 6 (All Withdrawal Strategies)
Dependencies: P5-T6
Acceptance Criteria:
[AC1] `WithdrawalStrategyConfig` supports all 12 strategy discriminators with strategy-specific params.
[AC2] `simulateRequestSchema` validates each strategy payload via discriminated union.
[AC3] Shared package exports compile and are consumable by server/client.

- [x] P6-T2: Implement server strategy registry and 11 additional strategy calculators
Phase: 6 (All Withdrawal Strategies)
Dependencies: P6-T1
Acceptance Criteria:
[AC1] `engine/strategies/` contains implementations for all remaining strategies.
[AC2] Registry routes all `WithdrawalStrategyType` values to calculators.
[AC3] Simulator computes annual withdrawals via registry using prior-year context (return, previous withdrawal, remaining years).

- [x] P6-T3: Add one server test file per strategy with required coverage
Phase: 6 (All Withdrawal Strategies)
Dependencies: P6-T2
Acceptance Criteria:
[AC1] 12 strategy test files exist (including existing Constant Dollar).
[AC2] Each strategy file covers Year 1, multi-year behavior, and at least one edge case.
[AC3] Guyton-Klinger tests cover freeze/cut/raise/sunset rules and the worked example sequence.

- [x] P6-T4: Wire client strategy parameters and tooltips for all 12 strategies
Phase: 6 (All Withdrawal Strategies)
Dependencies: P6-T1
Acceptance Criteria:
[AC1] `StrategyParams` renders strategy-specific fields for all 12 strategies with ranges/default behavior.
[AC2] Store supports strategy-specific parameter updates without coercing to Constant Dollar.
[AC3] `StrategyTooltip` updates per selected strategy.

- [x] P6-T5: Run Phase 6 verification and complete DoD
Phase: 6 (All Withdrawal Strategies)
Dependencies: P6-T3, P6-T4
Acceptance Criteria:
[AC1] `npm run build` passes.
[AC2] `npm run typecheck`, `npm run lint`, and `npm test` pass.
[AC3] Manual selector/parameter wiring is present and simulations execute across strategy types.

## Phase 7 Plan — Drawdown & Events

- [x] P7-T1: Expand shared domain/contracts and validation for Phase 7 drawdown + events
Phase: 7 (Drawdown & Events)
Dependencies: P6-T5
Acceptance Criteria:
[AC1] `DrawdownStrategyConfig` supports both Bucket and Rebalancing payloads with strategy-specific constraints.
[AC2] `IncomeEvent` and `ExpenseEvent` include timing, frequency, inflation toggle, and asset routing/source fields.
[AC3] `simulateRequestSchema` validates rebalancing allocation totals and event date/frequency invariants.

- [x] P7-T2: Implement rebalancing drawdown engine with optional glide path
Phase: 7 (Drawdown & Events)
Dependencies: P7-T1
Acceptance Criteria:
[AC1] New drawdown module applies withdrawals from overweight assets first, then proportionally across remaining assets.
[AC2] Glide path interpolation resolves annual target allocation when enabled.
[AC3] Partial fulfillment and per-asset withdrawal reporting match existing drawdown contract shape.

- [x] P7-T3: Implement income/expense event processing in simulator loop
Phase: 7 (Drawdown & Events)
Dependencies: P7-T1, P7-T2
Acceptance Criteria:
[AC1] Income events are applied at correct month/frequency and deposited to selected destination.
[AC2] Expense events are applied at correct month/frequency and sourced from chosen asset or drawdown strategy.
[AC3] Inflation-adjusted recurring events grow annually and shortfalls are tracked when expenses exceed portfolio capacity.

- [x] P7-T4: Build Rebalancing UI and glide path editor controls
Phase: 7 (Drawdown & Events)
Dependencies: P7-T1
Acceptance Criteria:
[AC1] Selecting Rebalancing renders target allocation inputs and 100% validation status.
[AC2] Glide path toggle enables waypoint add/remove/edit controls and preserves prior values on mode switches.
[AC3] Command bar blocks Run Simulation while rebalancing allocations are invalid.

- [x] P7-T5: Upgrade Income/Expense event cards with full Phase 7 controls and presets
Phase: 7 (Drawdown & Events)
Dependencies: P7-T1
Acceptance Criteria:
[AC1] Income and expense cards expose name, amount, deposit/source, start/end date, frequency, and inflation toggle controls.
[AC2] Add buttons support blank defaults plus common presets.
[AC3] End date behavior supports “End of Retirement” and enforces `end >= start` for recurring events.

- [x] P7-T6: Add Phase 7 engine tests (rebalancing, events, simulator integration)
Phase: 7 (Drawdown & Events)
Dependencies: P7-T2, P7-T3
Acceptance Criteria:
[AC1] `rebalancing.test.ts` covers overweight sourcing, proportional fallback, glide path interpolation, and depletion behavior.
[AC2] `events.test.ts` covers timing/frequency, inflation adjustments, and partial expense fulfillment.
[AC3] Simulator integration test validates combined rebalancing + income + expense trajectory.

- [x] P7-T7: Run Phase 7 verification and complete DoD
Phase: 7 (Drawdown & Events)
Dependencies: P7-T4, P7-T5, P7-T6
Acceptance Criteria:
[AC1] `npm run build` passes.
[AC2] `npm run typecheck`, `npm run lint`, and `npm test` pass.
[AC3] Manual pass confirms Rebalancing config/glide path and income/expense events affect chart + detail table outputs.

## Phase 8 Plan — Monte Carlo

- [x] P8-T1: Expand shared contracts/types for historical eras and Monte Carlo responses
Phase: 8 (Monte Carlo)
Dependencies: P7-T7
Acceptance Criteria:
[AC1] Shared `HistoricalEra` enum and era definitions are added and exported.
[AC2] `MonteCarloResult` type includes percentile curves, terminal values, and probability of success metadata.
[AC3] `simulateRequestSchema` validates `selectedHistoricalEra` against known era keys.

- [x] P8-T2: Implement historical data loader and era summary services
Phase: 8 (Monte Carlo)
Dependencies: P8-T1
Acceptance Criteria:
[AC1] Historical CSV is parsed into in-memory monthly return rows.
[AC2] Era filtering returns rows constrained to selected date ranges.
[AC3] Historical summary computes mean, std dev, and sample size for each asset class.

- [x] P8-T3: Implement Monte Carlo runner with deterministic seed support
Phase: 8 (Monte Carlo)
Dependencies: P8-T2
Acceptance Criteria:
[AC1] Runner executes N simulations by sampling historical months with replacement.
[AC2] Percentile curves (5/10/25/50/75/90/95) are aggregated per month for total and each asset class.
[AC3] Optional seed yields reproducible Monte Carlo outputs.

- [x] P8-T4: Extend server routes for Monte Carlo execution and historical summary retrieval
Phase: 8 (Monte Carlo)
Dependencies: P8-T2, P8-T3
Acceptance Criteria:
[AC1] `POST /api/v1/simulate` branches by simulation mode and returns MC payload in Monte Carlo mode.
[AC2] `GET /api/v1/historical/summary` returns selected-era summary and resolved era options.
[AC3] Existing manual simulation route behavior remains intact.

- [x] P8-T5: Add Monte Carlo command bar + sidebar UI wiring
Phase: 8 (Monte Carlo)
Dependencies: P8-T1, P8-T4
Acceptance Criteria:
[AC1] Historical Era Selector appears only in Monte Carlo mode and updates store state.
[AC2] Historical Data Summary replaces Return Assumptions in Monte Carlo mode.
[AC3] Changing era updates summary immediately and does not auto-run simulation.

- [x] P8-T6: Render confidence bands and Probability of Success in output components
Phase: 8 (Monte Carlo)
Dependencies: P8-T3, P8-T5
Acceptance Criteria:
[AC1] Portfolio chart renders 10-90 and 25-75 confidence bands with median line in Monte Carlo mode.
[AC2] Chart tooltip includes percentile values in Monte Carlo mode.
[AC3] Probability of Success card appears only in Monte Carlo mode with threshold color coding.

- [x] P8-T7: Add Monte Carlo and historical data test coverage
Phase: 8 (Monte Carlo)
Dependencies: P8-T2, P8-T3, P8-T4
Acceptance Criteria:
[AC1] `historicalData.test.ts` covers CSV parsing and era filtering bounds.
[AC2] `monteCarlo.test.ts` covers determinism, extreme PoS cases, per-asset percentile aggregation, and performance target.
[AC3] Route tests cover historical summary endpoint and Monte Carlo simulation response shape/plausibility.

- [x] P8-T8: Run Phase 8 verification and complete DoD
Phase: 8 (Monte Carlo)
Dependencies: P8-T6, P8-T7
Acceptance Criteria:
[AC1] `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass.
[AC2] Monte Carlo run (1,000 paths) completes under 3 seconds in automated performance test.
[AC3] Manual mode behaviors from prior phases remain functional.

## Phase 9 Plan — Tracking Mode

- [x] P9-T1: Add Tracking actual override domain/contracts and request schemas
Phase: 9 (Tracking Mode)
Dependencies: P8-T8
Acceptance Criteria:
[AC1] Shared types include per-month actual overrides for starts, by-asset withdrawals, income, and expenses.
[AC2] `SimulateRequest` supports optional actual override payload.
[AC3] `ReforecastRequest`/`ReforecastResponse` contracts and schema validation are added.

- [x] P9-T2: Implement deterministic reforecast engine and `/api/v1/reforecast` route
Phase: 9 (Tracking Mode)
Dependencies: P9-T1
Acceptance Criteria:
[AC1] Deterministic engine uses fixed monthly rates from expected annual returns.
[AC2] Route validates payload and returns deterministic `SinglePathResult` with last edited month metadata.
[AC3] Engine honors month overrides for start balances, by-asset withdrawals, income, and expenses.

- [x] P9-T3: Add client reforecast API and tracking state/actions
Phase: 9 (Tracking Mode)
Dependencies: P9-T2
Acceptance Criteria:
[AC1] Client includes typed reforecast API wrapper.
[AC2] Store tracks per-month actual overrides and latest edited month index.
[AC3] Store supports row-level and full clear actions for actual overrides.

- [x] P9-T4: Implement mode-isolated workspace switching behavior
Phase: 9 (Tracking Mode)
Dependencies: P9-T3
Acceptance Criteria:
[AC1] First switch to Tracking clones Planning state once and clears Tracking result caches.
[AC2] Planning and Tracking retain independent inputs/results between mode switches.
[AC3] Active simulation result selector uses Tracking reforecast result in Manual mode when available.

- [x] P9-T5: Implement Tracking table editing UX and stale indicators
Phase: 9 (Tracking Mode)
Dependencies: P9-T3, P9-T4
Acceptance Criteria:
[AC1] Monthly table supports editable Tracking cells for starts, by-asset withdrawals, income, and expenses.
[AC2] Edited cells show bold+tint+dot markers, and rows up to latest edit are region-tinted.
[AC3] Table shows stale pill in Tracking+MonteCarlo when MC cache is outdated.
[AC4] Row reset action exists in monthly view and clears that row's overrides.

- [x] P9-T6: Implement Tracking chart overlays and stale treatment
Phase: 9 (Tracking Mode)
Dependencies: P9-T3, P9-T5
Acceptance Criteria:
[AC1] Chart renders boundary marker for latest edited month (`Actuals -> Simulated`).
[AC2] Tracking+MC shows realized left segment with MC bands on simulated right segment.
[AC3] MC stale state dims chart layers and shows stale banner text.

- [x] P9-T7: Add Phase 9 engine/route tests
Phase: 9 (Tracking Mode)
Dependencies: P9-T2
Acceptance Criteria:
[AC1] `deterministic.test.ts` covers determinism and override application.
[AC2] `reforecast.test.ts` covers success and validation failure responses.
[AC3] Existing Monte Carlo/manual tests remain passing.

- [x] P9-T8: Run verification and regression checks
Phase: 9 (Tracking Mode)
Dependencies: P9-T4, P9-T5, P9-T6, P9-T7
Acceptance Criteria:
[AC1] `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass.
[AC2] Tracking command bar shows actual watermark and clear action.
[AC3] Phases 2–8 continue functioning with no regressions.

## Phase 10 Plan — Stress Testing

- [x] P10-T1: Add shared stress scenario/result contracts and request validation
Phase: 10 (Stress Testing)
Dependencies: P9-T8
Acceptance Criteria:
[AC1] Shared domain includes stress scenario discriminated union and stress result shapes.
[AC2] Shared contracts include `StressTestRequest` and `StressTestResponse`.
[AC3] Zod schema validates stress scenarios (count, timing bounds, per-type params).

- [x] P10-T2: Implement server stress engine for scenario overlays
Phase: 10 (Stress Testing)
Dependencies: P10-T1
Acceptance Criteria:
[AC1] Stress engine clones base config/result context and applies scenario overlays by type.
[AC2] Manual stress runs use same seed/path baseline with scenario-only deltas.
[AC3] Monte Carlo stress runs apply scenario overlays per sampled path and aggregate outputs.

- [x] P10-T3: Add `POST /api/v1/stress-test` route and app registration
Phase: 10 (Stress Testing)
Dependencies: P10-T1, P10-T2
Acceptance Criteria:
[AC1] Route validates payload with shared schema and returns stress response.
[AC2] Invalid payloads return 400 with structured field errors.
[AC3] Route is registered under `/api/v1`.

- [x] P10-T4: Add client stress API and workspace-isolated store state/actions
Phase: 10 (Stress Testing)
Dependencies: P10-T1, P10-T3
Acceptance Criteria:
[AC1] Client includes typed stress API wrapper for `/api/v1/stress-test`.
[AC2] Store supports expand/collapse, add/remove/update scenarios, and stress result status.
[AC3] Stress state persists independently in Planning and Tracking workspaces.

- [x] P10-T5: Build Stress Test panel and scenario cards (#57/#58)
Phase: 10 (Stress Testing)
Dependencies: P10-T4
Acceptance Criteria:
[AC1] Collapsible stress panel renders below detail table and defaults to collapsed.
[AC2] Up to 4 scenario cards are configurable with add/remove controls.
[AC3] Empty prerequisite state is shown when no base simulation exists.

- [x] P10-T6: Build stress comparison display (#59)
Phase: 10 (Stress Testing)
Dependencies: P10-T5
Acceptance Criteria:
[AC1] Comparison bar display renders base + scenario values for key metrics.
[AC2] Comparison metrics table renders base and scenario deltas.
[AC3] Monte Carlo-specific PoS metrics appear only in Monte Carlo mode.

- [x] P10-T7: Build timing sensitivity chart (Manual only)
Phase: 10 (Stress Testing)
Dependencies: P10-T6
Acceptance Criteria:
[AC1] Timing sensitivity chart renders in Manual mode using scenario timing sweep.
[AC2] Timing chart is hidden in Monte Carlo mode with explanatory note.
[AC3] Tracking mode note clarifies Year 1 anchors to projected segment.

- [x] P10-T8: Add stress tests and run Phase 10 verification
Phase: 10 (Stress Testing)
Dependencies: P10-T3, P10-T7
Acceptance Criteria:
[AC1] Stress engine tests cover no-shock parity and early-crash degradation.
[AC2] Stress route tests cover valid and invalid payload behavior.
[AC3] `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass.

## Phase 11 Plan — Snapshot Persistence

- [x] P11-T1: Re-scope Phase 11 requirements from Undo/Redo to Snapshot-only
Phase: 11 (Snapshot Persistence)
Dependencies: P10-T8
Acceptance Criteria:
[AC1] `docs/ENGINEERING.md`, `docs/PRD.md`, and `docs/SPECS.md` remove explicit Undo/Redo guarantees.
[AC2] Affordances #62/#63 are marked reserved and snapshot affordances #64/#65 remain active.
[AC3] Snapshot behavior is documented as strict version-validated state restore.

- [x] P11-T2: Implement snapshot serializer/parser/restore with strict schema validation
Phase: 11 (Snapshot Persistence)
Dependencies: P11-T1
Acceptance Criteria:
[AC1] Client snapshot module serializes full state into `{ schemaVersion, name, savedAt, data }`.
[AC2] Snapshot load validates JSON + schema and rejects version mismatches.
[AC3] Snapshot load restores full app state, including cached outputs.

- [x] P11-T3: Add CommandBar Save/Load Snapshot controls
Phase: 11 (Snapshot Persistence)
Dependencies: P11-T2
Acceptance Criteria:
[AC1] Save Snapshot prompts for name and downloads a sanitized `.json` file.
[AC2] Load Snapshot opens file picker and restores state on valid file.
[AC3] Invalid/incompatible files show user-visible errors and do not mutate state.

- [x] P11-T4: Add Phase 11 snapshot test coverage
Phase: 11 (Snapshot Persistence)
Dependencies: P11-T2
Acceptance Criteria:
[AC1] Snapshot round-trip test passes.
[AC2] Strict version mismatch rejection test passes.
[AC3] Invalid snapshot rejection preserves prior store state.

- [x] P11-T5: Run verification and update project logs/docs
Phase: 11 (Snapshot Persistence)
Dependencies: P11-T3, P11-T4
Acceptance Criteria:
[AC1] `npm run typecheck`, `npm run lint`, and `npm test` pass.
[AC2] `PROGRESS.txt` includes implementation summary and any assumptions.
[AC3] `docs/SCENARIOS.md`, `docs/ARCHITECTURE.md`, and `docs/DATA_MODEL.md` reflect snapshot-only behavior.

- [x] P11-T6: Optimize snapshot size with packed cached-output rows
Phase: 11 (Snapshot Persistence)
Dependencies: P11-T5
Acceptance Criteria:
[AC1] Snapshot schema version is bumped and enforces strict exact-match loading.
[AC2] Cached output rows are serialized as compact packed arrays (`columns` + `data`) across simulation and stress caches.
[AC3] Snapshot tests cover malformed packed columns/row widths in addition to round-trip/version rejection behavior.
