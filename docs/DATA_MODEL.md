# Data Model — Retirement Forecasting App

This document defines the **canonical data model** for the app: scenario state, tracking ledger actuals, simulation inputs/outputs, and the portable scenario export format. It is the single source of truth for data shapes used across the monorepo.

**Related:**
- `API.md` — Web API request/response definitions (uses these types)
- `ARCHITECTURE.md` — system design and execution semantics
- `SPECS.md` — UX affordances and UI behaviors

---

## 1. Core Modeling Decisions

### 1.1 Canonical Time Representation

**Canonical month key:** `YYYY-MM` (e.g., `"2027-03"`)

- All persisted data (scenario config events, tracking ledger, results) uses `MonthKey = YYYY-MM`.
- The engine derives an internal `monthIndex` (`0..N-1`) from `startMonth` + `MonthKey` as needed.
- This avoids ambiguity across clients (web/mobile) and keeps exports stable.

**Constraints:**
- `startMonth` is required and is a `MonthKey`.
- Horizon is represented as `durationMonths` (integer).

### 1.2 Money Representation

**Money is stored as integer whole dollars**: `Money = number` (integer).

**Rationale:** simplicity and human readability for retirement planning.

### 1.3 Rounding Policy (Mandatory)

Engine computations may use floating-point internally, but persisted / serialized outputs must follow a strict policy:

- **Rounding function:** `roundHalfAwayFromZero(x)` to whole dollars.
- **Rounding points:**
  1. After applying **monthly returns** to each asset class (end-of-month).
  2. After applying each **cashflow transaction** (income deposit, expense, withdrawal allocation) when it changes a balance.
  3. For any derived "real dollars" values (if stored), round after deflation.

This ensures deterministic fixtures and prevents "pennies drift" (dollar drift) across runtimes.

### 1.4 Percentages Representation

Percentages are stored as decimals:
- `Percent = number` where `0.04` means **4%**
- Annual inputs are stored as annual decimals (e.g., `0.06` for 6% annual return)

**Conversions:**
- Monthly compounding conversions are defined in the engine using:
  - `monthlyRate = (1 + annualRate)^(1/12) - 1`

### 1.5 Strategy Configuration Model

Strategies use **discriminated unions**:
- `withdrawalStrategy.kind` selects a specific `params` schema.
- `drawdownStrategy.kind` selects a specific `params` schema.

This enables:
- Strict validation (Zod)
- Stable API contracts
- Extensibility without breaking older exports

### 1.6 Tracking Ledger Semantics (Authoritative Actuals)

Tracking ledger entries are authoritative "facts":
- Start-of-month balances are reconciliation points.
- Withdrawals entered for a month are ground truth for that month.
- Actual months are never rewritten by projection runs.

Ledger entries are **sparse** (months may be absent).

### 1.7 Monte Carlo Result Semantics (Storage)

Monte Carlo results store:
- Percentile bands per month (p10/p25/p50/p75/p90)
- Probability of success (PoS)
- A representative "median-like" single-path for table display (optional but recommended)

---

## 2. Fundamental Types

### 2.1 Scalars

```typescript
export type MonthKey = string; // "YYYY-MM"
export type Money = number;    // integer dollars
export type Percent = number;  // decimals: 0.04 == 4%
export type UUID = string;
```

### 2.2 Asset Classes

v1 asset classes are fixed:

```typescript
export type AssetClass = "stocks" | "bonds" | "cash";
```

(Extensible later to include additional assets.)

---

## 3. Scenario Envelope (Portable Export / Import)

### 3.1 Scenario Export Format

Scenario exports are the canonical persisted state (local-only persistence in v1) and the payload for import/export.

```typescript
export interface ScenarioExportV1 {
  schemaVersion: 1;

  scenario: {
    id: UUID;
    name: string;
    createdAt: string; // ISO datetime
    updatedAt: string; // ISO datetime
    engineVersion: string; // e.g., "engine@0.1.0"
    appVersion?: string;   // e.g., "web@0.1.0"
  };

  config: SimulationConfigV1;

  tracking: TrackingLedgerV1;

  // Optional cached results (can be omitted on export if desired)
  resultsCache?: ResultsCacheV1;
}
```

### Import Rules

1. Validate `schemaVersion`.
2. If older versions are supported, migrate in-memory to current and persist migrated form.

---

## 4. Simulation Configuration (Inputs)

