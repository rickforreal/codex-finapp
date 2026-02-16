# Data Model — FinApp (Current)

This document defines the current canonical data model used by the app.

Source of truth for exact TypeScript contracts:
- `packages/shared/src/domain/simulation.ts`
- `packages/shared/src/contracts/api.ts`
- `packages/shared/src/contracts/schemas.ts`

## 1. Core Decisions

### 1.1 Time Model
- The simulation uses integer `monthIndex` values in result rows (`1..N`) and `year`/`monthInYear` fields.
- Configuration uses retirement start date (`month`, `year`) plus `retirementDuration` in years.
- Tracking overrides are keyed by month index in `ActualOverridesByMonth`.

### 1.2 Money Model
- Money values are stored as integer dollars across inputs, overrides, and outputs.
- Type alias in shared domain is `MoneyCents = number` (legacy name), but values are whole-dollar integers.

### 1.3 Percentage Model
- Rates are decimal fractions (`0.08` = 8%).
- Validation ranges are enforced by Zod schemas in `contracts/schemas.ts`.

## 2. Enums

```ts
AssetClass = "stocks" | "bonds" | "cash"
WithdrawalStrategyType =
  "constantDollar" | "percentOfPortfolio" | "oneOverN" | "vpw" |
  "dynamicSwr" | "sensibleWithdrawals" | "ninetyFivePercent" |
  "guytonKlinger" | "vanguardDynamic" | "endowment" |
  "hebelerAutopilot" | "capeBased"
DrawdownStrategyType = "bucket" | "rebalancing"
SimulationMode = "manual" | "monteCarlo"
AppMode = "planning" | "tracking"
HistoricalEra =
  "fullHistory" | "depressionEra" | "postWarBoom" | "stagflationEra" |
  "oilCrisis" | "post1980BullRun" | "lostDecade" | "postGfcRecovery"
```

## 3. SimulationConfig

```ts
SimulationConfig {
  mode: AppMode;
  simulationMode: SimulationMode;
  selectedHistoricalEra: HistoricalEra;
  coreParams: {
    startingAge: number;
    withdrawalsStartAt: number;
    retirementStartDate: { month: number; year: number };
    retirementDuration: number; // years
    inflationRate: number;
  };
  portfolio: { stocks: number; bonds: number; cash: number };
  returnAssumptions: {
    stocks: { expectedReturn: number; stdDev: number };
    bonds: { expectedReturn: number; stdDev: number };
    cash: { expectedReturn: number; stdDev: number };
  };
  spendingPhases: SpendingPhase[];
  withdrawalStrategy: WithdrawalStrategyConfig;
  drawdownStrategy: DrawdownStrategy;
  incomeEvents: IncomeEvent[];
  expenseEvents: ExpenseEvent[];
}
```

### 3.1 Spending Phases

```ts
SpendingPhase {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  minMonthlySpend: number;
  maxMonthlySpend: number;
}
```

### 3.2 Withdrawal Strategy Union

```ts
WithdrawalStrategyConfig =
  | { type: "constantDollar"; params: { initialWithdrawalRate: number } }
  | { type: "percentOfPortfolio"; params: { annualWithdrawalRate: number } }
  | { type: "oneOverN"; params: {} }
  | { type: "vpw"; params: { expectedRealReturn: number; drawdownTarget: number } }
  | { type: "dynamicSwr"; params: { expectedRateOfReturn: number } }
  | {
      type: "dynamicSwrAdaptive";
      params: {
        fallbackExpectedRateOfReturn: number;
        lookbackMonths: number;
      };
    }
  | { type: "sensibleWithdrawals"; params: { baseWithdrawalRate: number; extrasWithdrawalRate: number } }
  | { type: "ninetyFivePercent"; params: { annualWithdrawalRate: number; minimumFloor: number } }
  | {
      type: "guytonKlinger";
      params: {
        initialWithdrawalRate: number;
        capitalPreservationTrigger: number;
        capitalPreservationCut: number;
        prosperityTrigger: number;
        prosperityRaise: number;
        guardrailsSunset: number;
      };
    }
  | { type: "vanguardDynamic"; params: { annualWithdrawalRate: number; ceiling: number; floor: number } }
  | { type: "endowment"; params: { spendingRate: number; smoothingWeight: number } }
  | {
      type: "hebelerAutopilot";
      params: { initialWithdrawalRate: number; pmtExpectedReturn: number; priorYearWeight: number };
    }
  | { type: "capeBased"; params: { baseWithdrawalRate: number; capeWeight: number; startingCape: number } };
```

