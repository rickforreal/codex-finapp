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

## Phase 12 Plan — Polish & Hardening

- [x] P12A-T1: Implement navbar UX refresh (brand block, right-aligned run, icon snapshot actions)
      Phase: 12 (Polish & Hardening)
      Dependencies: P11-T6
      Acceptance Criteria:
      [AC1] Command bar renders a fixed left brand block with app title (`FinApp`) and non-bloated compact height.
      [AC2] `Run Simulation` is positioned in the far-right action cluster.
      [AC3] Save/Load snapshot actions are icon-only buttons with tooltip titles and accessible labels.

- [x] P12A-T2: Add compact command-group labels without regressing command behavior
      Phase: 12 (Polish & Hardening)
      Dependencies: P12A-T1
      Acceptance Criteria:
      [AC1] Small labels render for `View Mode`, `Simulation Type`, and `Historical Era` (MC-only) without materially increasing navbar height.
      [AC2] Tracking-specific controls (`Clear Actuals`, `Actuals through`) remain near mode controls.
      [AC3] Existing run/snapshot behavior and validation continue to pass automated checks (`typecheck`, `lint`, `test`, `build`).

- [x] P12B-T1: Re-layout Core Parameters fields into two rows
      Phase: 12 (Polish & Hardening)
      Dependencies: P12A-T2
      Acceptance Criteria:
      [AC1] `Starting Age`, `Withdrawals Start At`, and `Expected Inflation Rate` are rendered on one row.
      [AC2] `Retirement Start Date` and `Retirement Duration` are rendered on the second row.
      [AC3] Existing field validation and store bindings continue to work.

- [x] P12B-T2: Expand Withdrawal Strategy guidance panel with collapsible detail
      Phase: 12 (Polish & Hardening)
      Dependencies: P12B-T1
      Acceptance Criteria:
      [AC1] Strategy guidance shows concise default summary.
      [AC2] Expand/collapse control reveals parameter effect notes and tradeoff commentary.
      [AC3] Guidance updates by selected strategy and preserves existing strategy selection behavior.

- [x] P12B-T3: Compact Historical Data summary table and add era commentary card
      Phase: 12 (Polish & Hardening)
      Dependencies: P12B-T1
      Acceptance Criteria:
      [AC1] Historical summary table renders four columns without horizontal scrolling.
      [AC2] Column headers are shortened to fit panel width cleanly.
      [AC3] Era-specific descriptive commentary appears in a sub-container below the table.

- [x] P12C-T1: Update chart controls layout and default display mode
      Phase: 12 (Polish & Hardening)
      Dependencies: P12B-T3
      Acceptance Criteria:
      [AC1] Chart control row uses `Breakdown` label/toggle to the right of Nominal/Real selector.
      [AC2] Real is the default chart display mode.
      [AC3] Empty-state chart control row mirrors the same control language and ordering.

- [x] P12C-T2: Remove chart zoom slider panel
      Phase: 12 (Polish & Hardening)
      Dependencies: P12C-T1
      Acceptance Criteria:
      [AC1] The chart zoom/range slider container is removed from the chart panel.
      [AC2] Chart renders full simulation horizon by default.
      [AC3] Chart tooltip and overlays still function after zoom control removal.

- [x] P12C-T3: Apply Monte Carlo y-axis focus scaling for median readability
      Phase: 12 (Polish & Hardening)
      Dependencies: P12C-T1
      Acceptance Criteria:
      [AC1] In Monte Carlo view, y-axis ceiling is biased toward median/IQR range so p50 undulations are more visible.
      [AC2] Upper percentile bands can clip at the chart top rather than flattening the median line.
      [AC3] Manual-mode y-axis behavior remains unchanged.

- [x] P12D-T1: Refresh detail-table header controls and title
      Phase: 12 (Polish & Hardening)
      Dependencies: P12C-T3
      Acceptance Criteria:
      [AC1] `Detail Ledger` title is shown in the table header area.
      [AC2] Monthly/Annual toggle is positioned on the right side of the header controls.
      [AC3] Asset-column control is replaced by `Breakdown` label-style toggle and spreadsheet mode is replaced by an icon-only expand/compress button.

- [x] P12D-T2: Add keyboard-first cell selection/edit behavior
      Phase: 12 (Polish & Hardening)
      Dependencies: P12D-T1
      Acceptance Criteria:
      [AC1] Clicking a table cell highlights it as active.
      [AC2] Tab/Shift+Tab moves selection left-to-right and top-to-bottom across cells.
      [AC3] In Tracking monthly mode, Enter on an editable selected cell starts edit mode with value auto-selected for replacement.

- [x] P12D-T3: Update period display and Monte Carlo median labeling
      Phase: 12 (Polish & Hardening)
      Dependencies: P12D-T1
      Acceptance Criteria:
      [AC1] Monthly `Period` displays calendar format (`YYYY-Mon`) anchored to `Retirement Start (MM/YYYY)`.
      [AC2] First monthly period matches the configured retirement start month/year.
      [AC3] Detail table indicates Monte Carlo rows represent median-path values.

- [DEFERRED] P12D-T4: Resolve remaining manual-mode table-header whitespace gap
  Phase: 12 (Polish & Hardening)
  Dependencies: P12D-T1
  Acceptance Criteria:
  [AC1] Manual mode shows no residual whitespace under `Detail Ledger` header before column header row.
  [AC2] Sticky header behavior remains correct across Manual/Monte Carlo and Monthly/Annual toggles.
  [DEFERRED] User requested moving on; issue is reproducible intermittently and will be revisited in a later polish pass.

- [x] P12E-T1: Default Stress Test panel to expanded
      Phase: 12 (Polish & Hardening)
      Dependencies: P12D-T3
      Acceptance Criteria:
      [AC1] Stress Test panel is expanded by default on app load.
      [AC2] Existing collapse/expand toggle behavior remains functional.
      [AC3] Client typecheck and lint pass.

- [x] P12F-T1: Add output loading-state UX while simulation is running
      Phase: 12 (Polish & Hardening)
      Dependencies: P12E-T1
      Acceptance Criteria:
      [AC1] While simulation status is `running`, chart and detail table show visible loading overlays.
      [AC2] Summary stats area shows a running-state loading indicator.
      [AC3] Client typecheck and lint pass.