### 4.1 Top-level Config

```typescript
export interface SimulationConfigV1 {
  calendar: {
    startMonth: MonthKey;      // required
    durationMonths: number;    // required, > 0
  };

  core: {
    startingAgeYears: number;  // e.g., 55
  };

  economics: {
    annualInflationRate: Percent; // e.g., 0.03
  };

  portfolio: {
    startingBalances: Record<AssetClass, Money>; // at startMonth
    assumptions: ReturnAssumptionsV1;
  };

  spending: SpendingPolicyV1;

  withdrawalStrategy: WithdrawalStrategyV1;
  drawdownStrategy: DrawdownStrategyV1;

  cashflows: {
    incomes: IncomeStreamV1[];
    expenses?: ExpenseEventV1[]; // optional (v1 can omit if out of scope)
  };

  // Optional: stress toggles or scenario flags (v1 may omit)
  flags?: {
    enableMonteCarlo?: boolean;
  };
}
```

### 4.2 Return Assumptions

Manual simulation uses volatility; deterministic uses expected returns only.

```typescript
export interface ReturnAssumptionsV1 {
  // Expected annual returns
  annualExpectedReturn: Record<AssetClass, Percent>;

  // Manual-only volatility (annualized). Optional for bonds/cash.
  annualVolatility?: Partial<Record<AssetClass, Percent>>;

  // Optional advisory/expense drag (annual). Applied pro-rata monthly.
  annualFeeRate?: Percent; // e.g., 0.0025
}
```

### 4.3 Spending Policy

```typescript
export interface SpendingPolicyV1 {
  // Guardrails (inflation-adjusted targets)
  monthlyMinSpend: Money;
  monthlyMaxSpend: Money;

  // Optional baseline target spend for strategies that need it
  monthlyTargetSpend?: Money;

  // Optional segmentation (future)
  needsFraction?: Percent; // 0..1
}
```

### 4.4 Withdrawal Strategies (Discriminated Unions)

```typescript
export type WithdrawalStrategyV1 =
  | { kind: "percentOfPortfolio"; params: { annualRate: Percent } }
  | { kind: "oneOverN"; params: { years: number } }
  | { kind: "dynamicSWR"; params: { baseAnnualRate: Percent; floorRate: Percent; ceilingRate: Percent } }
  | { kind: "guytonKlinger"; params: { initialAnnualRate: Percent; guardrailUp: Percent; guardrailDown: Percent } }
  | { kind: "yaleEndowment"; params: { annualRate: Percent; smoothing: Percent } }
  | { kind: "capeBased"; params: { baseAnnualRate: Percent; capeHigh: number; capeLow: number } };
```

#### Annual-to-Monthly Rule (Canonical)

Strategies compute an annual withdrawal amount at the first month of each "simulation year" and distribute it as:

```typescript
monthlyWithdrawal = roundHalfAwayFromZero(annualWithdrawal / 12)
```

Monthly min/max spend guardrails are applied each month after inflation adjustments.

(If/when you support a different rule, bump schemaVersion.)

### 4.5 Drawdown Strategies

```typescript
export type DrawdownStrategyV1 =
  | { kind: "bucket"; params: { order: AssetClass[] } } // e.g., ["bonds","stocks","cash"]
  | { kind: "proRata"; params: {} }
  | { kind: "rebalanceToTarget"; params: RebalanceToTargetParamsV1 };

export interface RebalanceToTargetParamsV1 {
  targetAllocation: Record<AssetClass, Percent>; // sums to 1
  rebalanceFrequency: "monthly" | "quarterly" | "annually";
  // Optional glide path
  glidePath?: GlidePathV1;
  // Optional drift threshold
  rebalanceDriftThreshold?: Percent; // e.g., 0.05 (5%)
}

export interface GlidePathV1 {
  // Keyframes: monthKey -> allocation
  keyframes: Array<{
    month: MonthKey;
    allocation: Record<AssetClass, Percent>;
  }>;
  interpolation: "linear"; // v1
}
```

### 4.6 Income Streams

```typescript
export interface IncomeStreamV1 {
  id: UUID;
  name: string;

  amount: Money;

  startMonth: MonthKey;
  endMonth?: MonthKey; // optional

  cadence:
    | { kind: "oneTime" }
    | { kind: "monthly" }
    | { kind: "annual"; monthOfYear: number } // 1..12
    | { kind: "custom"; everyNMonths: number };

  escalation:
    | { kind: "none" }
    | { kind: "cpiLinked" }
    | { kind: "fixedRate"; annualRate: Percent };

  depositTo: AssetClass | { kind: "cashThenRebalance" };
}
```