### 3.3 Drawdown Strategy Union

```ts
DrawdownStrategy =
  | { type: "bucket"; bucketOrder: AssetClass[] }
  | {
      type: "rebalancing";
      rebalancing: {
        targetAllocation: { stocks: number; bonds: number; cash: number };
        glidePathEnabled: boolean;
        glidePath: Array<{
          year: number;
          allocation: { stocks: number; bonds: number; cash: number };
        }>;
      };
    };
```

### 3.4 Income/Expense Events

```ts
IncomeEvent {
  id: string;
  name: string;
  amount: number;
  depositTo: AssetClass;
  start: { month: number; year: number };
  end: { month: number; year: number } | "endOfRetirement";
  frequency: "monthly" | "quarterly" | "annual" | "oneTime";
  inflationAdjusted: boolean;
}

ExpenseEvent {
  id: string;
  name: string;
  amount: number;
  sourceFrom: AssetClass | "follow-drawdown";
  start: { month: number; year: number };
  end: { month: number; year: number } | "endOfRetirement";
  frequency: "monthly" | "annual" | "oneTime";
  inflationAdjusted: boolean;
}
```

## 4. Tracking Overrides Model

Tracking edits are sparse and month-index keyed:

```ts
ActualMonthOverride {
  startBalances?: { stocks?: number; bonds?: number; cash?: number };
  withdrawalsByAsset?: { stocks?: number; bonds?: number; cash?: number };
  incomeTotal?: number;
  expenseTotal?: number;
}

ActualOverridesByMonth = Record<number, ActualMonthOverride>
```

## 5. Simulation Outputs

### 5.1 Single Path

```ts
MonthlySimulationRow {
  monthIndex: number;
  year: number;
  monthInYear: number;
  startBalances: { stocks: number; bonds: number; cash: number };
  marketChange: { stocks: number; bonds: number; cash: number };
  withdrawals: {
    byAsset: { stocks: number; bonds: number; cash: number };
    requested: number;
    actual: number;
    shortfall: number;
  };
  incomeTotal: number;
  expenseTotal: number;
  endBalances: { stocks: number; bonds: number; cash: number };
}

SinglePathResult {
  rows: MonthlySimulationRow[];
  summary: {
    totalWithdrawn: number;
    totalShortfall: number;
    terminalPortfolioValue: number;
  };
}
```

### 5.2 Historical Summary

```ts
HistoricalDataSummary {
  selectedEra: { key: HistoricalEra; label: string; startYear: number; endYear: number };
  eras: Array<{ key: HistoricalEra; label: string; startYear: number; endYear: number }>;
  byAsset: {
    stocks: { meanReturn: number; stdDev: number; sampleSizeMonths: number };
    bonds: { meanReturn: number; stdDev: number; sampleSizeMonths: number };
    cash: { meanReturn: number; stdDev: number; sampleSizeMonths: number };
  };
}
```

### 5.3 Monte Carlo

```ts
MonteCarloResult {
  simulationCount: number;
  successCount: number;
  probabilityOfSuccess: number;
  terminalValues: number[];
  percentileCurves: {
    total: { p05: number[]; p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[]; p95: number[] };
    stocks: { p05: number[]; p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[]; p95: number[] };
    bonds: { p05: number[]; p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[]; p95: number[] };
    cash: { p05: number[]; p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[]; p95: number[] };
  };
  historicalSummary: HistoricalDataSummary;
}
```

## 6. Stress Testing Model

### 6.1 Stress Scenario Union