- [x] P12Z-T1: Phase 12 pragmatic closeout verification and documentation
      Phase: 12 (Polish & Hardening)
      Dependencies: P12F-T1
      Acceptance Criteria:
      [AC1] Full regression gate passes: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
      [AC2] `docs/ENGINEERING.md` reflects accepted scope delta: CSV export intentionally removed from current release.
      [AC3] Open deferred issue (`P12D-T4`) remains tracked with explicit deferral rationale.
      [DECISION] CSV export (#56) removed from this release scope by product direction; Phase 12 closes without implementing export.

## Phase 13 Plan — Server-Defined Themes

- [x] P13-T1: Add shared theme contracts/enums/schemas
      Phase: 13 (Server-Defined Themes)
      Dependencies: P12Z-T1
      Acceptance Criteria:
      [AC1] Shared contracts define `ThemeId`, `ThemeDefinition`, `ThemeCatalogItem`, and `ThemeValidationIssue`.
      [AC2] Shared API contracts include `ThemesResponse`.
      [AC3] Shared schema validation covers server theme payload shape.

- [x] P13-T2: Implement server theme registry and validation
      Phase: 13 (Server-Defined Themes)
      Dependencies: P13-T1
      Acceptance Criteria:
      [AC1] Built-in Light, Dark, and High Contrast themes are defined on server.
      [AC2] Theme validation warnings are generated for contrast-sensitive token pairs.
      [AC3] Registry exports a typed response payload with default theme metadata.

- [x] P13-T3: Implement `/api/v1/themes` route and tests
      Phase: 13 (Server-Defined Themes)
      Dependencies: P13-T2
      Acceptance Criteria:
      [AC1] `GET /api/v1/themes` returns catalog + full definitions + default theme id.
      [AC2] Route is registered under `/api/v1`.
      [AC3] Route tests pass for shape/default semantics.

- [x] P13-T4: Add client theme state, precedence resolution, and CSS token applier
      Phase: 13 (Server-Defined Themes)
      Dependencies: P13-T3
      Acceptance Criteria:
      [AC1] Client fetches theme catalog from server and resolves startup theme using snapshot > local preference > server default.
      [AC2] Theme selection is stored in app state and persisted to snapshot/local preference.
      [AC3] Applying a theme updates CSS custom properties globally.

- [x] P13-T5: Add command bar theme selector UI and wire global switching
      Phase: 13 (Server-Defined Themes)
      Dependencies: P13-T4
      Acceptance Criteria:
      [AC1] Command bar includes icon-first theme control.
      [AC2] Selecting a theme applies immediately without rerun.
      [AC3] Built-in themes appear and active theme is visibly highlighted.

- [x] P13-T6: Tokenize chart/table stress visuals and complete regression gate
      Phase: 13 (Server-Defined Themes)
      Dependencies: P13-T4, P13-T5
      Acceptance Criteria:
      [AC1] Chart/manual/MC/stress colors are sourced from theme tokens.
      [AC2] Tracking edited/preserved/stale table states use theme state tokens.
      [AC3] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Feature Plan — Monokai Theme

- [x] FM-T1: Add `ThemeId.Monokai` in shared enums
      Phase: Feature/Monokai
      Dependencies: none
      Acceptance Criteria:
      [AC1] Shared enum exports `ThemeId.Monokai`.

- [x] FM-T2: Add Monokai definition to server theme registry
      Phase: Feature/Monokai
      Dependencies: FM-T1
      Acceptance Criteria:
      [AC1] `/api/v1/themes` includes Monokai in catalog and `themes` payload.
      [AC2] Light remains `defaultThemeId`.

- [x] FM-T3: Update built-in theme route tests
      Phase: Feature/Monokai
      Dependencies: FM-T2
      Acceptance Criteria:
      [AC1] Route test asserts Monokai appears in built-in IDs.

- [x] FM-T4: Run full verification and visual QA
      Phase: Feature/Monokai
      Dependencies: FM-T3
      Acceptance Criteria:
      [AC1] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass.
      [AC2] Monokai passes checklist in `docs/features/themes/monokai/ACCEPTANCE.md`.

## Feature Plan — Synthwave '84 Theme

- [x] FS84-T1: Add `ThemeId.Synthwave84` in shared enums
      Phase: Feature/Synthwave84
      Dependencies: none
      Acceptance Criteria:
      [AC1] Shared enum exports `ThemeId.Synthwave84`.

- [x] FS84-T2: Add Synthwave '84 definition to server theme registry
      Phase: Feature/Synthwave84
      Dependencies: FS84-T1
      Acceptance Criteria:
      [AC1] `/api/v1/themes` includes Synthwave '84 in catalog and `themes` payload.
      [AC2] App default theme remains unchanged.

- [x] FS84-T3: Update built-in theme route tests
      Phase: Feature/Synthwave84
      Dependencies: FS84-T2
      Acceptance Criteria:
      [AC1] Route tests assert `ThemeId.Synthwave84` appears in built-in IDs.

- [x] FS84-T4: Run verification + visual QA
      Phase: Feature/Synthwave84
      Dependencies: FS84-T3
      Acceptance Criteria:
      [AC1] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass.
      [AC2] Synthwave '84 passes checklist in `docs/features/themes/synthwave84/ACCEPTANCE.md`.

## Phase 14 Plan — Compare Portfolios (SxS)

- [x] P14-T1: Add compare mode/store foundations and workspace switching
      Phase: 14 (Compare Portfolios)
      Dependencies: P13-T6
      Acceptance Criteria:
      [AC1] `AppMode.Compare` is added and command bar mode selector supports Compare.
      [AC2] Store supports compare workspace branch (`left`/`right`) with active slot switching.
      [AC3] First switch into Compare seeds Slot A from current workspace and Slot B from Slot A clone.

- [x] P14-T2: Implement compare run orchestration with shared stochastic parity
      Phase: 14 (Compare Portfolios)
      Dependencies: P14-T1
      Acceptance Criteria:
      [AC1] Compare run triggers two `/simulate` calls.
      [AC2] Both compare slots use shared stochastic seed for fairness.
      [AC3] Per-slot run status and per-slot result caches are persisted in compare workspace state.

- [x] P14-T3: Build compare sidebar + output rendering (chart/stats/detail table)
      Phase: 14 (Compare Portfolios)
      Dependencies: P14-T2
      Acceptance Criteria:
      [AC1] Sidebar has Portfolio A/B switcher in Compare mode.
      [AC2] Summary stats render A/B values and deltas.
      [AC3] Chart renders both portfolio paths in Compare mode.
      [AC4] Detail table renders side-by-side ledgers with shared controls and no spreadsheet expansion.

- [x] P14-T4: Add compare snapshot compatibility (single + pair targeting)
      Phase: 14 (Compare Portfolios)
      Dependencies: P14-T1
      Acceptance Criteria:
      [AC1] Snapshot schema supports compare workspace payloads and remains backward-compatible with old single snapshots.
      [AC2] In Compare mode, load flow prompts for target (`left`/`right`/`both`).
      [AC3] Pair snapshots loaded into one side prompt for source slot (`A`/`B`).

- [x] P14-T5: Apply stress test dual-slot compare output
      Phase: 14 (Compare Portfolios)
      Dependencies: P14-T2
      Acceptance Criteria:
      [AC1] Shared stress scenarios execute against both compare slots.
      [AC2] Stress outputs are rendered per slot in compare view.
      [AC3] Compare stress behavior is covered by manual QA.

- [x] P14-T6: Run regression verification for implemented Compare core
      Phase: 14 (Compare Portfolios)
      Dependencies: P14-T1, P14-T2, P14-T3, P14-T4
      Acceptance Criteria:
      [AC1] `npm run typecheck` passes.
      [AC2] `npm run lint` passes.
      [AC3] `npm test` passes.
      [AC4] `npm run build` passes.

## Process Plan — Post-V1 Defect Workflow

- [x] PROC-ISSUES-T1: Establish docs-first defect tracking framework under `docs/issues`
      Phase: Process (Documentation Workflow)
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/issues/INDEX.md` exists with status/severity vocabulary and backlog table.
      [AC2] `docs/issues/_TEMPLATE/` contains required issue lifecycle templates (`ISSUE.md`, `PLAN.md`, `ACCEPTANCE.md`) plus optional `NOTES.md`.
      [AC3] `AGENTS.md`, `README.md`, and `docs/ENGINEERING.md` document defect workflow, bug ID convention (`BUG-####-slug`), and canonical tracker linkage to root `TASKS.md` + `PROGRESS.txt`.

- [x] PROC-FEATURE-UPDATES-T1: Define versioned workflow for updates to existing features
      Phase: Process (Documentation Workflow)
      Dependencies: PROC-ISSUES-T1
      Acceptance Criteria:
      [AC1] `AGENTS.md` defines existing-feature update policy: immutable baseline + versioned update folders (`<feature>-v1-1`, ...).
      [AC2] Version bump semantics are documented (`v1-x` for compatible updates, `v2-0+` for contract/model breaks).
      [AC3] `README.md`, `docs/ENGINEERING.md`, and `docs/features/CONVENTIONS.md` cross-reference the same conventions and tracking policy.

- [x] PROC-CHANGES-T1: Establish docs/changes lightweight workflow
      Phase: Process (Documentation Workflow)
      Dependencies: PROC-FEATURE-UPDATES-T1
      Acceptance Criteria:
      [AC1] `docs/changes/INDEX.md` and `docs/changes/_TEMPLATE/{CHANGE,ACCEPTANCE}.md` exist with `CHG-####` ID policy.
      [AC2] `AGENTS.md`, `README.md`, `docs/ENGINEERING.md`, and `docs/features/CONVENTIONS.md` define impact-based routing across `docs/features`, `docs/issues`, and `docs/changes`.
      [AC3] `docs/changes/CONVENTIONS.md` exists and a sample entry `docs/changes/CHG-0001-.../` demonstrates required file structure and traceability.

## Defect Plan — Compare Stress Overlay

- [x] BUG-0001-T1: Render compare stress overlays per portfolio (A/B) with dual legend + tooltip entries
      Phase: Defect (Compare / Stress)
      Dependencies: P14-T5
      Acceptance Criteria:
      [AC1] Compare-mode stress overlays draw two lines per scenario: `<Scenario> (A)` and `<Scenario> (B)`.
      [AC2] A/B lines use same scenario hue with A solid and B dashed.
      [AC3] Compare chart legend + tooltip list stress entries separately for `(A)` and `(B)`.
      [AC4] Compare stress runs persist per-slot stress outputs; partial failure keeps successful slot overlays visible with slot-specific error text.

## Minor Change Plan — Monte Carlo Detail Ledger Reference Column

- [x] CHG-0002-T1: Add `Start Total (p50)` column for Monte Carlo detail ledger
      Phase: Change (Minor UX Refinement)
      Dependencies: none
      Acceptance Criteria:
      [AC1] Monte Carlo detail ledger includes `Start Total (p50)` between `Age` and `Start Total` in planning, tracking, and compare modes.
[AC2] Column styling is subtly differentiated and includes a tooltip explainer.
[AC3] Monthly and annual value mapping follows cross-run p50 start-of-period semantics.
[AC4] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Minor Change Plan — Monte Carlo Summary Stats Aggregation

- [x] CHG-0010-T1: Derive MC monthly withdrawal summary cards from cross-run aggregates
Phase: Change (Minor UX/metrics semantics refinement)
Dependencies: none
Acceptance Criteria:
[AC1] Server MC payload includes cross-run withdrawal aggregate metrics for real monthly withdrawals.
[AC2] Summary cards #35-#39 use MC cross-run aggregates in both single and compare modes.
[AC3] Manual-mode summary stats remain unchanged.
[AC4] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Minor Change Plan — Compare Slot Theme-Adaptive Visuals

- [x] CHG-0003-T1: Implement compare slot theme-adaptive visual alignment (chips/tabs/chart + baseline/remove affordances)
      Phase: Change (Minor UX/Theming Refinement)
      Dependencies: CPV2-T8
      Acceptance Criteria:
      [AC1] Compare slot visuals avoid hardcoded baseline gold and use theme-adaptive slot-color-based baseline indicators.
      [AC2] Hover remove control is a solid red circle with a high-contrast, theme-compatible `X`.
      [AC3] Slot color identity is consistent across sidebar chips, compare detail tabs, and compare chart lines for `A..H`.
      [AC4] Theme token contracts and `/api/v1/themes` payload validation support explicit compare slot colors.
      [AC5] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Feature Plan — Compare Portfolios v2.0 (2..8)

- [x] CPV2-T1: Create v2.0 feature-doc wave and decision-complete baseline
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: P14-T6
      Acceptance Criteria:
      [AC1] `docs/features/compare-portfolios-v2-0/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] `PLAN.md` includes `Delta From Baseline` referencing `docs/features/compare-portfolios/`.
      [AC3] Scope decisions are locked for 2..8 slot compare, baseline stats, tabbed ledger, bounded parallel execution, and backward-compatible snapshots.

- [x] CPV2-T2: Generalize compare store model from fixed pair to slot collection (2..8)
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T1
      Acceptance Criteria:
      [AC1] Compare state supports `A..H` slot IDs with min 2/max 8 active slots.
      [AC2] Add/remove/clone slot actions exist with deterministic baseline fallback behavior.
      [AC3] Mode switch seeding initializes A from current workspace and B as clone of A.

- [x] CPV2-T3: Implement bounded-parallel compare run orchestration for simulation/stress
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T2
      Acceptance Criteria:
      [AC1] Compare run executes active slots via bounded parallel queue.
      [AC2] Shared stochastic parity is preserved across all active slots.
      [AC3] Partial failures remain slot-scoped while successful outputs persist.

- [x] CPV2-T4: Build compare slot manager, all-slot chart rendering, and baseline stats cards
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T2, CPV2-T3
      Acceptance Criteria:
      [AC1] Sidebar supports slot chips (`A..H`) and add/remove UI.
      [AC2] Compare chart always renders all active slots with stable slot identity.
      [AC3] Summary cards render all active slot values plus baseline-relative deltas.

- [x] CPV2-T5: Replace compare side-by-side ledger with single tabbed compare ledger
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T4
      Acceptance Criteria:
      [AC1] Compare detail section renders one shared ledger viewport with slot tabs.
      [AC2] Monthly/annual and breakdown controls remain shared.
      [AC3] Spreadsheet expand remains unavailable in compare mode.

- [x] CPV2-T6: Add snapshot v2 compare payload + legacy single/pair compatibility adapters
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T2
      Acceptance Criteria:
      [AC1] Snapshot save supports variable-slot compare payloads.
      [AC2] Legacy single snapshot import and legacy pair snapshot import both remain supported.
      [AC3] Compare import targeting is deterministic and explicit.

- [x] CPV2-T7: Run regression gate and close v2.0 implementation
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T3, CPV2-T4, CPV2-T5, CPV2-T6
      Acceptance Criteria:
      [AC1] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC2] Acceptance checklist in `docs/features/compare-portfolios-v2-0/ACCEPTANCE.md` passes.
      [AC3] `PROGRESS.txt` records implementation summary and canonical-doc impact.

- [x] CPV2-T8: Apply post-feedback UX refinement pass for compare v2.0
      Phase: Feature/ComparePortfolios-v2.0
      Dependencies: CPV2-T7
      Acceptance Criteria:
      [AC1] Compare chips support single-click active select, double-click baseline select, and hover `X` remove (when slot count > 2).
      [AC2] Compare ordering remains alphabetically normalized (`A..H`) after add/remove and targeted compare import mutations.
      [AC3] Compare `+` clones active slot, detail ledger tabs use circular chips, and MC compare chart shows baseline-only percentile bands.
      [AC4] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Minor Change Plan — Compare Slot A Non-Deletable

- [x] CHG-0004-T1: Enforce non-deletable compare slot `A` across store and sidebar affordance
      Phase: Change (Minor UX Invariant)
      Dependencies: CHG-0003-T1
      Acceptance Criteria:
      [AC1] Store `removeCompareSlot('A')` is a no-op regardless of slot count.
      [AC2] Sidebar remove affordance is hidden for slot `A` and unchanged for `B..H` when removable.
      [AC3] Store tests cover `A` no-op deletion, non-`A` removal path, and min-2 guard preservation.
      [AC4] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Feature Plan — Compare Portfolios v2.1 (Differences-Only Parameter Table)

- [x] CPV21-T1: Create v2.1 feature docs and lock delta scope
      Phase: Feature/ComparePortfolios-v2.1
      Dependencies: CPV2-T8
      Acceptance Criteria:
      [AC1] `docs/features/compare-portfolios-v2-1/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] `PLAN.md` includes `Delta From Baseline` referencing `docs/features/compare-portfolios-v2-0/`.
      [AC3] Scope decisions are locked for differences-only, run-gated compare parameter table behavior.