### 4.7 (Optional) Expense Events

```typescript
export interface ExpenseEventV1 {
  id: UUID;
  name: string;
  amount: Money;
  startMonth: MonthKey;
  durationMonths: number; // >= 1
  escalation:
    | { kind: "none" }
    | { kind: "cpiLinked" }
    | { kind: "fixedRate"; annualRate: Percent };
}
```

---

## 5. Tracking Ledger (Actuals)

### 5.1 Ledger Structure

Tracking ledger is sparse and keyed by MonthKey.

```typescript
export interface TrackingLedgerV1 {
  // Indicates months that are known to have occurred and can be edited (client-derived).
  // This is a UI constraint; the ledger itself stores what user entered.
  actualsByMonth: Record<MonthKey, TrackingMonthActualV1>;

  // Optional notes (can be in TrackingMonthActual too)
}
```

### 5.2 Per-Month Actuals (Sparse Fields)

```typescript
export interface TrackingMonthActualV1 {
  // Optional authoritative start-of-month balances (reconciliation point)
  startBalances?: Partial<Record<AssetClass, Money>>;

  // Optional authoritative withdrawals (by asset class) for that month
  withdrawals?: Partial<Record<AssetClass, Money>>;

  // Optional lock to prevent accidental edits
  locked?: boolean;

  // Optional user note
  note?: string;
}
```

### Rules

- A month may include only `startBalances`, only `withdrawals`, or both.
- Missing fields mean "engine should use computed values for that part."
- Locked months are still readable; edits require unlocking.

---

## 6. Results Data Model (Outputs)

### 6.1 Common Monthly Row

All single-path results share a month-row structure.

```typescript
export interface MonthRowV1 {
  month: MonthKey;

  // Start-of-month balances
  startBalances: Record<AssetClass, Money>;

  // Market movement for the month
  movement: {
    nominalChange: Money;
    percentChange: Percent; // e.g., 0.012 for +1.2%
  };

  // Income and expenses applied during the month (nominal)
  cashflows: {
    incomeTotal: Money;
    expenseTotal: Money;
    incomeById?: Record<UUID, Money>;
    expenseById?: Record<UUID, Money>;
  };

  // Withdrawals applied during the month
  withdrawals: {
    byAsset: Record<AssetClass, Money>;
    nominalTotal: Money;
    realTotal: Money; // deflated to startMonth dollars
  };

  // End-of-month balances
  endBalances: Record<AssetClass, Money>;
}
```

### 6.2 Summary Metrics

```typescript
export interface SummaryStatsV1 {
  endOfHorizon: {
    nominalEndBalance: Money;
    realEndBalance: Money;
  };

  withdrawals: {
    totalNominal: Money;
    totalReal: Money;

    meanMonthlyNominal: Money;
    medianMonthlyNominal: Money;
    stdDevMonthlyNominal: Money;

    p25MonthlyNominal: Money;
    p75MonthlyNominal: Money;

    // Same for real if desired (optional in v1)
  };

  drawdown?: {
    maxDrawdownPercent: Percent;
    maxDrawdownNominal: Money;
  };
}
```

### 6.3 Deterministic Forecast Result

```typescript
export interface DeterministicForecastResultV1 {
  kind: "deterministic";
  requestHash: string;      // hash(config + trackingBoundary + mode)
  generatedAt: string;      // ISO datetime
  rows: MonthRowV1[];
  summary: SummaryStatsV1;
}
```

### 6.4 Manual Simulation Result (Single Stochastic Path)

```typescript
export interface ManualSimulationResultV1 {
  kind: "manual";
  requestHash: string;
  generatedAt: string;

  seed: number;             // for reproducibility
  rows: MonthRowV1[];
  summary: SummaryStatsV1;
}
```

### 6.5 Monte Carlo Result (Distribution + Representative Path)