```ts
StressScenario =
  | { id: string; label: string; startYear: number; type: "stockCrash"; params: { dropPct: number } }
  | { id: string; label: string; startYear: number; type: "bondCrash"; params: { dropPct: number } }
  | {
      id: string;
      label: string;
      startYear: number;
      type: "broadMarketCrash";
      params: { stockDropPct: number; bondDropPct: number };
    }
  | {
      id: string;
      label: string;
      startYear: number;
      type: "prolongedBear";
      params: { durationYears: number; stockAnnualReturn: number; bondAnnualReturn: number };
    }
  | {
      id: string;
      label: string;
      startYear: number;
      type: "highInflationSpike";
      params: { durationYears: number; inflationRate: number };
    }
  | {
      id: string;
      label: string;
      startYear: number;
      type: "custom";
      params: {
        years: Array<{
          yearOffset: number;
          stocksAnnualReturn: number;
          bondsAnnualReturn: number;
          cashAnnualReturn: number;
        }>;
      };
    };
```

### 6.2 Stress Result

```ts
StressComparisonMetrics {
  terminalValue: number;
  terminalDeltaVsBase: number;
  totalDrawdownReal: number;
  drawdownDeltaVsBase: number;
  depletionMonth: number | null;
  firstYearReducedWithdrawal: number | null;
  probabilityOfSuccess?: number;
  successDeltaPpVsBase?: number;
}

StressScenarioResult {
  scenarioId: string;
  scenarioLabel: string;
  simulationMode: SimulationMode;
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;
  metrics: StressComparisonMetrics;
}

StressTestResult {
  simulationMode: SimulationMode;
  base: {
    result: SinglePathResult;
    monteCarlo?: MonteCarloResult;
    metrics: StressComparisonMetrics;
  };
  scenarios: StressScenarioResult[];
  timingSensitivity?: Array<{
    scenarioId: string;
    scenarioLabel: string;
    points: Array<{ startYear: number; terminalPortfolioValue: number }>;
  }>;
}
```

## 7. API DTOs (Current)

```ts
SimulateRequest {
  config: SimulationConfig;
  monthlyReturns?: Array<{ stocks: number; bonds: number; cash: number }>;
  actualOverridesByMonth?: ActualOverridesByMonth;
  seed?: number;
}

SimulateResponse {
  simulationMode: SimulationMode;
  seedUsed?: number;
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;
}

HistoricalSummaryResponse {
  summary: HistoricalDataSummary;
}

ReforecastRequest {
  config: SimulationConfig;
  actualOverridesByMonth: ActualOverridesByMonth;
}

ReforecastResponse {
  result: SinglePathResult;
  lastEditedMonthIndex: number | null;
}

StressTestRequest {
  config: SimulationConfig;
  scenarios: StressScenario[];
  monthlyReturns?: Array<{ stocks: number; bonds: number; cash: number }>;
  base?: { result: SinglePathResult; monteCarlo?: MonteCarloResult };
  actualOverridesByMonth?: ActualOverridesByMonth;
  seed?: number;
}

StressTestResponse {
  result: StressTestResult;
}
```

## 8. Validation Rules (High-Level)

Validation is implemented in `packages/shared/src/contracts/schemas.ts`.

Key constraints include:
- Spending phase bounds and ordering (`endYear >= startYear`, `max >= min`).
- Rebalancing allocations sum to 1.0.
- Glide path requires at least 2 waypoints when enabled.
- Event end date must be >= start date for recurring events.
- Tracking overrides and balances are non-negative integers.
- Stress scenarios: 1..4 scenarios, start year/duration cannot exceed horizon, per-type parameter ranges enforced.

## 9. Snapshot Persistence Model

Snapshot files are client-side JSON envelopes used for session portability.