- [x] CPV21-T2: Implement compare parameter diff engine and test coverage
      Phase: Feature/ComparePortfolios-v2.1
      Dependencies: CPV21-T1
      Acceptance Criteria:
      [AC1] `compareParameterDiffs` covers all editable input families and only returns differing rows.
      [AC2] Normalization logic ignores ids for phases/events and uses deterministic list ordering.
      [AC3] Unit tests cover identical configs, scalar deltas, strategy mismatch, id-insensitive lists, baseline flags, and mixed multi-slot counts.

- [x] CPV21-T3: Build CompareParameterDiffTable panel and integrate into AppShell
      Phase: Feature/ComparePortfolios-v2.1
      Dependencies: CPV21-T2
      Acceptance Criteria:
      [AC1] Panel renders between SummaryStatsBar and PortfolioChart in Compare mode.
      [AC2] Panel reads current-mode slot `configSnapshot` values and is hidden if snapshots are incomplete.
      [AC3] Panel is hidden when no differences are present and highlights non-baseline differing cells when visible.

- [x] CPV21-T4: Update canonical docs and complete regression gate
      Phase: Feature/ComparePortfolios-v2.1
      Dependencies: CPV21-T3
      Acceptance Criteria:
      [AC1] `docs/SPECS.md` and `docs/SCENARIOS.md` reflect the new compare differences panel behavior.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` records completion summary and canonical-doc impact statement.

## Feature Plan — Compare Portfolios v2.1 Follow-up UX

- [x] CPV21-T5: Apply readability + collapsible UX refinement for differences panel
      Phase: Feature/ComparePortfolios-v2.1
      Dependencies: CPV21-T4
      Acceptance Criteria:
      [AC1] Differences table shows plain-English labels for withdrawal and drawdown strategy types.
      [AC2] Differences panel supports collapse/expand interaction with Stress Test-style header affordance.
      [AC3] `packages/client/src/lib/compareParameterDiffs.test.ts` covers label behavior and passes.

## Feature Plan — Compare Portfolios v3.0 (Always-On Compare)

- [x] CPV30-T1: Create v3.0 feature docs and lock delta scope
      Phase: Feature/ComparePortfolios-v3.0
      Dependencies: CPV21-T5
      Acceptance Criteria:
      [AC1] `docs/features/compare-portfolios-v3-0/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] `PLAN.md` includes `Delta From Baseline` referencing `docs/features/compare-portfolios-v2-0/` and `docs/features/compare-portfolios-v2-1/`.
      [AC3] Scope decisions are locked for always-on compare, two-mode app model, and tracking canonical-floor behavior.

- [x] CPV30-T2: Remove compare app mode contracts and update store invariants
      Phase: Feature/ComparePortfolios-v3.0
      Dependencies: CPV30-T1
      Acceptance Criteria:
      [AC1] Shared `AppMode` removes `Compare` and schemas/types compile with `planning|tracking` only.
      [AC2] Compare workspace min slot count is 1 (`A` only default) with `A` non-removable.
      [AC3] Store exposes slot-count-driven compare activation semantics (`slotOrder.length > 1`) and config mode mapping uses current app mode.

- [x] CPV30-T3: Decouple UI routing from app mode and enable always-visible compare slots
      Phase: Feature/ComparePortfolios-v3.0
      Dependencies: CPV30-T2
      Acceptance Criteria:
      [AC1] Command bar mode toggle shows Planning/Tracking only.
      [AC2] Sidebar compare slot manager is visible in both modes.
      [AC3] Output components switch between single/compare layouts based on active slot count.

- [x] CPV30-T4: Implement tracking canonical-floor enforcement across slots
      Phase: Feature/ComparePortfolios-v3.0
      Dependencies: CPV30-T2
      Acceptance Criteria:
      [AC1] Non-`A` overrides at/before `A.lastEditedMonthIndex` are discarded automatically.
      [AC2] Tracking edits in non-`A` slots are read-only at/before canonical boundary.
      [AC3] Multi-slot tracking run/stress paths apply effective slot overrides after canonical-floor normalization.

- [x] CPV30-T5: Apply snapshot v5 migration policy and compare-mode rejection
      Phase: Feature/ComparePortfolios-v3.0
      Dependencies: CPV30-T2
      Acceptance Criteria:
      [AC1] Snapshot schema version is incremented.
      [AC2] Snapshot load rejects payloads with `data.mode === \"compare\"` using explicit unsupported error.
      [AC3] Silent full-state replace behavior remains for valid snapshots.

- [x] CPV30-T6: Update canonical docs and run full regression gate
      Phase: Feature/ComparePortfolios-v3.0
      Dependencies: CPV30-T3, CPV30-T4, CPV30-T5
      Acceptance Criteria:
      [AC1] `docs/SPECS.md`, `docs/SCENARIOS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, and `docs/ARCHITECTURE.md` reflect v3.0 behavior.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` contains append-only completion summary and canonical-doc impact statement.

- [ ] BUG-0002-T1: Restore compare stress table spec-parity with scenario-section model
      Phase: Defect/BUG-0002
      Dependencies: none
      Acceptance Criteria:
      [AC1] Compare stress table columns are slot-aware (`Portfolio A..H`).
      [AC2] Base and each scenario section include required core rows, including monthly median/mean.
      [AC3] Scenario rows are matched by `scenarioId` and handle sparse slot data with `—`.