```typescript
export interface MonteCarloResultV1 {
  kind: "monteCarlo";
  requestHash: string;
  generatedAt: string;

  runs: number;
  era: "1926-1949" | "1950-1974" | "1975-1999" | "2000-2023" | "all"; // example

  probabilityOfSuccess: Percent; // 0..1

  // Percentile bands for portfolio total value (nominal and/or real)
  bands: {
    month: MonthKey;
    totalNominal: PercentileBandV1;
    totalReal?: PercentileBandV1;
  }[];

  // Optional representative path for table display
  representative?: {
    selection: "medianLike";
    seed: number;
    rows: MonthRowV1[];
    summary: SummaryStatsV1;
  };
}

export interface PercentileBandV1 {
  p10: Money;
  p25: Money;
  p50: Money;
  p75: Money;
  p90: Money;
}
```

---

## 7. Results Cache (Client-Side Only)

v1 may persist cached results locally to reduce re-compute, but results are always reproducible from config + ledger.

```typescript
export interface ResultsCacheV1 {
  deterministic?: DeterministicForecastResultV1;
  manual?: ManualSimulationResultV1;
  monteCarlo?: MonteCarloResultV1;

  // Indicates cached MC no longer matches current scenario inputs
  monteCarloStale?: boolean;
}
```

### Stale Rules (Canonical)

`monteCarloStale = true` if any of these change since `monteCarlo.requestHash`:

- Withdrawal strategy kind/params
- Drawdown strategy kind/params
- Return assumptions or historical era
- Spending min/max/target or inflation
- Tracking ledger entries at or before boundary month

---

## 8. Constraints & Validation (Centralized)

Constraints should be defined once (e.g., in `packages/contracts/constraints.ts`) and referenced by:

- Zod schemas
- UI defaults/help text
- Docs

### Examples

- `durationMonths > 0` and `<= 1200` (100 years)
- `annualInflationRate` in `[-0.02, 0.15]` (example bounds)
- Allocations sum to 1 within epsilon `1e-6`
- All Money fields are integers and `>= 0` unless explicitly allowed (e.g., movement deltas)

---

## 9. Example Scenario Export (V1)

```json
{
  "schemaVersion": 1,
  "scenario": {
    "id": "c2c3b1f2-3a6a-4b31-a8e2-6b7fce7c3a4a",
    "name": "Base Plan",
    "createdAt": "2026-02-13T08:00:00.000Z",
    "updatedAt": "2026-02-13T08:10:00.000Z",
    "engineVersion": "engine@0.1.0",
    "appVersion": "web@0.1.0"
  },
  "config": {
    "calendar": { "startMonth": "2027-01", "durationMonths": 480 },
    "core": { "startingAgeYears": 55 },
    "economics": { "annualInflationRate": 0.03 },
    "portfolio": {
      "startingBalances": { "stocks": 1000000, "bonds": 250000, "cash": 100000 },
      "assumptions": {
        "annualExpectedReturn": { "stocks": 0.07, "bonds": 0.03, "cash": 0.01 },
        "annualVolatility": { "stocks": 0.18, "bonds": 0.06, "cash": 0.01 },
        "annualFeeRate": 0.0025
      }
    },
    "spending": { "monthlyMinSpend": 6000, "monthlyMaxSpend": 14000 },
    "withdrawalStrategy": { 
      "kind": "guytonKlinger", 
      "params": { 
        "initialAnnualRate": 0.04, 
        "guardrailUp": 0.2, 
        "guardrailDown": 0.2 
      } 
    },
    "drawdownStrategy": {
      "kind": "rebalanceToTarget",
      "params": {
        "targetAllocation": { "stocks": 0.8, "bonds": 0.2, "cash": 0.0 },
        "rebalanceFrequency": "annually",
        "rebalanceDriftThreshold": 0.05
      }
    },
    "cashflows": {
      "incomes": [
        {
          "id": "3f6e6b7e-6a4f-4ef4-9e80-8e00d3b69a8f",
          "name": "Social Security",
          "amount": 3000,
          "startMonth": "2034-01",
          "cadence": { "kind": "monthly" },
          "escalation": { "kind": "cpiLinked" },
          "depositTo": "cash"
        }
      ]
    }
  },
  "tracking": {
    "actualsByMonth": {
      "2027-03": {
        "startBalances": { "stocks": 990000, "bonds": 252000, "cash": 98000 },
        "withdrawals": { "cash": 6000 },
        "locked": true,
        "note": "Vacation month"
      }
    }
  }
}
```

---

## 10. Versioning Policy

- Any breaking changes to exported shapes require `schemaVersion++`.
- Backward-compatible additions (new optional fields) keep the same version.
- Engine version is included for debugging and fixture stability, not for migration.
