# Architecture — Retirement Forecasting App

## 1. Overview

This document defines the technical architecture for the Retirement Forecasting application. It specifies the system topology, technology choices, repository structure, component design, data flow, performance targets, and testing strategy. It is written for a developer (human or AI) who will implement the application and needs to understand the structural "what" — what the system is made of and how the pieces connect.

**This document does not cover:**

- Product requirements or UX behavior → see **PRD.md** and **SPECS.md**
- Domain data types and schema definitions → see **DATA_MODEL.md**
- API endpoint definitions and contracts → see **API.md**
- Withdrawal strategy formulas → see **WITHDRAWAL_STRATEGIES.md**
- User-facing scenarios → see **SCENARIOS.md**
- Build process, phasing, and workflow → see **ENGINEERING.md**

---

## 2. System Architecture

### 2.1 High-Level Topology

```
┌─────────────────────────────────────────────────────┐
│                     Client (Browser)                │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  React   │  │   Zustand    │  │  Undo/Redo    │  │
│  │   UI     │◄─┤   Store      │◄─┤  Middleware   │  │
│  │          │  │              │  │  (100 deep)   │  │
│  └────┬─────┘  └──────┬───────┘  └───────────────┘  │
│       │               │                             │
│       │        ┌──────┴───────┐                     │
│       │        │  Simulation  │                     │
│       │        │  Result      │                     │
│       │        │  Cache       │                     │
│       │        │ (Manual+MC)  │                     │
│       │        └──────────────┘                     │
│       │                                             │
│  ┌────┴──────────────────────┐  ┌────────────────┐  │
│  │  Snapshot Save/Load       │  │  CSV Export     │  │
│  │  (JSON ↔ File System)     │  │  (client-only)  │  │
│  └───────────────────────────┘  └────────────────┘  │
│       │                                             │
└───────┼─────────────────────────────────────────────┘
        │  HTTP (REST/JSON)
        │
┌───────┼─────────────────────────────────────────────┐
│       ▼            Server (Node.js)                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              Fastify Application              │   │
│  │                                               │   │
│  │  ┌──────────┐  ┌─────────────────────────┐   │   │
│  │  │  Routes   │  │  Validation Middleware   │   │   │
│  │  │  /api/v1  │  │  (Zod schemas)          │   │   │
│  │  └────┬─────┘  └─────────────────────────┘   │   │
│  │       │                                       │   │
│  │  ┌────┴──────────────────────────────────┐   │   │
│  │  │         Simulation Engine              │   │   │
│  │  │  (single canonical implementation)     │   │   │
│  │  │                                        │   │   │
│  │  │  ┌────────────┐  ┌─────────────────┐  │   │   │
│  │  │  │  Manual     │  │  Monte Carlo    │  │   │   │
│  │  │  │  Simulator  │  │  Simulator      │  │   │   │
│  │  │  └────────────┘  └─────────────────┘  │   │   │
│  │  │                                        │   │   │
│  │  │  ┌────────────┐  ┌─────────────────┐  │   │   │
│  │  │  │  Determin.  │  │  Drawdown       │  │   │   │
│  │  │  │  Reforecast │  │  Engine         │  │   │   │
│  │  │  └────────────┘  └─────────────────┘  │   │   │
│  │  │                                        │   │   │
│  │  │  ┌────────────┐  ┌─────────────────┐  │   │   │
│  │  │  │  Strategy   │  │  Historical     │  │   │   │
│  │  │  │  Registry   │  │  Market Data    │  │   │   │
│  │  │  │  (12 strats) │  │  (CSV, in-mem)  │  │   │   │
│  │  │  └────────────┘  └─────────────────┘  │   │   │
│  │  └────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

**Stateless server.** The server holds no per-user state. Every API request contains the complete simulation configuration. The server computes results and returns them. There is no database, no sessions, no authentication. The server is a pure computation service.

**API-first boundary.** All server functionality is exposed through versioned REST endpoints. The React web client is the first consumer, but the API is designed to be consumed by any HTTP client — a future iOS app, Android app, or CLI tool would call the same endpoints.

**Single canonical engine.** The simulation engine exists in exactly one place: the server. There is no client-side simulation code. This eliminates the risk of computational drift between two implementations and keeps the API boundary clean for future mobile clients. UX responsiveness for Tracking Mode re-forecasts is achieved through debouncing and optimistic UI patterns (see Section 9.3).

**Shared type system.** Domain types and API contracts are defined once in a shared TypeScript package and imported by both client and server. This eliminates type drift across the boundary.

**Client owns all UX state.** Undo/redo history, snapshot serialization, chart zoom/pan, table view preferences, and simulation result caching are entirely client-side concerns. The server never sees or manages these.

### 2.3 Future Extensibility

The architecture supports these future additions without structural changes:

- **Mobile clients.** The REST API is client-agnostic. A Swift or Kotlin app consumes the same endpoints. The shared package's `contracts/` and `domain/` directories contain no web-specific dependencies.
- **Persistence layer.** A database can be added behind the Fastify application to store user accounts and saved plans. The simulation engine and API contract are unaffected.
- **Additional simulation modes.** New withdrawal strategies, drawdown strategies, or simulation engines (e.g., bootstrapped historical blocks) plug into the strategy registry pattern without modifying the core engine loop.

---

## 3. Technology Stack

### 3.1 Runtime and Language

| Component | Choice | Version Target |
|---|---|---|
| Runtime | Node.js | ≥ 20 LTS |
| Language | TypeScript | ≥ 5.4 |
| Type strictness | `strict: true` in all tsconfig files | — |

TypeScript strict mode is non-negotiable. The simulation engine handles financial calculations where type errors can produce silently wrong numbers.

### 3.2 Frontend

| Concern | Choice | Rationale |
|---|---|---|
| UI framework | React | ≥ 18. Mature ecosystem, hooks-based, wide community support. |
| State management | Zustand | Lightweight single-store with middleware support. Middleware enables undo/redo and snapshot serialization cleanly. Simpler than Redux for this scale. |
| Styling | Tailwind CSS | ≥ 3.x. Utility-first, aligns with SPECS.md's precise spacing/sizing values. Custom theme for the app's color palette. |
| Charting | Recharts | React-native charting library built on D3. Supports line, area, stacked area, and bar charts — all chart types required by SPECS.md. Good animation support. See Section 6.6 for details. |
| Table virtualization | TanStack Table (React Table v8) + TanStack Virtual | Headless table with sorting, column toggling, and row virtualization for 480+ row monthly views. |
| HTTP client | Fetch API (native) | No library needed. A thin typed wrapper around fetch using shared API types provides type-safe requests. |
| Build tool | Vite | Fast dev server with HMR. Native TypeScript and Tailwind support. |

### 3.3 Backend

| Concern | Choice | Rationale |
|---|---|---|
| HTTP framework | Fastify | ≥ 4.x. High performance, first-class TypeScript support, schema-based validation, structured logging. |
| Validation | Zod | Define schemas as TypeScript-first, derive both runtime validation and static types. Shared with the client via the shared types package. |
| Historical data | Static CSV file | Loaded and parsed into memory at server startup. ~1,200 rows × 3–4 columns. Negligible memory footprint. |
| CSV parsing | papaparse or csv-parse | One-time parse at startup. |
| Testing | Vitest | Fast, TypeScript-native, compatible with the Vite ecosystem used on the frontend. |

### 3.4 Monorepo Tooling

| Concern | Choice | Rationale |
|---|---|---|
| Package manager | npm workspaces | Built into npm ≥ 7. No additional tooling required. Simple and reliable for 3 packages. |
| Task runner | Turborepo (optional) or npm scripts | Turborepo adds caching and dependency-aware task ordering. Worth adding if build times become a concern; otherwise, npm scripts suffice for 3 packages. |

### 3.5 Code Quality

| Concern | Choice |
|---|---|
| Linting | ESLint with `@typescript-eslint` |
| Formatting | Prettier |
| Pre-commit hooks | lint-staged + Husky (optional) |
| Type checking | `tsc --noEmit` in CI and pre-commit |

---

## 4. Repository Structure

### 4.1 Monorepo Layout

```
retirement-forecaster/
├── packages/
│   ├── shared/                    # Shared TypeScript types and constants
│   │   ├── src/
│   │   │   ├── domain/            # Core domain types (client-agnostic)
│   │   │   │   ├── simulation.ts  # SimulationConfig, SimulationResult
│   │   │   │   ├── portfolio.ts   # Portfolio, AssetClass, Allocation
│   │   │   │   ├── strategies.ts  # WithdrawalStrategy, DrawdownStrategy enums + params
│   │   │   │   ├── events.ts      # IncomeEvent, ExpenseEvent
│   │   │   │   ├── phases.ts      # SpendingPhase
│   │   │   │   ├── actuals.ts     # Actuals data structure
│   │   │   │   ├── snapshot.ts    # Snapshot schema with version
│   │   │   │   └── stress.ts      # StressScenario, StressResult
│   │   │   ├── contracts/         # API boundary types (DTOs + validation)
│   │   │   │   ├── api.ts         # API request/response shapes (reference domain types)
│   │   │   │   ├── schemas.ts     # Zod schemas for request validation
│   │   │   │   └── errors.ts      # Error response shapes
│   │   │   ├── ui/                # Web-client display constants (NOT imported by contracts/ or domain/)
│   │   │   │   ├── colors.ts      # Asset class colors, status colors, chart palettes
│   │   │   │   ├── strategyMeta.ts # Strategy display names, categories, tags, tooltip text
│   │   │   │   └── defaults.ts    # Default values for all UI inputs
│   │   │   ├── constants/         # Shared non-UI constants (importable by any consumer)
│   │   │   │   ├── eras.ts        # Historical era definitions (name, start year, end year)
│   │   │   │   └── enums.ts       # Shared enums (AssetClass, Frequency, SimulationMode, etc.)
│   │   │   └── index.ts           # Barrel export
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/                    # Fastify backend
│   │   ├── src/
│   │   │   ├── app.ts             # Fastify app creation and plugin registration
│   │   │   ├── server.ts          # Entry point (start listening)
│   │   │   ├── routes/
│   │   │   │   ├── simulation.ts  # POST /api/v1/simulate
│   │   │   │   ├── reforecast.ts  # POST /api/v1/reforecast (deterministic)
│   │   │   │   ├── stress.ts      # POST /api/v1/stress-test
│   │   │   │   └── health.ts      # GET /api/v1/health
│   │   │   ├── engine/
│   │   │   │   ├── simulator.ts       # Core month-by-month simulation loop
│   │   │   │   ├── deterministic.ts   # Deterministic reforecast (no randomness)
│   │   │   │   ├── monteCarlo.ts      # Monte Carlo runner (N simulations)
│   │   │   │   ├── strategies/        # One file per withdrawal strategy
│   │   │   │   │   ├── constantDollar.ts
│   │   │   │   │   ├── percentOfPortfolio.ts
│   │   │   │   │   ├── oneOverN.ts
│   │   │   │   │   ├── vpw.ts
│   │   │   │   │   ├── dynamicSwr.ts
│   │   │   │   │   ├── sensibleWithdrawals.ts
│   │   │   │   │   ├── ninetyFivePercent.ts
│   │   │   │   │   ├── guytonKlinger.ts
│   │   │   │   │   ├── vanguardDynamic.ts
│   │   │   │   │   ├── endowment.ts
│   │   │   │   │   ├── hebelerAutopilot.ts
│   │   │   │   │   ├── capeBased.ts
│   │   │   │   │   └── index.ts       # Strategy registry (map of enum → function)
│   │   │   │   ├── drawdown/
│   │   │   │   │   ├── bucket.ts
│   │   │   │   │   ├── rebalancing.ts
│   │   │   │   │   └── index.ts       # Drawdown registry
│   │   │   │   ├── helpers/
│   │   │   │   │   ├── pmt.ts         # PMT financial function
│   │   │   │   │   ├── inflation.ts   # Inflation adjustment utilities
│   │   │   │   │   ├── returns.ts     # Return generation (random normal, historical sampling)
│   │   │   │   │   ├── rounding.ts    # Centralized rounding policy (see Section 5.3)
│   │   │   │   │   └── statistics.ts  # Percentiles, mean, std dev, probability of success
│   │   │   │   └── historicalData.ts  # CSV loader + era filtering + in-memory store
│   │   │   ├── validation/
│   │   │   │   └── schemas.ts     # Server-side Zod schema application
│   │   │   └── types/             # Server-only types (internal engine state, etc.)
│   │   ├── data/
│   │   │   └── historical-returns.csv  # Bundled market data 1926–2024
│   │   ├── tests/
│   │   │   ├── engine/            # Mirrors src/engine structure
│   │   │   │   ├── strategies/    # One test file per strategy
│   │   │   │   ├── drawdown/
│   │   │   │   ├── simulator.test.ts
│   │   │   │   ├── deterministic.test.ts
│   │   │   │   └── monteCarlo.test.ts
│   │   │   └── routes/
│   │   │       ├── simulation.test.ts
│   │   │       └── reforecast.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── client/                    # React frontend
│       ├── src/
│       │   ├── main.tsx           # Entry point
│       │   ├── App.tsx            # Root component, layout shell
│       │   ├── api/               # Typed API client functions
│       │   │   ├── simulationApi.ts
│       │   │   └── reforecastApi.ts  # Debounced, abortable reforecast calls
│       │   ├── store/
│       │   │   ├── useAppStore.ts     # Zustand store definition
│       │   │   ├── undoMiddleware.ts  # Undo/redo middleware
│       │   │   ├── slices/            # Logical groupings of store state
│       │   │   │   ├── coreParams.ts
│       │   │   │   ├── portfolio.ts
│       │   │   │   ├── returnAssumptions.ts
│       │   │   │   ├── spendingPhases.ts
│       │   │   │   ├── withdrawalStrategy.ts
│       │   │   │   ├── drawdownStrategy.ts
│       │   │   │   ├── incomeEvents.ts
│       │   │   │   ├── expenseEvents.ts
│       │   │   │   ├── stressScenarios.ts
│       │   │   │   ├── actuals.ts
│       │   │   │   ├── simulation.ts  # Mode, status, cached results
│       │   │   │   └── ui.ts          # View preferences (chart toggle, table toggle, zoom)
│       │   │   └── snapshot.ts        # Serialize/deserialize for save/load
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── AppShell.tsx
│       │   │   │   ├── CommandBar.tsx
│       │   │   │   └── Sidebar.tsx
│       │   │   ├── inputs/
│       │   │   │   ├── CoreParameters.tsx
│       │   │   │   ├── StartingPortfolio.tsx
│       │   │   │   ├── ReturnAssumptions.tsx
│       │   │   │   ├── HistoricalDataSummary.tsx
│       │   │   │   ├── SpendingPhases/
│       │   │   │   │   ├── SpendingPhases.tsx
│       │   │   │   │   └── PhaseCard.tsx
│       │   │   │   ├── WithdrawalStrategy/
│       │   │   │   │   ├── WithdrawalStrategy.tsx
│       │   │   │   │   ├── StrategyParams.tsx
│       │   │   │   │   └── StrategyTooltip.tsx
│       │   │   │   ├── DrawdownStrategy/
│       │   │   │   │   ├── DrawdownStrategy.tsx
│       │   │   │   │   ├── BucketConfig.tsx
│       │   │   │   │   ├── RebalancingConfig.tsx
│       │   │   │   │   └── GlidePathEditor.tsx
│       │   │   │   ├── IncomeEvents/
│       │   │   │   │   ├── IncomeEvents.tsx
│       │   │   │   │   └── IncomeEventCard.tsx
│       │   │   │   └── ExpenseEvents/
│       │   │   │       ├── ExpenseEvents.tsx
│       │   │   │       └── ExpenseEventCard.tsx
│       │   │   ├── outputs/
│       │   │   │   ├── SummaryStats/
│       │   │   │   │   ├── SummaryStatsBar.tsx
│       │   │   │   │   └── StatCard.tsx
│       │   │   │   ├── PortfolioChart/
│       │   │   │   │   ├── PortfolioChart.tsx
│       │   │   │   │   └── ChartTooltip.tsx
│       │   │   │   ├── DetailTable/
│       │   │   │   │   ├── DetailTable.tsx
│       │   │   │   │   ├── TableRow.tsx
│       │   │   │   │   └── EditableCell.tsx
│       │   │   │   └── StressTest/
│       │   │   │       ├── StressTestPanel.tsx
│       │   │   │       ├── ScenarioCard.tsx
│       │   │   │       ├── ComparisonChart.tsx
│       │   │   │       └── TimingSensitivity.tsx
│       │   │   └── shared/
│       │   │       ├── NumericInput.tsx
│       │   │       ├── CurrencyInput.tsx
│       │   │       ├── PercentInput.tsx
│       │   │       ├── SegmentedToggle.tsx
│       │   │       ├── Dropdown.tsx
│       │   │       ├── MonthYearPicker.tsx
│       │   │       ├── ToggleSwitch.tsx
│       │   │       ├── DonutChart.tsx
│       │   │       ├── CollapsibleSection.tsx
│       │   │       ├── ConfirmDialog.tsx
│       │   │       └── Toast.tsx
│       │   ├── hooks/
│       │   │   ├── useSimulation.ts
│       │   │   ├── useReforecast.ts   # Debounce + abort controller for Tracking edits
│       │   │   ├── useUndoRedo.ts
│       │   │   ├── useSnapshot.ts
│       │   │   └── useKeyboardShortcuts.ts
│       │   ├── utils/
│       │   │   ├── formatting.ts
│       │   │   ├── csvExport.ts
│       │   │   └── validation.ts
│       │   └── styles/
│       │       └── tailwind.config.ts
│       ├── public/
│       ├── index.html
│       ├── tests/
│       │   ├── components/
│       │   ├── store/
│       │   └── utils/
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── docs/
│   ├── PRD.md
│   ├── SPECS.md
│   ├── SCENARIOS.md
│   ├── ARCHITECTURE.md            # This file
│   ├── DATA_MODEL.md
│   ├── API.md
│   ├── WITHDRAWAL_STRATEGIES.md
│   ├── ENGINEERING.md
│   └── TASKS.md
│
├── PROGRESS.txt
├── AGENTS.md
├── package.json                   # Root workspace config
├── tsconfig.base.json
├── .eslintrc.json
├── .prettierrc
└── .gitignore
```

### 4.2 File Naming Conventions

| Category | Convention | Example |
|---|---|---|
| React components | PascalCase, `.tsx` | `PhaseCard.tsx` |
| Hooks | camelCase, prefixed `use`, `.ts` | `useSimulation.ts` |
| Store slices | camelCase, `.ts` | `spendingPhases.ts` |
| Engine modules | camelCase, `.ts` | `guytonKlinger.ts` |
| Type files | camelCase, `.ts` | `portfolio.ts` |
| Test files | Same name as source + `.test.ts(x)` | `guytonKlinger.test.ts` |
| Constants | camelCase file, UPPER_SNAKE for exported constants | `defaults.ts` → `DEFAULT_INFLATION_RATE` |

---

## 5. Shared Types Package

### 5.1 Internal Structure and Import Rules

The shared package is organized into four directories with strict import boundaries:

```
shared/src/
├── domain/       # Core domain types. No dependencies on contracts/ or ui/.
├── contracts/    # API boundary types (DTOs, Zod schemas). May import from domain/.
├── ui/           # Web-client display constants. May import from domain/ and constants/.
└── constants/    # Shared non-UI constants (enums, era definitions). No dependencies.
```

**Import rule (enforced by linting):** `contracts/` and `domain/` must not import from `ui/`. This ensures that future mobile API consumers can depend on `contracts/` and `domain/` without pulling in web-specific color tokens, chart palettes, or strategy display metadata.

`ui/` may import from `domain/` and `constants/` freely — it needs the enums and type definitions to associate display metadata with domain concepts.

### 5.2 What Belongs Where

| Directory | Contains | Does NOT contain |
|---|---|---|
| `domain/` | `SimulationConfig`, `SimulationResult`, `Portfolio`, `SpendingPhase`, `IncomeEvent`, `ExpenseEvent`, `WithdrawalStrategyConfig`, `DrawdownStrategyConfig`, `StressScenario`, `Actuals`, `Snapshot`, `SinglePathResult`, `MonteCarloResult` | API shapes, color values, display strings |
| `contracts/` | `SimulateRequest`, `SimulateResponse`, `ReforecastRequest`, `ReforecastResponse`, `StressTestRequest`, `StressTestResponse`, `ApiError`, Zod schemas for all requests | Domain invariants, UI constants |
| `ui/` | Asset class colors (`#4A90D9`, etc.), strategy display names/categories/tags, tooltip text, status color thresholds, default input values | Types used by the server, validation logic |
| `constants/` | `AssetClass` enum, `Frequency` enum, `SimulationMode` enum, `WithdrawalStrategyType` enum, `HistoricalEra` definitions | Anything with a dependency on other directories |