- [ ] BUG-0002-T2: Add compare stress table model unit tests and run regression gate
      Phase: Defect/BUG-0002
      Dependencies: BUG-0002-T1
      Acceptance Criteria:
      [AC1] Unit tests validate row completeness, MC/manual row conditions, and scenario-id matching.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] BUG-0002 docs and trackers are updated to `Done` append-only in `PROGRESS.txt`.

- [x] BUG-0002-T1: Restore compare stress table spec-parity with scenario-section model
      Phase: Defect/BUG-0002
      Dependencies: none
      Acceptance Criteria:
      [AC1] Compare stress table columns are slot-aware (`Portfolio A..H`).
      [AC2] Base and each scenario section include required core rows, including monthly median/mean.
      [AC3] Scenario rows are matched by `scenarioId` and handle sparse slot data with `—`.

- [x] BUG-0002-T2: Add compare stress table model unit tests and run regression gate
      Phase: Defect/BUG-0002
      Dependencies: BUG-0002-T1
      Acceptance Criteria:
      [AC1] Unit tests validate row completeness, MC/manual row conditions, and scenario-id matching.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] BUG-0002 docs and trackers are updated to `Done` append-only in `PROGRESS.txt`.

## Feature Plan — Detail Ledger Spreadsheet Refactor

- [x] DLS-T1: Extract helpers into cellHelpers.ts and install TanStack packages
- [x] DLS-T2: Build useDetailRows and useDetailColumns hooks
- [x] DLS-T3: Build useGridNavigation keyboard navigation hook
- [x] DLS-T4: Build new component tree behind feature flag
- [x] DLS-T5: Parity testing and cutover

## Feature Plan — Tracking Detail Ledger Contract v1.0

- [x] TLC-T1: Create tracking-ledger-contract feature docs and lock contract decisions
      Phase: Feature/TrackingLedgerContract
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/tracking-ledger-contract/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Contract decisions are explicit: Slot A canonical actuals, six editable ledger fields, non-A read-only, stale-first rerun model.
      [AC3] Plan includes canonical-doc impact and no API contract change.

- [x] TLC-T2: Restrict Tracking ledger editability to Slot A + six fields
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T1
      Acceptance Criteria:
      [AC1] Editable columns limited to `startStocks|startBonds|startCash|withdrawalStocks|withdrawalBonds|withdrawalCash`.
      [AC2] `Income`, `Expenses`, and withdrawal total are non-editable.
      [AC3] Non-A compare ledgers are read-only and do not expose edit affordances.

- [x] TLC-T3: Enforce Tracking month edit window (past/current/next)
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T2
      Acceptance Criteria:
      [AC1] Edit eligibility uses `retirementStartDate` + current date to compute `currentMonthIndex`.
      [AC2] Allowed month range is `<= currentMonthIndex + 1` and within horizon.
      [AC3] Out-of-window edit attempts are rejected/no-op.

- [x] TLC-T4: Ensure same-row derived-field congruence for start/withdrawal edits
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T2
      Acceptance Criteria:
      [AC1] Start-balance edits recompute same-row `Start Total`, `Move*`, `Market Move`, `Return %`, `End*`, and `End Total`.
      [AC2] Withdrawal-by-asset edits recompute same-row per-asset withdrawal, withdrawal total/real, `End*`, and `End Total`.
      [AC3] Derived behavior covered by unit tests.

- [x] TLC-T5: Apply Tracking stale-first lifecycle for ledger + input edits
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T2
      Acceptance Criteria:
      [AC1] Tracking ledger edits mark outputs stale in Manual and Monte Carlo.
      [AC2] Tracking input-panel changes mark outputs stale instead of auto-rerunning.
      [AC3] Run Simulation clears stale state and refreshes outputs.

- [x] TLC-T6: Canonicalize compare Tracking runs to Slot A actual history
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T5
      Acceptance Criteria:
      [AC1] Compare Tracking uses Slot A overrides as canonical floor for all slots.
      [AC2] Non-A override edit attempts are blocked/no-op.
      [AC3] Run/stress paths consume canonical Slot A override map.

- [x] TLC-T7: Preserve snapshot compatibility under new ledger contract
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T6
      Acceptance Criteria:
      [AC1] Legacy snapshots load without schema break.
      [AC2] Runtime behavior ignores non-A Tracking overrides and legacy row income/expense overrides.
      [AC3] Slot A overrides remain authoritative after load.

- [x] TLC-T8: Update canonical docs, run regression gates, and close the wave
      Phase: Feature/TrackingLedgerContract
      Dependencies: TLC-T1, TLC-T2, TLC-T3, TLC-T4, TLC-T5, TLC-T6, TLC-T7
      Acceptance Criteria:
      [AC1] `docs/SPECS.md`, `docs/SCENARIOS.md`, `docs/ARCHITECTURE.md`, and `docs/DATA_MODEL.md` reflect v1.0 contract.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` has append-only TLC entries with canonical-doc impact statement.

## Feature: Withdrawal Chart (Side-by-Side)

- [x] WC-T1: Create feature documentation
      Phase: Feature/WithdrawalChart
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/withdrawal-chart/` has FEATURE.md, PLAN.md, ACCEPTANCE.md.
      [AC2] Tasks added to root TASKS.md.

- [x] WC-T2: Extract shared chart primitives
      Phase: Feature/WithdrawalChart
      Dependencies: WC-T1
      Acceptance Criteria:
      [AC1] `packages/client/src/lib/chartPrimitives.ts` exports `linePath`, `areaPath`, `inflationFactor`, `stressScenarioColors`, chart constants.
      [AC2] PortfolioChart imports from chartPrimitives — no behavioral change.

- [x] WC-T3: Refactor PortfolioChart for external hosting
      Phase: Feature/WithdrawalChart
      Dependencies: WC-T2
      Acceptance Criteria:
      [AC1] PortfolioChart accepts `hoverIndex`, `onHoverChange`, `chartWidth` props.
      [AC2] Section wrapper, toggle controls, ResizeObserver, stale/loading overlays removed from PortfolioChart.

- [x] WC-T4: Create WithdrawalChart component
      Phase: Feature/WithdrawalChart
      Dependencies: WC-T2
      Acceptance Criteria:
      [AC1] WithdrawalChart renders all modes: single, breakdown, compare, MC, stress, tracking.
      [AC2] Tooltip shows withdrawal total, per-asset breakdown, shortfall when non-zero.

- [x] WC-T5: Create ChartPanel wrapper + AppShell wiring
      Phase: Feature/WithdrawalChart
      Dependencies: WC-T3, WC-T4
      Acceptance Criteria:
      [AC1] ChartPanel owns ResizeObserver, hoverIndex, toggle controls.
      [AC2] AppShell renders ChartPanel instead of PortfolioChart.
      [AC3] Side-by-side at wide widths, stacked at narrow (<900px).

- [x] WC-T6: Update canonical docs and verify
      Phase: Feature/WithdrawalChart
      Dependencies: WC-T5
      Acceptance Criteria:
      [AC1] SPECS.md, SCENARIOS.md, ARCHITECTURE.md updated.
      [AC2] `npm run typecheck && npm run lint && npm test && npm run build` passes.

## Feature Plan — Bookmarks (Local Compressed Persistence)

- [x] BM-T1: Create bookmarks feature docs and lock implementation decisions
      Phase: Feature/Bookmarks
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/bookmarks/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Decisions are locked for full-state load behavior, duplicate names, cap policy, and quota handling.
      [AC3] Canonical-doc impact list is explicit in `PLAN.md`.

- [x] BM-T2: Implement bookmark storage codec and localStorage persistence
      Phase: Feature/Bookmarks
      Dependencies: BM-T1
      Acceptance Criteria:
      [AC1] `packages/client/src/store/bookmarks.ts` defines `BookmarkRecord` + `BookmarksStorageEnvelope`.
      [AC2] Bookmark payloads store compressed snapshot JSON (gzip+Base64) under `finapp:bookmarks:v1`.
      [AC3] Save enforces newest-first ordering, duplicate-name support, 100-item cap with oldest eviction, and explicit quota errors.

- [x] BM-T3: Add command bar bookmark UX (create modal, dropdown load, hover delete)
      Phase: Feature/Bookmarks
      Dependencies: BM-T2
      Acceptance Criteria:
      [AC1] `Create Bookmark` action opens modal with required name input.
      [AC2] Bookmarks dropdown loads full state immediately on row click and lists newest first.
      [AC3] Hover trash affordance supports confirmed delete.

- [x] BM-T4: Add bookmark test coverage and run full regression gate
      Phase: Feature/Bookmarks
      Dependencies: BM-T3
      Acceptance Criteria:
      [AC1] Unit tests cover round-trip load, ordering, duplicates, targeted delete, cap eviction, payload corruption, version mismatch, and quota errors.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] Root docs + trackers are updated and PROGRESS includes canonical-doc impact statement.

## Feature Plan — Compare Portfolios v3.1 (Lockable/Syncable Inputs)