```ts
SnapshotEnvelope {
  schemaVersion: number;   // strict exact match required on load (current: 4)
  name: string;
  savedAt: string;         // ISO timestamp
  data: SnapshotState;
}

SnapshotState {
  mode: AppMode;
  trackingInitialized: boolean;
  planningWorkspace: WorkspaceSnapshot | null;
  trackingWorkspace: WorkspaceSnapshot | null;
  simulationMode: SimulationMode;
  selectedHistoricalEra: HistoricalEra;

  // Active workspace state
  coreParams: SimulationConfig["coreParams"];
  portfolio: SimulationConfig["portfolio"];
  returnAssumptions: SimulationConfig["returnAssumptions"];
  spendingPhases: SpendingPhase[];
  withdrawalStrategy: { type: WithdrawalStrategyType; params: Record<string, number> };
  drawdownStrategy: {
    type: DrawdownStrategyType;
    bucketOrder: AssetClass[];
    rebalancing: {
      targetAllocation: { stocks: number; bonds: number; cash: number };
      glidePathEnabled: boolean;
      glidePath: Array<{ year: number; allocation: { stocks: number; bonds: number; cash: number } }>;
    };
  };
  historicalData: {
    summary: HistoricalDataSummary | null;
    status: "idle" | "loading" | "ready" | "error";
    errorMessage: string | null;
  };
  incomeEvents: IncomeEvent[];
  expenseEvents: ExpenseEvent[];
  actualOverridesByMonth: ActualOverridesByMonth;
  lastEditedMonthIndex: number | null;

  // Cached outputs are persisted and restored
  simulationResults: {
    manual: SimulateResponse | null;
    monteCarlo: SimulateResponse | null;
    reforecast: SimulateResponse | null;
    status: "idle" | "running" | "complete" | "error";
    mcStale: boolean;
    errorMessage: string | null;
  };
  stress: {
    isExpanded: boolean; // default true
    scenarios: StressScenario[];
    result: StressTestResult | null;
    status: "idle" | "running" | "complete" | "error";
    errorMessage: string | null;
  };
  theme: {
    selectedThemeId: ThemeId;
    defaultThemeId: ThemeId;
    themes: ThemeDefinition[];
    catalog: ThemeCatalogItem[];
    validationIssues: ThemeValidationIssue[];
    status: "idle" | "loading" | "ready" | "error";
    errorMessage: string | null;
  };
  ui: {
    chartDisplayMode: "nominal" | "real"; // default "real"
    chartBreakdownEnabled: boolean;
    tableGranularity: "monthly" | "annual";
    tableAssetColumnsEnabled: boolean;
    tableSpreadsheetMode: boolean;
    tableSort: { column: string; direction: "asc" | "desc" } | null;
    chartZoom: { start: number; end: number } | null; // reserved, not user-exposed in current UI
    reforecastStatus: "idle" | "pending" | "complete";
    collapsedSections: Record<string, boolean>;
  };
}
```

Theme modeling (server-owned):

```ts
ThemeDefinition {
  id: ThemeId;                      // light | dark | highContrast
  name: string;
  description: string;
  version: string;
  isHighContrast: boolean;
  defaultForApp: boolean;
  tokens: {
    color: ThemeColorTokens;        // semantic UI/chart/state palette
    typography: ThemeTypographyTokens;
    spacing: ThemeSpacingTokens;
    radius: ThemeRadiusTokens;
    border: ThemeBorderTokens;
    shadow: ThemeShadowTokens;
    motion: ThemeMotionTokens;
    state: ThemeStateTokens;        // edited/preserved/stale/selection visuals
    chart: ThemeChartTokens;        // manual line/fill + MC bands/median
  };
}
```

Notes:
- Snapshot load validates envelope + payload using Zod.
- `schemaVersion` must exactly match the app-supported version.
- Invalid or incompatible files must not mutate app state.
- Cached output rows are stored in packed CSV-like form:

```ts
PackedRows {
  columns: [
    "monthIndex","year","monthInYear",
    "startStocks","startBonds","startCash",
    "moveStocks","moveBonds","moveCash",
    "wdStocks","wdBonds","wdCash",
    "wdRequested","wdActual","wdShortfall",
    "incomeTotal","expenseTotal",
    "endStocks","endBonds","endCash"
  ];
  data: number[][]; // one numeric tuple per month
}
```

- Packing is applied to all cached output payloads in snapshots:
  - `simulationResults.manual.result.rows`
  - `simulationResults.monteCarlo.result.rows`
  - `simulationResults.reforecast.result.rows`
  - `stress.result.base.result.rows`
  - `stress.result.scenarios[*].result.rows`

## 10. Notes

- `SimulationResult { status, message }` exists in shared domain for compatibility but is not the primary response model for `/api/v1` routes.
- For implementation details, always prefer the shared package source files listed at the top of this document.