### 5.3 Numeric Representation and Rounding Policy

**Storage format:** All monetary values are stored as **integer cents** (e.g., `$1,400,000.00` is stored as `140000000`). This eliminates floating-point precision issues in accumulation. Asset class balances, withdrawal amounts, income amounts, expense amounts, and all monetary fields in the domain types use this representation.

**Percentages** are stored as decimal floats (e.g., `0.04` for 4%, `0.08` for 8%). This is the natural representation for multiplication in formulas.

**Rounding policy:**

- All intermediate calculations within the simulation engine use **full floating-point precision** (64-bit IEEE 754 doubles). No intermediate rounding.
- Rounding to integer cents occurs at **output boundaries only**: when recording a monthly ledger entry (portfolio balances, withdrawal amount, income, expenses for that month) and when serializing results in the API response.
- Rounding method: **`Math.round`** (round half away from zero). This is the standard expectation for dollar amounts and is deterministic.
- The rounding module (`engine/helpers/rounding.ts`) provides a single function used everywhere: `roundToCents(value: number): number` → `Math.round(value)` (since values are already in cents).

**Rationale:** Over a 480-month simulation, per-month rounding errors can accumulate to tens of dollars if done naively. By keeping full precision throughout the month's calculations and only rounding the final recorded values, the maximum per-month rounding error is ±0.5 cents per field, and accumulated drift over 480 months is bounded at ~$2.40 — negligible for a retirement forecasting tool.