- [x] CPV31-T1: Create feature docs and lock scope
      Phase: Feature/ComparePortfolios-v3.1
      Dependencies: CPV30-T6
      Acceptance Criteria:
      [AC1] `docs/features/compare-portfolios-v3-1-lock-sync/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Plan includes delta from `compare-portfolios-v3-0` and lock/sync contract decisions.
      [AC3] Canonical-doc impact list is explicit.

- [x] CPV31-T2: Implement compareSync model and store actions
      Phase: Feature/ComparePortfolios-v3.1
      Dependencies: CPV31-T1
      Acceptance Criteria:
      [AC1] `compareWorkspace.compareSync` added with family locks, instance locks, and per-slot unsync state.
      [AC2] Store exposes family/instance lock toggle and per-slot sync toggle actions.
      [AC3] Compare workspace normalization applies A-master propagation semantics.

- [x] CPV31-T3: Wire input mutation guards and follower read-only semantics
      Phase: Feature/ComparePortfolios-v3.1
      Dependencies: CPV31-T2
      Acceptance Criteria:
      [AC1] Synced locked follower edits are blocked for all input families.
      [AC2] Unsynced followers remain editable for targeted families/instances.
      [AC3] List-family global and instance lock behavior matches exact-mirror + merge rules.

- [x] CPV31-T4: Add section and instance lock/sync UI controls
      Phase: Feature/ComparePortfolios-v3.1
      Dependencies: CPV31-T3
      Acceptance Criteria:
      [AC1] Sidebar section headers expose lock/sync controls for all families.
      [AC2] Spending/Income/Expense cards expose instance lock/sync controls.
      [AC3] Synced follower controls render read-only affordances.

- [x] CPV31-T5: Persist compareSync in snapshots/bookmarks with backwards default
      Phase: Feature/ComparePortfolios-v3.1
      Dependencies: CPV31-T2
      Acceptance Criteria:
      [AC1] Snapshot schema version bumped to 6 and includes compareSync payload.
      [AC2] Snapshot load defaults missing compareSync to unlocked state.
      [AC3] Bookmark round-trip restores compareSync state.

- [x] CPV31-T6: Update canonical docs and run regression gate
      Phase: Feature/ComparePortfolios-v3.1
      Dependencies: CPV31-T4, CPV31-T5
      Acceptance Criteria:
      [AC1] `docs/SPECS.md`, `docs/SCENARIOS.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md` updated.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` includes append-only completion entry with canonical-doc impact.

## Feature Plan — Compare Portfolios v3.1.1 (Sequential Spending Phase Locks)

- [x] CPV311-T1: Enforce sequential prefix invariant for Spending Phase instance locks
      Phase: Feature/ComparePortfolios-v3.1.1
      Dependencies: CPV31-T6
      Acceptance Criteria:
      [AC1] Locking Phase N is allowed only when N is first or N-1 is locked.
      [AC2] Unlocking Phase N cascades unlock to all later locked phases.
      [AC3] Runtime compare sync normalization removes non-prefix spending locks.

- [x] CPV311-T2: Add Spending Phase lock-eligibility UI affordance and tests
      Phase: Feature/ComparePortfolios-v3.1.1
      Dependencies: CPV311-T1
      Acceptance Criteria:
      [AC1] Slot A phase lock icon is disabled when phase is not lock-eligible.
      [AC2] Unit tests cover ineligible lock no-op and cascade unlock behavior.
      [AC3] Snapshot-load normalization test covers legacy non-prefix lock payload.

- [x] CPV311-T3: Update docs and run regression gate
      Phase: Feature/ComparePortfolios-v3.1.1
      Dependencies: CPV311-T1, CPV311-T2
      Acceptance Criteria:
      [AC1] SPECS/SCENARIOS/DATA_MODEL/ARCHITECTURE reflect sequential Spending lock rule.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] PROGRESS includes append-only completion entry and canonical-doc impact statement.

- [x] CPV311-T4: Fix Spending Phase lock eligibility refresh and single-slot lock visibility
      Phase: Feature/ComparePortfolios-v3.1.1
      Dependencies: CPV311-T3
      Acceptance Criteria:
      [AC1] Newly added Spending Phase in Slot A is lock-eligible when prior phase is locked.
      [AC2] Lock/sync controls are hidden when compare has only Slot A.
      [AC3] Client typecheck, lint, and tests pass.

## Feature Plan — Theme Engine Granular v1.1

- [x] TEG11-T1: Add theme token model v2 contracts and `/themes` response expansion
      Phase: Feature/ThemeEngine-Granular-v1.1
      Dependencies: none
      Acceptance Criteria:
      [AC1] Shared theme contracts include `tokenModelVersion`, `semantic`, `slots`, optional `overrides`, and `slotCatalog` types.
      [AC2] `/api/v1/themes` payload includes `tokenModelVersion` and `slotCatalog`.
      [AC3] Route tests verify expanded payload shape.

- [x] TEG11-T2: Implement resolver/compiler for slot-level CSS variables
      Phase: Feature/ThemeEngine-Granular-v1.1
      Dependencies: TEG11-T1
      Acceptance Criteria:
      [AC1] Client compiles slot tokens with deterministic precedence.
      [AC2] `applyTheme` emits `--theme-slot-*` vars from resolved slots.
      [AC3] Resolver/engine tests cover override precedence and slot var emission.

- [x] TEG11-T3: Migrate key UI surfaces to slot-driven classes
      Phase: Feature/ThemeEngine-Granular-v1.1
      Dependencies: TEG11-T2
      Acceptance Criteria:
      [AC1] App shell, command bar, shared controls, summary stats, compare diff, chart panel, and stress panel consume slot classes.
      [AC2] Existing built-in themes remain visually coherent after migration.
      [AC3] Snapshot compatibility is preserved (including missing `slotCatalog` fallback).

- [x] TEG11-T4: Update canonical docs and pass full regression gate
      Phase: Feature/ThemeEngine-Granular-v1.1
      Dependencies: TEG11-T3
      Acceptance Criteria:
      [AC1] `docs/SPECS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, and `docs/ARCHITECTURE.md` reflect v1.1 behavior.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` records append-only completion summary and canonical-doc impact.

## Feature Plan — Compare Portfolios v3.1.2 (Zero-Phase Spending Defaults)

- [x] CPV312-T1: Implement zero-phase default and optional-clamp engine semantics
      Phase: Feature/ComparePortfolios-v3.1.2
      Dependencies: CPV311-T4
      Acceptance Criteria:
      [AC1] Client default spending phases are empty (`0` phases).
      [AC2] Shared schema allows `spendingPhases: []` with max length 4.
      [AC3] Deterministic/Monte Carlo engines skip phase clamp when no active phase exists.

- [x] CPV312-T2: Add empty-state UX and load migration behavior
      Phase: Feature/ComparePortfolios-v3.1.2
      Dependencies: CPV312-T1
      Acceptance Criteria:
      [AC1] Spending Phases section shows explanation + Add CTA when empty.
      [AC2] Removing last phase returns to empty state.
      [AC3] Snapshot/bookmark load auto-clears legacy spending phases and spending-phase lock overrides.

- [x] CPV312-T3: Add regression tests, update docs, and run verification gate
      Phase: Feature/ComparePortfolios-v3.1.2
      Dependencies: CPV312-T1, CPV312-T2
      Acceptance Criteria:
      [AC1] Store/snapshot/bookmark/server tests cover zero-phase behavior and migration.
      [AC2] `docs/SPECS.md`, `docs/SCENARIOS.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, and `docs/API.md` updated.
      [AC3] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Feature Plan — Theme Pack: Stay The Course

- [x] STC-T1: Create Stay The Course theme pack docs under `docs/features/themes/stay-the-course`
      Phase: Feature/ThemePack-StayTheCourse
      Dependencies: none
      Acceptance Criteria:
      [AC1] `FEATURE.md`, `PLAN.md`, `ACCEPTANCE.md`, and `TOKENS.md` exist.
      [AC2] Palette source values are captured as authoritative token direction.
      [AC3] Canonical-doc impact is explicitly documented in the plan.

- [x] STC-T2: Implement Stay The Course as a built-in selectable theme
      Phase: Feature/ThemePack-StayTheCourse
      Dependencies: STC-T1
      Acceptance Criteria:
      [AC1] `ThemeId.StayTheCourse` exists in shared enums/contracts.
      [AC2] Server theme registry includes full Stay The Course token bundle and `/api/v1/themes` exposes it.
      [AC3] Route tests include the new built-in ID and regression gate (`typecheck`, `lint`, `test`, `build`) passes.

## Feature Plan — Theme Families + Per-Theme Appearance (Light/Dark) v1

- [x] TFLD1-T1: Expand shared theme contracts and `/themes` schema for families + variants
      Phase: Feature/ThemeFamilies-LightDark-v1
      Dependencies: TEG11-T4
      Acceptance Criteria:
      [AC1] Shared enums/types add `ThemeFamilyId`, `ThemeAppearance`, and `ThemeVariantId`.
      [AC2] `ThemeDefinition` carries `familyId` + `appearance`.
      [AC3] `ThemesResponse` adds `families`, `variants`, and `defaultSelection` while retaining legacy fields.

- [x] TFLD1-T2: Implement server family+variant registry output with compatibility aliases
      Phase: Feature/ThemeFamilies-LightDark-v1
      Dependencies: TFLD1-T1
      Acceptance Criteria:
      [AC1] `/api/v1/themes` returns grouped families and full variant list.
      [AC2] Legacy alias fields (`defaultThemeId/themes/catalog`) remain populated.
      [AC3] Route tests cover new payload fields and built-in family/variant coverage.

- [x] TFLD1-T3: Migrate client theme state, startup selection, and command bar UI
      Phase: Feature/ThemeFamilies-LightDark-v1
      Dependencies: TFLD1-T1, TFLD1-T2
      Acceptance Criteria:
      [AC1] Store tracks selected family, per-family remembered appearance, and active variant id.
      [AC2] Command bar renders family rows with per-row light/dark toggles and A11y single-variant handling.
      [AC3] Startup precedence remains snapshot > local preference > server default using family+appearance.

- [x] TFLD1-T4: Add snapshot/local-preference migration and complete canonical docs + regression gate
      Phase: Feature/ThemeFamilies-LightDark-v1
      Dependencies: TFLD1-T3
      Acceptance Criteria:
      [AC1] Legacy `selectedThemeId` snapshots map deterministically to family+appearance.
      [AC2] Canonical docs updated (`SPECS`, `DATA_MODEL`, `API`, `ARCHITECTURE`) and feature docs created.
      [AC3] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

- [x] MT-T1: Add 40+ new theme families to shared enums
      Phase: Feature/MemeThemes-v1
      Dependencies: none
      Acceptance Criteria:
      [AC1] ThemeFamilyId enum includes all new families (PatagoniaVest, MoneyNeverSleeps, Hodl, etc.)
      [AC2] ThemeVariantId enum includes light/dark variants for each family.
      [AC3] Client store defaults updated with new family appearance preferences.

- [x] MT-T2: Implement server registry with dark variants and family definitions
      Phase: Feature/MemeThemes-v1
      Dependencies: MT-T1
      Acceptance Criteria:
      [AC1] Registry includes dark variants with unique color tokens for all 40+ themes.
      [AC2] Family catalog includes all new families with descriptions.
      [AC3] Light variants auto-generated from dark variants.

- [x] MT-T3: Complete canonical docs updates
      Phase: Feature/MemeThemes-v1
      Dependencies: MT-T2
      Acceptance Criteria:
      [AC1] Feature docs created in docs/features/meme-themes-v1/
      [AC2] PROGRESS.txt updated with implementation summary.
      [AC3] Root docs confirm theme system supports extended catalog.

## Feature Plan — Theme Families + Per-Theme Appearance (Light/Dark) v1.1

- [x] TFLD11-T1: Create v1.1 feature docs for replacement wave
      Phase: Feature/ThemeFamilies-LightDark-v1.1
      Dependencies: TFLD1-T4
      Acceptance Criteria:
      [AC1] `docs/features/theme-families-light-dark-v1-1/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] `PLAN.md` includes Delta From Baseline referencing `theme-families-light-dark-v1`.
      [AC3] Compatibility strategy (stable IDs) is documented.

