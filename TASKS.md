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