**Dates and time:** All date references within the retirement timeline use a **1-based month index** (month 1 = first month of retirement). Calendar dates are derived from the retirement start date (#4c). There is no timezone concern — the simulation operates on month boundaries, not precise timestamps.

---

## 6. Client Architecture

### 6.1 Component Hierarchy

```
App
├── CommandBar
│   ├── ModeToggle (#1)
│   ├── SimulationModeSelector (#2)
│   ├── HistoricalEraSelector (#11a) [visible: MC mode]
│   ├── RunSimulationButton (#3)
│   ├── UndoButton (#62)
│   ├── RedoButton (#63)
│   ├── SaveSnapshotButton (#64)
│   ├── LoadSnapshotButton (#65)
│   ├── ClearActualsButton (#61) [visible: Tracking + has actuals]
│   └── ActualsWatermark (#60) [visible: Tracking]
│
├── Sidebar (scrollable input panel)
│   ├── CollapsibleSection: "Core Parameters"
│   │   ├── StartingAge (#4)
│   │   ├── WithdrawalsStartAt (#4b)
│   │   ├── RetirementStartDate (#4c)
│   │   ├── RetirementDuration (#5)
│   │   └── InflationRate (#6)
│   │
│   ├── CollapsibleSection: "Starting Portfolio"
│   │   ├── StocksInput (#7)
│   │   ├── BondsInput (#8)
│   │   ├── CashInput (#9)
│   │   └── TotalPortfolioDisplay (#10) [donut + summary]
│   │
│   ├── CollapsibleSection: "Return Assumptions" [visible: Manual mode]
│   │   ├── StocksReturn (#11) + StocksStdDev (#12)
│   │   ├── BondsReturn (#13) + BondsStdDev (#14)
│   │   ├── CashReturn (#15) + CashStdDev (#16)
│   │   └── HistoricalContextHelper [static text]
│   │
│   ├── CollapsibleSection: "Historical Data" [visible: MC mode]
│   │   └── HistoricalDataSummary [computed from era]
│   │
│   ├── CollapsibleSection: "Spending Phases"
│   │   ├── PhaseCard × N (#17) [1–4 cards]
│   │   ├── AddPhaseButton (#18)
│   │   └── [RemovePhaseButton (#19) is per-card]
│   │
│   ├── CollapsibleSection: "Withdrawal Strategy"
│   │   ├── StrategySelector (#20) + StrategyInfoTooltip (#22)
│   │   └── StrategyParams (#21) [dynamic per strategy]
│   │
│   ├── CollapsibleSection: "Asset Drawdown Strategy"
│   │   ├── DrawdownSelector (#23)
│   │   ├── BucketConfig (#24) [visible: Bucket]
│   │   └── RebalancingConfig (#25) [visible: Rebalancing]
│   │       ├── TargetAllocation (#25a)
│   │       ├── GlidePathToggle (#25b)
│   │       └── GlidePathEditor (#26) [visible: glide path on]
│   │           ├── WaypointList (#26a)
│   │           ├── AddWaypointButton (#26b)
│   │           ├── [RemoveWaypointButton (#26c) per row]
│   │           └── MiniPreviewChart (#26d)
│   │
│   ├── CollapsibleSection: "Additional Income"
│   │   ├── IncomeEventCard × N (#27)
│   │   ├── AddIncomeButton (#28) [split button + presets]
│   │   └── [RemoveIncomeButton (#29) per card]
│   │
│   └── CollapsibleSection: "Large Expenses"
│       ├── ExpenseEventCard × N (#30)
│       ├── AddExpenseButton (#31) [split button + presets]
│       └── [RemoveExpenseButton (#32) per card]
│
└── OutputArea
    ├── SummaryStatsBar
    │   ├── StatCard: TotalDrawdownNominal (#33)
    │   ├── StatCard: TotalDrawdownReal (#34)
    │   ├── StatCard: MedianMonthly (#35)
    │   ├── StatCard: MeanMonthly (#36)
    │   ├── StatCard: StdDeviation (#37)
    │   ├── StatCard: 25thPercentile (#38)
    │   ├── StatCard: 75thPercentile (#39)
    │   ├── StatCard: TerminalValue (#40)
    │   └── StatCard: ProbabilityOfSuccess (#41) [visible: MC mode]
    │
    ├── PortfolioChart
    │   ├── RealNominalToggle (#43)
    │   ├── AssetClassBreakdownToggle (#44)
    │   ├── Chart (#42) [line/area/bands depending on mode]
    │   │   ├── ConfidenceBands (#45) [MC mode]
    │   │   ├── TrackingOverlay (#46) [Tracking mode]
    │   │   └── ChartTooltip (#47) [hover]
    │   └── ZoomPanControls (#48) [range selector bar]
    │
    ├── DetailTable
    │   ├── TableControlsBar
    │   │   ├── MonthlyAnnualToggle (#49)
    │   │   ├── AssetClassColumnsToggle (#50)
    │   │   └── ExportCsvButton (#56)
    │   ├── StickyHeaders (#51)
    │   ├── VirtualizedRows
    │   │   ├── TableRow [standard]
    │   │   └── TableRow [editable] → EditableCell (#52) [Tracking mode]
    │   └── SortByColumn (#53) [click handlers on headers]
    │
    └── StressTestPanel (collapsible)
        ├── ScenarioCard × N (#57) [1–4]
        │   ├── ScenarioLabel (#57a)
        │   ├── ShockTypeSelector (#57b)
        │   ├── ShockParams (#57c) [dynamic per type]
        │   └── ShockTiming (#57d)
        ├── AddRemoveScenario (#58)
        └── ResultsDisplay (#59)
            ├── ComparisonBarChart
            ├── ComparisonMetricsTable
            └── TimingSensitivityChart [Manual mode only]
```

### 6.2 State Management — Zustand Store

The application uses a single Zustand store divided into logical slices. Each slice corresponds to a section of the input panel or a category of application state.

```
AppStore
├── mode: "planning" | "tracking"
├── simulationMode: "manual" | "monteCarlo"
├── selectedHistoricalEra: HistoricalEra
│
├── coreParams
│   ├── startingAge: number
│   ├── withdrawalsStartAt: number
│   ├── retirementStartDate: { month, year }
│   ├── retirementDuration: number
│   └── inflationRate: number
│
├── portfolio
│   ├── stocks: number    # integer cents
│   ├── bonds: number     # integer cents
│   └── cash: number      # integer cents
│
├── returnAssumptions
│   ├── stocks: { expectedReturn, stdDev }
│   ├── bonds: { expectedReturn, stdDev }
│   └── cash: { expectedReturn, stdDev }
│
├── spendingPhases: SpendingPhase[]
│
├── withdrawalStrategy
│   ├── type: WithdrawalStrategyType
│   └── params: StrategyParams (union type, varies by strategy)
│
├── drawdownStrategy
│   ├── type: "bucket" | "rebalancing"
│   ├── bucketOrder: AssetClass[]
│   └── rebalancing
│       ├── targetAllocation: { stocks, bonds, cash }
│       ├── glidePathEnabled: boolean
│       └── glidePath: GlidePathWaypoint[]
│
├── incomeEvents: IncomeEvent[]
├── expenseEvents: ExpenseEvent[]
├── stressScenarios: StressScenario[]
├── actuals: Map<monthIndex, ActualValues>
│
├── simulationResults
│   ├── manual: ManualSimulationResult | null
│   ├── monteCarlo: MonteCarloSimulationResult | null
│   ├── status: "idle" | "running" | "complete" | "error"
│   ├── mcStale: boolean
│   └── reforecast: ReforecastResult | null   # Tracking mode deterministic result
│
└── ui (excluded from undo/redo and snapshots)
    ├── chartDisplayMode: "nominal" | "real"
    ├── chartBreakdownEnabled: boolean
    ├── tableGranularity: "monthly" | "annual"
    ├── tableAssetColumnsEnabled: boolean
    ├── tableSort: { column, direction } | null
    ├── chartZoom: { start, end } | null
    └── reforecastStatus: "idle" | "pending" | "complete"
```

**Slice isolation.** Each slice exposes its own action creators. Components subscribe to the minimal slice they need via Zustand's selector pattern, preventing unnecessary re-renders.

**Derived state.** Computed values (total portfolio, percentage breakdowns, spending phase validation, inflation-adjusted helpers) are derived via selector functions, not stored in the store. This avoids stale data.

### 6.3 Undo/Redo System

Undo/redo is implemented as Zustand middleware that wraps the store.

**Architecture:**

```
User action → store.setState() → undoMiddleware intercepts → pushes previous state to history stack → applies new state
```

**History stack:**

- `past`: array of serialized input states (max 100 entries). Oldest entries are discarded when the stack exceeds 100.
- `future`: array of undone states. Cleared when any new action is performed after an undo.

**Scope — what is tracked:**

Every mutation to the input-related slices: `coreParams`, `portfolio`, `returnAssumptions`, `spendingPhases`, `withdrawalStrategy`, `drawdownStrategy`, `incomeEvents`, `expenseEvents`, `stressScenarios`, `actuals`, `mode`, `simulationMode`, `selectedHistoricalEra`.

**Scope — what is excluded:**

The `simulationResults` slice (results are not undoable — they are re-derived), the `ui` slice (chart zoom, table view toggles are transient display preferences), and the undo/redo stacks themselves (no meta-undo).

**Serialization.** Each history entry is a deep clone of the tracked slices. At 100 entries, this is the primary memory concern. Given the input model size (~2–5 KB serialized), 100 entries ≈ 200–500 KB — negligible.

**Batching.** Rapid-fire changes (e.g., dragging a slider) should be debounced so a single slider drag produces one undo entry, not 60. Use a 300ms debounce window: changes within the window are collapsed into a single undo entry.

### 6.4 Snapshot Serialization

**Save:**

1. Extract the tracked slices from the store (same boundary as undo/redo scope).
2. Wrap in a snapshot envelope: `{ schemaVersion: 1, name: string, savedAt: ISO string, data: { ...slices } }`.
3. Serialize to pretty-printed JSON.
4. Trigger browser download via a Blob URL and a programmatically clicked `<a>` element.

**Load:**

1. Read file via the File API.
2. Parse JSON.
3. Validate `schemaVersion`. If higher than supported, reject with error toast.
4. Validate the `data` payload against the Zod schema (imported from shared package).
5. If valid, replace all tracked slices in the store. Clear undo/redo history. Clear simulation results.
6. If invalid, show error toast. Do not modify state.

**Schema migration.** The `schemaVersion` field enables forward compatibility. When the data model changes in a future version, the load function can check the version and apply migrations (e.g., adding new fields with defaults). Version 1 establishes the baseline.

### 6.5 Simulation Result Caching

The store maintains two independent result caches:

- `simulationResults.manual`: the output of the last Manual simulation run.
- `simulationResults.monteCarlo`: the output of the last Monte Carlo simulation run.

Switching between Manual and Monte Carlo via the Simulation Mode Selector (#2) swaps which cache is displayed — it does not discard the other. This allows instant mode switching without re-running simulations.

Both caches are cleared when a snapshot is loaded (the inputs have changed, so the cached results are meaningless).

The `mcStale` flag is set to `true` when the user edits an actual in Tracking Mode while MC results exist. It is cleared when Monte Carlo is re-run.

A separate `simulationResults.reforecast` field stores the latest deterministic re-forecast result from the server (Tracking Mode). This is updated independently of the Manual/MC caches.

### 6.6 Charting Strategy

**Library: Recharts.**

Recharts is a React-native charting library built on D3 primitives. It renders as SVG by default, with a Canvas renderer available for performance-critical scenarios. It supports all chart types required by the application:

| SPECS requirement | Recharts component |
|---|---|
| Portfolio value line (#42, Manual) | `<LineChart>` + `<Line>` + `<Area>` (subtle fill) |
| Confidence bands (#45, MC) | `<AreaChart>` with layered `<Area>` components at different opacities |
| Stacked area breakdown (#44) | `<AreaChart>` + `<Area stackId="1">` per asset class |
| Tracking mode solid/dashed (#46) | Two `<Line>` components with different `strokeDasharray` props |
| Comparison bar chart (#59) | `<BarChart>` + grouped `<Bar>` components |
| Glide path preview (#26d) | `<AreaChart>` stacked, small dimensions |
| Donut chart (#10) | `<PieChart>` + `<Pie innerRadius outerRadius>` |
| Timing sensitivity (#59) | `<LineChart>` with multiple `<Line>` series |

**Animations.** Recharts has built-in animation support (`isAnimationActive`, `animationDuration`). The initial draw-on animation for the portfolio chart (#42) can be achieved with `animationBegin` and `animationDuration` props. Subsequent updates use a shorter crossfade.

**Tooltip.** Recharts provides a `<Tooltip>` component with custom content renderers. The crosshair is implemented via a `<ReferenceLine>` that tracks the mouse position using the `onMouseMove` event on the chart container.

**Zoom/Pan.** Recharts does not have built-in zoom/pan. The range selector bar (#48) is implemented as a custom component below the chart that controls the x-axis domain. When the user drags or resizes the range selector, it updates the `domain` prop on the `<XAxis>`, which Recharts handles with a smooth re-render. The "Reset Zoom" button restores the full domain.

**Performance.** For Monte Carlo confidence bands (up to 480 data points × 5 percentile series), SVG rendering is adequate. If profiling reveals jank during zoom/pan interactions, the chart can switch to Recharts' Canvas renderer. The data point count (max ~2,400 for bands across 480 months) is well within SVG performance limits on modern browsers.

### 6.7 Table Virtualization

The detail table in monthly view can have up to 480 rows (40 years × 12 months), each with up to 20+ columns in expanded view. Rendering all rows into the DOM would degrade scroll performance.

**Strategy: TanStack Virtual.**

TanStack Virtual provides row virtualization — only rows visible in the viewport (plus a small overscan buffer) are rendered. Combined with TanStack Table for column definitions, sorting, and header management, this provides the full feature set needed:

- Virtual row rendering with smooth scroll.
- Sticky header rows (column headers stay fixed).
- Column sorting via header click handlers.
- Dynamic column visibility (asset class toggle).
- Inline editable cells for Tracking mode (rendered only when visible).

The table container has a fixed height with overflow-y scroll. The horizontal sticky Period column uses `position: sticky; left: 0` with appropriate z-indexing.

---

## 7. Server Architecture

### 7.1 Fastify Application Structure

The server is a standard Fastify application with route plugins:

```typescript
// app.ts
const app = fastify({ logger: true });

app.register(cors, { origin: true });
app.register(simulationRoutes, { prefix: '/api/v1' });
app.register(reforecastRoutes, { prefix: '/api/v1' });
app.register(stressTestRoutes, { prefix: '/api/v1' });
app.register(healthRoutes, { prefix: '/api/v1' });

export default app;
```

Route handlers are thin — they validate the request, call the simulation engine, and return the result. No business logic lives in route handlers.

### 7.2 Simulation Engine Design

The simulation engine is composed of pure functions organized in a pipeline:

```
SimulationConfig → [validateConfig] → [resolveStrategy] → [runSimulation] → SimulationResult
```

**Core simulation loop (`simulator.ts`):**

```
function simulateRetirement(config: SimulationConfig, returns: MonthlyReturns[]): SinglePathResult
```

This function takes a fully resolved config and a pre-generated array of monthly returns (one per month of retirement), and executes the month-by-month simulation:

1. Initialize portfolio balances.
2. For each month:
   a. Apply market returns to each asset class.
   b. Process income events for this month.
   c. If this is the first month of a new year, calculate the annual withdrawal via the active strategy.
   d. Apply the monthly withdrawal via the drawdown strategy.
   e. Process expense events for this month.
   f. Record the end-of-month state (round to integer cents at this point).
3. Return the full monthly time series plus summary statistics.

**Annual-to-monthly withdrawal conversion (explicit rule):** The annual withdrawal is calculated by the active strategy at the first month of each simulation year, using the portfolio value at that point. The annual amount is then subject to spending phase clamping (annual min = `phase_min × 12 × (1+i)^(t-1)`, annual max = `phase_max × 12 × (1+i)^(t-1)`). The clamped annual amount is divided by 12 to produce a fixed monthly withdrawal. This monthly amount is applied identically to all 12 months within that year. There is no additional monthly-level clamping — the spending phase bounds operate at the annual level only.

**Strategy registry (`strategies/index.ts`):**

```typescript
const strategyRegistry: Record<WithdrawalStrategyType, StrategyFunction> = {
  'constant-dollar': constantDollar,
  'percent-of-portfolio': percentOfPortfolio,
  // ... all 12
};
```

Each strategy function has the signature:

```typescript
type StrategyFunction = (context: StrategyContext) => number;

interface StrategyContext {
  year: number;
  portfolioValue: number;          // in cents
  initialPortfolioValue: number;   // in cents
  previousWithdrawal: number;      // clamped, in cents
  previousYearReturn: number;      // weighted average decimal
  remainingYears: number;
  inflationRate: number;
  params: StrategyParams;
  capeRatio?: number;
}
```

The return value is the gross annual withdrawal in cents (before spending phase clamping). The core loop applies clamping after calling the strategy.

**Monte Carlo runner (`monteCarlo.ts`):**

```typescript
function runMonteCarlo(
  config: SimulationConfig,
  historicalData: HistoricalMonth[],
  era: HistoricalEra,
  numSimulations: number,
  seed?: number
): MonteCarloResult
```

This function:

1. Filters historical data to the selected era.
2. For each of the N simulations, generates a random sequence of monthly returns by sampling (with replacement) from the era's months.
3. Calls `simulateRetirement` with each sequence.
4. Aggregates the N single-path results into percentile curves, probability of success, and summary statistics.

**Random seed support.** Both Manual and Monte Carlo accept an optional seed for deterministic results. This is essential for stress testing (Section 7.5): the stress test uses the same seed as the base simulation so the only difference is the shock parameters.

### 7.3 Deterministic Reforecast Engine

The deterministic reforecast is a specialized variant of the simulation used exclusively for Tracking Mode's reactive re-forecast. It has its own dedicated route (`POST /api/v1/reforecast`) and engine module (`engine/deterministic.ts`).

**What makes it deterministic:** Instead of sampling random returns (Manual) or historical returns (Monte Carlo), the deterministic path applies a **fixed monthly return** derived from the user's Return Assumptions (#11–#16):

```
monthlyReturn[asset] = (1 + annualExpectedReturn[asset])^(1/12) - 1
```

This rate is applied identically to every projected month. There is no randomness, no sampling, no seed. Given the same config and actuals, the deterministic reforecast always produces the same result.

**How it interacts with actuals:** For months with user-entered actuals, the engine uses those values directly (locked). For months without actuals (gap-fill months in the past, and all future months), the engine applies the fixed monthly returns and computes withdrawals, income, and expenses per the config.

**What users see:** In Tracking Mode, after editing an actual, the deterministic re-forecast result is what populates the chart (dashed projection line), table (projected rows), and summary stats. This is the "working projection" — a single, reproducible path showing "if everything goes as expected from here." Clicking Run Simulation replaces this with a stochastic (Manual) or distributional (MC) result.

**Performance target:** The deterministic reforecast must complete in <50ms server-side (it's a single pass with no randomness), keeping the total round-trip (including network) under ~200ms for a responsive editing experience.

### 7.4 Historical Data Loading

At server startup:

1. Read `data/historical-returns.csv`.
2. Parse into an array of `HistoricalMonth` objects: `{ year, month, stocksReturn, bondsReturn, cashReturn, cape? }`.
3. Store in a module-level variable (effectively a singleton). This data is immutable and shared across all requests.

The CSV is expected to have columns: `year`, `month`, `stocks`, `bonds`, `cash`, and optionally `cape`. Returns are stored as decimals (e.g., `0.02` for a 2% monthly return).

Era filtering is a simple array filter by date range, performed at request time. The filtered array is passed to the Monte Carlo runner.

### 7.5 Stress Test Engine

The stress test is a thin wrapper around the simulation engine:

```typescript
function runStressTest(
  config: SimulationConfig,
  baseResult: SinglePathResult,
  scenarios: StressScenario[],
  seed: number
): StressTestResult[]
```

For each scenario, the function:

1. Clones the config.
2. Overlays the shock parameters onto the return assumptions for the affected period.
3. Runs the simulation with the same random seed (Manual) or same historical sampling (MC).
4. Returns the per-scenario results alongside the base for comparison.

### 7.6 Computation Model

**Synchronous for now.** The simulation runs synchronously within the Fastify request handler. A single Manual simulation completes in <10ms. A Monte Carlo run with 1,000 simulations over 480 months completes in 1–3 seconds on modern hardware — fast enough for a synchronous HTTP response. Stress tests with 4 scenarios multiply this by 4–5, potentially reaching 5–15 seconds for MC stress tests.

**Future: async with job IDs.** If Monte Carlo or stress test computation times grow beyond acceptable synchronous thresholds (>10 seconds), the architecture supports a migration to async processing: the API returns a job ID immediately, and the client polls (or uses Server-Sent Events) for the result. This change is isolated to the route handler and API contract — the engine itself doesn't change.

### 7.7 Error Handling and Validation

**Input validation.** Every API request is validated against a Zod schema before reaching the engine. Invalid requests receive a 400 response with a structured error body (see API.md for the error format).

**Engine errors.** The simulation engine does not throw exceptions during normal operation. Impossible states (negative portfolio values, division by zero in strategies) are handled defensively:

- Portfolio values are floored at 0 cents (never negative).
- Division by zero in PMT (when rate = 0) uses the documented fallback formula.
- Strategy functions that would produce negative withdrawals clamp to 0.
- All defensive clamps use the centralized `roundToCents` function to maintain the rounding invariant.

**Server errors.** Unexpected exceptions are caught by Fastify's error handler and returned as 500 responses with a generic error message (no stack traces in production).

---

## 8. API Design Principles

The full endpoint definitions, request/response schemas, and error contracts are specified in **API.md**. This section covers the architectural principles governing the API.

**RESTful conventions.** Endpoints use standard HTTP methods and status codes. Simulation runs are `POST` (they are computations, not resource lookups, and the request body is too large for query parameters).

**Versioned URL prefix.** All endpoints are prefixed with `/api/v1`. Future breaking changes increment the version (`/api/v2`) while maintaining backward compatibility on the old version for a deprecation period.

**Request body = complete simulation config.** Every simulation request contains the full `SimulationConfig` — the server holds no state between requests. This makes the API idempotent (same request always produces the same result, given a fixed seed) and eliminates session management.

**Response body = complete result.** The response contains the full simulation output: monthly time series, summary statistics, percentile data (MC), and probability of success (MC). The client caches this locally.

**Error format.** All error responses use a consistent JSON shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [
      {
        "field": "spendingPhases[1].minMonthlySpend",
        "message": "Must be ≤ maxMonthlySpend"
      }
    ]
  }
}
```

---

## 9. Data Flow

### 9.1 Input Change (No Server Call)

```
User edits a field
  → Component calls store action (e.g., setInflationRate(0.03))
    → Zustand undoMiddleware records previous state in history stack
      → Store updates
        → Subscribed components re-render
          → Derived values recompute (selectors)
            → Output area unchanged (shows last simulation results, may be stale)
```

No API call is made. The server is not contacted until the user clicks Run Simulation.

**Exception: Tracking Mode.** When the user edits an input field (not an actual) while in Tracking Mode, the re-forecast flow (Section 9.3) is triggered in addition to the store update.

### 9.2 Run Simulation (Planning Mode)

```
User clicks Run Simulation
  → useSimulation hook extracts SimulationConfig from store
    → Sets simulationResults.status = "running"
      → Sends POST /api/v1/simulate with full config
        → Server validates, runs engine, returns result
          → Client receives response
            → Store updates simulationResults.manual (or .monteCarlo)
              → Status → "complete"
                → SummaryStats, Chart, Table re-render with new data
```

### 9.3 Tracking Mode — Actual Edit and Input Changes (Server-Side Reforecast)

The deterministic re-forecast runs on the server. The client uses debouncing, request cancellation, and optimistic UI to maintain responsiveness.

```
User edits an actual cell (or changes an input in Tracking Mode)
  → Store updates immediately (optimistic: edited cell shows new value)
    → Undo middleware records the change
      → If MC results exist: set mcStale = true
        → UI: MC bands dim, PoS dims, Run button gets orange badge
      → Set reforecastStatus = "pending"
        → UI: projected rows show subtle loading skeleton
          → Debounce timer starts (300ms for slider drags, immediate for discrete edits)
            → On debounce fire: abort any in-flight reforecast request
              → Send POST /api/v1/reforecast with full config + actuals
                → Server runs deterministic engine (<50ms)
                  → Client receives response
                    → Store updates simulationResults.reforecast
                      → reforecastStatus = "complete"
                        → Chart, Table, SummaryStats re-render with new projection
```

**Debounce rules:**

- Slider drags and rapid keystrokes: 300ms debounce. Changes within the window are collapsed into a single API call with the latest values.
- Discrete edits (dropdown selections, toggle switches, adding/removing events): fire immediately (0ms debounce). These are single-action changes that feel sluggish with a delay.
- In both cases, any in-flight reforecast request is aborted before sending the new one (using `AbortController`).

**Optimistic UI:**

- The edited cell's value updates immediately in the store — no waiting for the server.
- Dependent cells (computed columns in the same row, all projected rows below) show a subtle loading skeleton (a faint pulse animation on the text) for the ~100–200ms until the server responds.
- If the server response fails (network error, validation error), the client can show an error toast but the edited value remains in the store — the user doesn't lose their input.

**What "deterministic" means here:** The server applies fixed expected returns (see Section 7.3) to all non-actual months. This produces a single, reproducible projection. It is not the same as a Manual simulation run (which is stochastic) or Monte Carlo (which is distributional). Users who want a stochastic or MC result must click Run Simulation.

### 9.4 Snapshot Save/Load

```
Save:
  User clicks Save Snapshot → modal → enters name → confirm
    → Extract tracked slices from store
      → Wrap in { schemaVersion, name, savedAt, data }
        → JSON.stringify (pretty-printed)
          → Create Blob → create <a> with download attribute → click → browser downloads file

Load:
  User clicks Load Snapshot → file picker → selects .json file
    → FileReader reads file as text
      → JSON.parse
        → Validate schemaVersion (reject if too new)
          → Validate data against Zod schema
            → Replace store slices → clear undo history → clear simulation results
              → If Tracking mode with actuals: trigger reforecast
              → If Planning mode: output area shows empty state until Run Simulation
```

---

## 10. Performance Targets

| Operation | Target | Measurement |
|---|---|---|
| Manual simulation (single path, 480 months) | < 50ms server-side | Time from request received to response sent |
| Monte Carlo (1,000 runs, 480 months) | < 3 seconds server-side | Same |
| Deterministic reforecast (480 months) | < 50ms server-side | Same |
| Deterministic reforecast (total round-trip) | < 200ms | Time from actual edit to projected rows updated |
| Stress test, Manual (4 scenarios) | < 200ms server-side | Same |
| Stress test, Monte Carlo (4 scenarios × 1,000 runs) | < 15 seconds server-side | Same |
| Chart render (initial draw-on) | < 100ms after data arrives | Time from data in store to pixels on screen |
| Chart zoom/pan interaction | 60fps | No visible jank during drag |
| Detail table scroll (480 rows, virtualized) | 60fps | No visible jank during scroll |
| Snapshot save | < 100ms | Time from click to download trigger |
| Snapshot load | < 200ms | Time from file read to store updated |
| Undo/redo | < 16ms (one frame) | Time from Ctrl+Z to UI update |

If Monte Carlo stress tests exceed 15 seconds, consider reducing to 500 simulations for stress scenarios (the base MC can remain at 1,000).

---

## 11. Testing Strategy

### 11.1 Testing Philosophy

Test the things that are hard to verify by looking and expensive to get wrong. The simulation engine's financial calculations are the highest-priority test target — a subtle formula error produces silently wrong retirement projections. UI layout, by contrast, is immediately visible and best verified by inspection.

### 11.2 Unit Tests — Simulation Engine (Highest Priority)

Every withdrawal strategy gets its own test file with these cases:

- **Year 1 calculation** with known inputs → verify the formula produces the expected withdrawal.
- **Multi-year sequence** (5–10 years) with predetermined returns → verify year-over-year behavior (inflation adjustment, guardrail triggers, smoothing, etc.).
- **Edge cases per strategy:** zero portfolio, final year (n=1), boundary parameter values, negative returns.
- **Spending phase clamping:** verify the clamp is applied correctly and that subsequent years use the clamped value.

Drawdown strategies (Bucket and Rebalancing) get similar treatment:

- **Bucket:** verify sequential depletion, partial fulfillment, and fallthrough when a class is exhausted.
- **Rebalancing:** verify overweight sourcing, proportional distribution, glide path interpolation, and behavior when an asset class is depleted.

The PMT helper gets standalone tests against known financial calculator outputs.

**Deterministic reforecast tests:**

- Verify that the deterministic engine uses the fixed monthly return `(1 + annualReturn)^(1/12) - 1` and produces identical results for identical inputs (no randomness).
- Verify that actuals are locked and non-actual months are computed.
- Verify that the deterministic result differs from a Manual simulation run for the same config (since Manual is stochastic).

Monte Carlo tests verify:

- **Determinism:** same seed produces the same result.
- **Statistical properties:** with enough runs, the median converges to the expected value for known-distribution inputs.
- **Probability of success:** a configuration known to always succeed (very low withdrawal) produces 100%; one known to always fail produces 0%.

**Rounding tests:**

- Verify that `roundToCents` produces the expected output for .5, .4999, .5001, negative values, and zero.
- Verify that a 480-month simulation with known inputs produces results that match a hand-calculated fixture (verifying no accumulated drift).

### 11.3 Unit Tests — Client State (Medium Priority)

- **Undo/redo middleware:** verify that state changes are captured, undo restores previous state, redo re-applies, new actions clear the redo stack, and history is capped at 100.
- **Snapshot serialization:** verify round-trip (serialize → deserialize produces identical state), schema version validation, and rejection of invalid data.
- **Derived selectors:** verify computed values (total portfolio, percentage breakdowns, phase validation) update correctly when inputs change.
- **Reforecast debounce logic:** verify that rapid changes collapse into a single API call, and that in-flight requests are aborted.

### 11.4 Integration Tests — API Endpoints (Medium Priority)

Use Fastify's built-in `inject()` method (no actual HTTP server needed):

- **Valid requests** return 200 with correctly shaped responses.
- **Invalid requests** (missing fields, out-of-range values, phase gaps) return 400 with structured error bodies.
- **Each simulation mode** (Manual Planning, MC Planning, deterministic reforecast, Manual Tracking, MC Tracking) returns the expected result shape.
- **Reforecast endpoint** returns results within the 50ms performance target for a standard configuration.

### 11.5 Component Tests (Lower Priority)

Selective component tests for complex interactive behaviors:

- **Editable cell:** verify edit → blur → value update → dot indicator cycle.
- **Spending phase cascade:** verify adding/removing phases maintains contiguous year coverage.
- **Strategy parameter swap:** verify the correct parameter panel renders when the strategy selector changes.

Simple display components (StatCard, CollapsibleSection, etc.) do not need tests — they are best verified visually.

### 11.6 End-to-End Tests (Optional)

A small E2E suite (Playwright or Cypress) covering the two critical user flows:

1. **Planning flow:** Set inputs → Run Manual simulation → Verify chart and stats render → Switch to MC → Run → Verify bands and PoS render.
2. **Tracking flow:** Switch to Tracking → Enter actuals → Verify re-forecast renders → Run MC → Verify bands from actuals forward.

These are high-value smoke tests, not comprehensive coverage. They guard against integration breakage between client and server.

### 11.7 What Not to Test

- Static layout and styling (verify by inspection).
- Tailwind class application (Tailwind is well-tested; the risk is authoring, not rendering).
- Third-party library internals (Recharts rendering, Zustand middleware mechanics).
- Animation timing and easing (visual-only, no correctness concern).

### 11.8 Test File Locations

Tests live alongside or mirror the source structure:

- Server engine tests: `packages/server/tests/engine/strategies/constantDollar.test.ts`
- Server route tests: `packages/server/tests/routes/simulation.test.ts`
- Client store tests: `packages/client/tests/store/undoMiddleware.test.ts`
- Client component tests: `packages/client/tests/components/inputs/SpendingPhases.test.tsx`

### 11.9 Test Runner

**Vitest** for all packages. Configuration per-package with a shared base config. Run with `npm test` at the root (executes tests in all packages) or `npm test -w packages/server` for a specific package.

---

## 12. Security and Validation

### 12.1 Input Validation

Validation occurs at two levels:

**Client-side (Zustand store actions).** Input values are clamped or rejected per the ranges defined in SPECS.md. This provides immediate user feedback (amber flash, red borders) without a server round-trip. Client-side validation is a UX convenience, not a security boundary.

**Server-side (Zod schemas in Fastify).** Every API request body is validated against a Zod schema before reaching the simulation engine. This is the authoritative validation — the server never trusts client-provided data. Out-of-range values, missing fields, invalid enum values, and structural violations (e.g., spending phases with gaps) are caught here and returned as 400 errors.

The Zod schemas are defined in `shared/contracts/` so that client and server import the same validation logic. The client may choose to pre-validate before sending a request (to show inline errors without a round-trip), but the server always re-validates.

### 12.2 API Input Sanitization

- String inputs (phase names, event names, scenario labels) are truncated to their maximum length and stripped of control characters.
- Numeric inputs are type-checked and range-checked by Zod.
- Array lengths are bounded (e.g., spending phases max 4, stress scenarios max 4, glide path waypoints max 10).
- No SQL injection surface (no database). No template injection surface (no server-side rendering of user strings).

### 12.3 Authentication and Authorization

None. The server is a stateless computation service with no user data. There is nothing to protect with authentication. If persistence is added in the future, authentication becomes necessary and would be implemented as Fastify middleware.

### 12.4 Snapshot File Validation

Snapshots are JSON files loaded from the user's local file system. The client treats them as untrusted input:

- Parse with `JSON.parse` inside a try-catch (malformed JSON is caught).
- Validate `schemaVersion` against the current version.
- Validate the `data` payload against the full Zod schema.
- Any validation failure results in an error toast and no state change.

A malicious snapshot file could contain extreme values (e.g., $99,999,999 portfolio, 100-year retirement). These are within the defined valid ranges and would simply produce a legitimate (if unusual) simulation. There is no privilege escalation or data exfiltration risk.

### 12.5 CORS

The Fastify server configures CORS to allow requests from the client's origin. In development, this is permissive (`origin: true`). In production, it should be restricted to the deployed client domain.