- [x] TFLD11-T2: Replace Monokai/Synthwave84 dark variants with Circuit Breaker/Powell Pivot
      Phase: Feature/ThemeFamilies-LightDark-v1.1
      Dependencies: TFLD11-T1
      Acceptance Criteria:
      [AC1] `ThemeVariantId.MonokaiDark` and `ThemeVariantId.Synthwave84Dark` use replacement metadata/tokens.
      [AC2] Family metadata and legacy catalog labels expose replacement names while keeping IDs stable.
      [AC3] `/api/v1/themes` remains schema-compatible.

- [x] TFLD11-T3: Add targeted light variant overrides for replacement families
      Phase: Feature/ThemeFamilies-LightDark-v1.1
      Dependencies: TFLD11-T2
      Acceptance Criteria:
      [AC1] `MonokaiLight` gets Circuit Breaker-specific surface/text/border/chart/state overrides.
      [AC2] `Synthwave84Light` gets Powell Pivot-specific surface/text/border/chart/state overrides.
      [AC3] Replacement light variants remain distinct from generic generated defaults.

- [x] TFLD11-T4: Update tests/docs and run regression gate
      Phase: Feature/ThemeFamilies-LightDark-v1.1
      Dependencies: TFLD11-T2, TFLD11-T3
      Acceptance Criteria:
      [AC1] Themes route tests assert replacement family names and stable legacy IDs.
      [AC2] `docs/SPECS.md` reflects replacement names in Affordance #66 family list.
      [AC3] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Minor Change Plan — CHG-0005 Theme Dropdown Scroll + Selected-Row Visibility

- [x] CHG-0005-T1: Add bounded scroll container and selected-row auto-scroll in theme popover
      Phase: Minor Change/CHG-0005
      Dependencies: none
      Acceptance Criteria:
      [AC1] Theme dropdown list has bounded height with vertical scrolling for long lists.
      [AC2] Opening theme dropdown brings the selected family row into view.
      [AC3] Existing theme selection and light/dark toggle behavior remains unchanged.

- [x] CHG-0005-T2: Update minor-change docs/index and close trackers
      Phase: Minor Change/CHG-0005
      Dependencies: CHG-0005-T1
      Acceptance Criteria:
      [AC1] `docs/changes/CHG-0005-theme-dropdown-scroll-selected-visibility/{CHANGE,ACCEPTANCE}.md` created.
      [AC2] `docs/changes/INDEX.md` includes CHG-0005 row.
      [AC3] `PROGRESS.txt` has append-only CHG-0005 completion entry.

- [x] CHG-0005-T3: Theme popover scrollbars with command bar slot tokens
      Phase: Minor Change/CHG-0005
      Dependencies: CHG-0005-T1
      Acceptance Criteria:
      [AC1] Scrollbar track and thumb colors derive from command bar popover theme slots.
      [AC2] Themed scrollbar styles are applied to theme and bookmark popover scroll containers.
      [AC3] Dark themes no longer show bright white popover scrollbars.

## Minor Change Plan — CHG-0006 Segmented Toggle Active Hover Contrast

- [x] CHG-0006-T1: Fix segmented active-option hover specificity
      Phase: Minor Change/CHG-0006
      Dependencies: none
      Acceptance Criteria:
      [AC1] Active segmented option keeps active fill/text while hovered.
      [AC2] Inactive segmented options preserve hover treatment.
      [AC3] Fix applies consistently across light/dark themes.

- [x] CHG-0006-T2: Update change docs/index and trackers
      Phase: Minor Change/CHG-0006
      Dependencies: CHG-0006-T1
      Acceptance Criteria:
      [AC1] `docs/changes/CHG-0006-segmented-toggle-active-hover-contrast/{CHANGE,ACCEPTANCE}.md` created.
      [AC2] `docs/changes/INDEX.md` includes CHG-0006 row.
      [AC3] `PROGRESS.txt` has append-only CHG-0006 completion entry.

## Minor Change Plan — CHG-0007 Theme Menu Order + Outside-Click Close

- [x] CHG-0007-T1: Reorder theme menu list with pinned top priorities
      Phase: Minor Change/CHG-0007
      Dependencies: none
      Acceptance Criteria:
      [AC1] Theme menu begins with Default, High Contrast, Money Never Sleeps, Patagonia Vest, Stay The Course.
      [AC2] Remaining families use stable pseudo-random ordering.
      [AC3] Existing selection/highlight behavior is preserved.

- [x] CHG-0007-T2: Close command bar menus on outside click
      Phase: Minor Change/CHG-0007
      Dependencies: CHG-0007-T1
      Acceptance Criteria:
      [AC1] Theme menu closes on outside click/tap.
      [AC2] Bookmarks menu closes on outside click/tap.
      [AC3] In-menu interactions continue to function without accidental close.

- [x] CHG-0007-T3: Update change docs/index and trackers
      Phase: Minor Change/CHG-0007
      Dependencies: CHG-0007-T2
      Acceptance Criteria:
      [AC1] `docs/changes/CHG-0007-theme-menu-order-and-outside-close/{CHANGE,ACCEPTANCE}.md` created.
      [AC2] `docs/changes/INDEX.md` includes CHG-0007 row.
      [AC3] `PROGRESS.txt` has append-only CHG-0007 completion entry.

## Minor Change Plan — CHG-0008 MC p50 Reference Column Theme Balance

- [x] CHG-0008-T1: Make MC p50 reference column use theme-balanced detail-ledger reference slots
      Phase: Minor Change/CHG-0008
      Dependencies: none
      Acceptance Criteria:
      [AC1] `Start Total (p50)` tint uses detail-ledger reference background slot instead of generic interactive-secondary token.
      [AC2] `Start Total (p50)` text uses detail-ledger reference text slot.
      [AC3] Column behavior remains unchanged.

- [x] CHG-0008-T2: Update change docs/index and trackers
      Phase: Minor Change/CHG-0008
      Dependencies: CHG-0008-T1
      Acceptance Criteria:
      [AC1] `docs/changes/CHG-0008-mc-p50-reference-column-theme-balance/{CHANGE,ACCEPTANCE}.md` created.
      [AC2] `docs/changes/INDEX.md` includes CHG-0008 row.
      [AC3] `PROGRESS.txt` has append-only CHG-0008 completion entry.

## Feature Plan — Adaptive TWR Smoothing

- [x] ATS-T1: Create feature docs and lock smoothing contract
      Phase: Feature/AdaptiveTwrSmoothing
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/adaptive-twr-smoothing/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Contract locks pre-clamp blend smoothing with prior-final-withdrawal anchor.
      [AC3] Scope remains in-place update to existing Adaptive TWR strategy.

- [x] ATS-T2: Extend shared strategy types and schema validation
      Phase: Feature/AdaptiveTwrSmoothing
      Dependencies: ATS-T1
      Acceptance Criteria:
      [AC1] `DynamicSwrAdaptiveParams` includes `smoothingEnabled` and `smoothingBlend`.
      [AC2] Request schema validates `smoothingEnabled` and `smoothingBlend in [0, 0.95]`.
      [AC3] Shared/server/client typecheck passes for strategy contract.

- [x] ATS-T3: Implement engine smoothing pipeline in deterministic and simulator flows
      Phase: Feature/AdaptiveTwrSmoothing
      Dependencies: ATS-T2
      Acceptance Criteria:
      [AC1] Adaptive strategy computes raw monthly target and optional blend to prior final monthly withdrawal.
      [AC2] Spending-phase monthly clamp applies after smoothing.
      [AC3] Prior anchor updates from final month withdrawal each step.

- [x] ATS-T4: Add Adaptive TWR smoothing controls in UI/store and compare diffs
      Phase: Feature/AdaptiveTwrSmoothing
      Dependencies: ATS-T2
      Acceptance Criteria:
      [AC1] Strategy params include smoothing toggle and blend slider.
      [AC2] Store defaults/normalization support legacy missing fields.
      [AC3] Compare parameter diff table includes smoothing fields.

- [x] ATS-T5: Update canonical docs and run regression gates
      Phase: Feature/AdaptiveTwrSmoothing
      Dependencies: ATS-T3, ATS-T4
      Acceptance Criteria:
      [AC1] `docs/SPECS.md`, `docs/WITHDRAWAL_STRATEGIES.md`, `docs/DATA_MODEL.md`, `docs/API.md`, and `docs/SCENARIOS.md` are updated.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` contains append-only completion summary with canonical-doc impact.

## Feature Plan — Sidebar Collapse Toggle

- [x] SCT-T1: Implement isSidebarCollapsed state and toggleSidebar action
      Phase: Feature/SidebarCollapse
      Dependencies: none
      Acceptance Criteria:
      [AC1] `useAppStore` includes `isSidebarCollapsed` boolean in `ui` slice.
      [AC2] `toggleSidebar` action correctly flips the state.
      [AC3] `cloneSnapshotState` preserves the state for persistence.

- [x] SCT-T2: Update AppShell layout with responsive toggle and transitions
      Phase: Feature/SidebarCollapse
      Dependencies: SCT-T1
      Acceptance Criteria:
      [AC1] `aside` element responds to `isSidebarCollapsed` with `w-[400px]` vs `w-0`.
      [AC2] Floating circular toggle button with rotating chevron implemented.
      [AC3] Smooth CSS transitions for width and content opacity.

- [x] SCT-T3: Verify UX and update progress logs
      Phase: Feature/SidebarCollapse
      Dependencies: SCT-T2
      Acceptance Criteria:
      [AC1] Main content expands to fill horizontal space when sidebar is collapsed.
      [AC2] Toggle button remains accessible and functional in both states.
      [AC3] `PROGRESS.txt` updated with completion entry.

## Feature Plan — UX: Consolidate Historical Era Selection

- [x] UX-CHE-T1: Move dropdown and fetching logic to HistoricalDataSummary
      Phase: Feature/UXConsolidation
      Dependencies: none
      Acceptance Criteria:
      [AC1] `HistoricalDataSummary.tsx` includes the `Dropdown` for era selection.
      [AC2] Fetching logic is co-located in the summary component.
      [AC3] Table and commentary update correctly on selection.
      [AC4] Era selection is per-slot in Compare mode and supports sync/locking.

- [x] UX-CHE-T2: Remove redundant controls from CommandBar
      Phase: Feature/UXConsolidation
      Dependencies: UX-CHE-T1
      Acceptance Criteria:
      [AC1] "Historical Era" section removed from `CommandBar.tsx` JSX.
      [AC2] Unused imports and state hooks cleaned up in `CommandBar.tsx`.
      [AC3] Client typecheck passes.

- [x] CHG-0009: Add bookmark description field
      Phase: Change/CHG-0009
      Dependencies: BM-T4
      Acceptance Criteria:
      [AC1] Create Bookmark modal includes optional description input field.
      [AC2] Description saved with bookmark and displayed in dropdown + tooltip on hover.
      [AC3] Backwards compatible with existing bookmarks.
      [AC4] Tests added for description functionality.

## Feature — Block Bootstrap Sampling

- [x] BB-T1: Add blockBootstrapEnabled/blockBootstrapLength to SimulationConfig and Zod schema
      Phase: Feature/BlockBootstrap
      Dependencies: none
      Acceptance Criteria:
      [AC1] `SimulationConfig` interface has both fields.
      [AC2] Zod schema validates `blockBootstrapLength` in [3, 36].
      [AC3] `createBaseConfig()` test fixture includes default values.

- [x] BB-T2: Implement block bootstrap sampling in Monte Carlo engine
      Phase: Feature/BlockBootstrap
      Dependencies: BB-T1
      Acceptance Criteria:
      [AC1] `sampleHistoricalReturnsBlock` draws contiguous blocks with circular wrap.
      [AC2] Call site dispatches based on `config.blockBootstrapEnabled`.
      [AC3] 3 new tests pass: determinism, divergence from i.i.d., blockLength=1 edge case.

- [x] BB-T3: Add block bootstrap state and actions to client store
      Phase: Feature/BlockBootstrap
      Dependencies: BB-T1
      Acceptance Criteria:
      [AC1] Fields in WorkspaceSnapshot, SnapshotState, initial state.
      [AC2] Setters follow setSelectedHistoricalEra pattern with historicalEra family sync.
      [AC3] All workspace helpers updated (workspaceFromState, snapshotFieldsFromWorkspace, configFromWorkspace, applyCompareSyncFromMaster, cloneSnapshotState, useSimulationConfig).
      [AC4] Snapshot schema version bumped to 7.

- [x] BB-T4: Add block bootstrap UI controls to HistoricalDataSummary
      Phase: Feature/BlockBootstrap
      Dependencies: BB-T3
      Acceptance Criteria:
      [AC1] Toggle + slider between era dropdown and stats table.
      [AC2] Slider range 3..36, step 1, default 12 with dynamic helper text.
      [AC3] Controls disabled when readOnly.
      [AC4] Slider uses accent-brand-blue for theme alignment.

- [x] BB-T5: Update canonical docs and feature docs
      Phase: Feature/BlockBootstrap
      Dependencies: BB-T4
      Acceptance Criteria:
      [AC1] Feature folder created with FEATURE.md, PLAN.md, ACCEPTANCE.md.
      [AC2] SPECS.md updated with Affordance #11b.
      [AC3] DATA_MODEL.md, API.md, ARCHITECTURE.md updated.
      [AC4] TASKS.md and PROGRESS.txt updated.

## Feature Plan — Historical Era Custom Range (Month-Year)

- [x] HCR-T1: Create feature docs and root task scaffold
      Phase: Feature/HistoricalEraCustomRange
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/historical-era-custom-range/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Plan locks Custom-era model (`HistoricalEra.Custom` + `customHistoricalRange`).
      [AC3] Root `TASKS.md` includes `HCR-T1...HCR-T5`.

- [x] HCR-T2: Extend shared contracts and server historical filtering for month-year custom ranges
      Phase: Feature/HistoricalEraCustomRange
      Dependencies: HCR-T1
      Acceptance Criteria:
      [AC1] Shared enum/type/schema include `HistoricalEra.Custom` and `customHistoricalRange` validation.
      [AC2] Historical summary route supports custom query (`startMonth/startYear/endMonth/endYear`).
      [AC3] MC engine and historical summary both use inclusive month-year filtering from a shared resolver.

- [x] HCR-T3: Add client store/snapshot wiring and compare sync support
      Phase: Feature/HistoricalEraCustomRange
      Dependencies: HCR-T2
      Acceptance Criteria:
      [AC1] `AppStore`, `WorkspaceSnapshot`, and `SnapshotState` persist `customHistoricalRange`.
      [AC2] Setter actions include initialization from selected preset and preserve stale-state semantics in Tracking.
      [AC3] Compare `historicalEra` lock/sync propagates `selectedHistoricalEra`, `customHistoricalRange`, and block-bootstrap fields.

- [x] HCR-T4: Implement Historical Data Summary custom two-thumb month-year slider UX
      Phase: Feature/HistoricalEraCustomRange
      Dependencies: HCR-T3
      Acceptance Criteria:
      [AC1] Historical Era dropdown includes `Custom`.
      [AC2] Selecting Custom initializes from current preset span; switching away/back preserves prior custom range.
      [AC3] Two-thumb slider shows live `MMM YYYY` endpoint labels and is disabled in read-only follower slots.
      [AC4] Historical summary fetch depends on era + custom range (when custom) without auto-run simulation.

- [x] HCR-T5: Add tests, update canonical docs, and pass regression gate
      Phase: Feature/HistoricalEraCustomRange
      Dependencies: HCR-T2, HCR-T3, HCR-T4
      Acceptance Criteria:
      [AC1] Shared/server/client tests cover schema constraints, month-boundary filtering, snapshot round-trip, and compare sync behavior.
      [AC2] Canonical docs updated: `docs/SPECS.md`, `docs/SCENARIOS.md`, `docs/DATA_MODEL.md`, `docs/API.md`, `docs/ARCHITECTURE.md`.
      [AC3] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC4] `PROGRESS.txt` append-only completion entry includes canonical-doc impact statement.

## Feature Plan — Historical Era Custom Range v1.1 (Event Labels)

- [x] HCR11-T1: Add event catalog + exact-match resolver for custom range slider
      Phase: Feature/HistoricalEraCustomRange-v1.1
      Dependencies: HCR-T5
      Acceptance Criteria:
      [AC1] Client event catalog contains broad month-year markers within dataset bounds.
      [AC2] Resolver returns event label only on exact month-year matches.
      [AC3] Unit tests validate exact-match/non-match behavior and unique month-year markers.

- [x] HCR11-T2: Render independent start/end event labels in HistoricalDataSummary custom slider
      Phase: Feature/HistoricalEraCustomRange-v1.1
      Dependencies: HCR11-T1
      Acceptance Criteria:
      [AC1] Start thumb and end thumb each render independent event labels above slider.
      [AC2] Non-event months display `No mapped event`.
      [AC3] Existing custom slider behavior (inclusive range, read-only disablement, no auto-run) remains unchanged.

- [x] HCR11-T3: Update feature docs, canonical docs, and pass regression gate
      Phase: Feature/HistoricalEraCustomRange-v1.1
      Dependencies: HCR11-T2
      Acceptance Criteria:
      [AC1] Feature update folder exists: `docs/features/historical-era-custom-range-v1-1/{FEATURE,PLAN,ACCEPTANCE}.md`.
      [AC2] Canonical docs updated: `docs/SPECS.md`, `docs/SCENARIOS.md`.
      [AC3] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.

## Feature Plan — Historical Era Custom Range v1.2 (Event Snap)

- [x] HCR12-T1: Add event-month snapping helper and tests
      Phase: Feature/HistoricalEraCustomRange-v1.2
      Dependencies: HCR11-T3
      Acceptance Criteria:
      [AC1] Helper resolves nearest in-range event month ordinal with threshold snapping.
      [AC2] Unit tests cover near-event snap and out-of-range no-snap behavior.
      [AC3] Existing event label lookup behavior remains unchanged.

- [x] HCR12-T2: Apply magnetic event snap to both custom slider thumbs
      Phase: Feature/HistoricalEraCustomRange-v1.2
      Dependencies: HCR12-T1
      Acceptance Criteria:
      [AC1] Start and end thumb drags snap to event months within threshold.
      [AC2] Slider still supports non-event months when outside threshold.
      [AC3] Existing start/end clamp behavior remains valid.

- [x] HCR12-T3: Update feature docs + SPECS and pass client regression gate
      Phase: Feature/HistoricalEraCustomRange-v1.2
      Dependencies: HCR12-T2
      Acceptance Criteria:
      [AC1] Feature update folder exists: `docs/features/historical-era-custom-range-v1-2/{FEATURE,PLAN,ACCEPTANCE}.md`.
      [AC2] `docs/SPECS.md` documents magnetic snapping behavior.
      [AC3] `npm run typecheck -w @finapp/client`, `npm run lint -w @finapp/client`, and `npm run test -w @finapp/client` pass.

## Feature Plan — Returns Source Unification

- [x] RSU-T1: Extend shared/server contracts for `returnsSource` and `simulationRuns`
      Phase: Feature/ReturnsSourceUnification
      Dependencies: none
      Acceptance Criteria:
      [AC1] `SimulationConfig` supports `returnsSource` and `simulationRuns`.
      [AC2] Request schema validates and defaults both fields.
      [AC3] Server normalizes effective simulation mode from source/runs/std-dev behavior.

- [x] RSU-T2: Update Monte Carlo engine to support manual-assumption sampling
      Phase: Feature/ReturnsSourceUnification
      Dependencies: RSU-T1
      Acceptance Criteria:
      [AC1] MC uses historical sampling when `returnsSource=historical`.
      [AC2] MC uses stochastic assumption sampling when `returnsSource=manual`.
      [AC3] Simulation count supports `1..10000`.

- [x] RSU-T3: Replace command-bar simulation-type toggle with source-driven returns workflow
      Phase: Feature/ReturnsSourceUnification
      Dependencies: RSU-T1
      Acceptance Criteria:
      [AC1] Command bar no longer exposes Manual/Monte Carlo selector.
      [AC2] Sidebar returns section owns Manual/Historical source toggle.
      [AC3] Sidebar exposes simulation run count control.

- [x] RSU-T4: Wire store/snapshot compatibility for source/runs
      Phase: Feature/ReturnsSourceUnification
      Dependencies: RSU-T1
      Acceptance Criteria:
      [AC1] Workspace + snapshot state persist `returnsSource` and `simulationRuns`.
      [AC2] Legacy snapshots load with defaults and without schema failures.
      [AC3] Compare family sync propagates source/runs where applicable.

- [x] RSU-T5: Regression pass
      Phase: Feature/ReturnsSourceUnification
      Dependencies: RSU-T2, RSU-T3, RSU-T4
      Acceptance Criteria:
      [AC1] `npm run typecheck` passes.
      [AC2] `npm run lint` passes.
      [AC3] `npm test` and `npm run build` pass.

## Feature Plan — Monte Carlo Parallel Performance

- [x] MCPERF-T1: Create docs-first feature artifacts and root tracking entries
      Phase: Feature/MonteCarloParallelPerformance
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/monte-carlo-parallel-performance/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Root `TASKS.md` includes `MCPERF-T1..MCPERF-T5`.
      [AC3] `PROGRESS.txt` includes append-only kickoff entry.

- [x] MCPERF-T2: Optimize Monte Carlo aggregation and representative path retention
      Phase: Feature/MonteCarloParallelPerformance
      Dependencies: MCPERF-T1
      Acceptance Criteria:
      [AC1] Percentile aggregation sorts once per month distribution per asset.
      [AC2] Full per-run path retention removed; deterministic replay used for representative path.
      [AC3] Existing Monte Carlo determinism and percentile tests continue to pass.

- [x] MCPERF-T3: Align stress Monte Carlo run-count semantics with simulationRuns
      Phase: Feature/MonteCarloParallelPerformance
      Dependencies: MCPERF-T1
      Acceptance Criteria:
      [AC1] Stress base/scenario Monte Carlo runs use clamped `config.simulationRuns`.
      [AC2] No fixed `runs: 1000` remains in stress Monte Carlo path.
      [AC3] Stress tests pass.

- [x] MCPERF-T4: Add server process-level parallel workers and increase compare fan-out cap
      Phase: Feature/MonteCarloParallelPerformance
      Dependencies: MCPERF-T1
      Acceptance Criteria:
      [AC1] Server boot supports cluster workers outside test mode.
      [AC2] Worker count is configurable via env override with sane default.
      [AC3] Client compare and compare-stress bounded parallelism cap increases to 8.

- [x] MCPERF-T5: Update canonical docs and pass regression gate
      Phase: Feature/MonteCarloParallelPerformance
      Dependencies: MCPERF-T2, MCPERF-T3, MCPERF-T4
      Acceptance Criteria:
      [AC1] Canonical docs updated: `docs/ARCHITECTURE.md`, `docs/API.md`.
      [AC2] `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
      [AC3] `PROGRESS.txt` append-only completion entry includes canonical-doc impact statement.

## Feature Plan — Monte Carlo Rust N-API Migration

- [x] RUSTMC-T1: Create docs-first Rust migration artifacts and root tracker entries
      Phase: Feature/MonteCarloRustNapi
      Dependencies: none
      Acceptance Criteria:
      [AC1] `docs/features/monte-carlo-rust-napi/{FEATURE,PLAN,ACCEPTANCE}.md` exist.
      [AC2] Root `TASKS.md` includes `RUSTMC-T1..RUSTMC-T6`.
      [AC3] `PROGRESS.txt` includes append-only kickoff entry.

- [x] RUSTMC-T2: Add native MC workspace package scaffold with napi-rs Rust crate and JS loader
      Phase: Feature/MonteCarloRustNapi
      Dependencies: RUSTMC-T1
      Acceptance Criteria:
      [AC1] `packages/native-mc` exists with `Cargo.toml`, Rust source, package metadata, and loader entry.
      [AC2] Native package exports `runMonteCarloJson` boundary function.
      [AC3] Native package build/test scripts are callable from npm workspace.

- [x] RUSTMC-T3: Add server Rust adapter + engine selector/fallback/shadow controls
      Phase: Feature/MonteCarloRustNapi
      Dependencies: RUSTMC-T2
      Acceptance Criteria:
      [AC1] `FINAPP_MC_ENGINE=ts|rust` supported with default `ts`.
      [AC2] Rust load/execute failures fallback to TS with structured warning logs.
      [AC3] `FINAPP_MC_SHADOW_COMPARE=1` runs sampled dual-engine compares and logs deltas.

- [x] RUSTMC-T4: Ensure stress and compare paths consume unified selector behavior
      Phase: Feature/MonteCarloRustNapi
      Dependencies: RUSTMC-T3
      Acceptance Criteria:
      [AC1] Stress MC calls use shared `runMonteCarlo` selector path.
      [AC2] No API contract changes required for compare/stress callers.
      [AC3] Existing stress/compare tests remain passing.

- [x] RUSTMC-T5: Add native parity/fallback tests and toolchain-aware build hooks
      Phase: Feature/MonteCarloRustNapi
      Dependencies: RUSTMC-T3
      Acceptance Criteria:
      [AC1] Server tests cover rust-selector fallback and shadow-compare non-failure behavior.
      [AC2] Root scripts include native build/test hooks with safe skip when cargo is unavailable.
      [AC3] Existing regression suites remain green.

- [x] RUSTMC-T6: Add CI workflow and canonical docs updates
      Phase: Feature/MonteCarloRustNapi
      Dependencies: RUSTMC-T2, RUSTMC-T3
      Acceptance Criteria:
      [AC1] GitHub workflow runs native build/test matrix for darwin-arm64 + linux-x64.
      [AC2] `docs/ARCHITECTURE.md` and `docs/API.md` updated for runtime selector/fallback model.
      [AC3] `PROGRESS.txt` append-only completion entry includes canonical-doc impact statement.
