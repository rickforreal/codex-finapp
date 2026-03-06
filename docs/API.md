# API.md — FinApp Compute API (Current)

This document describes the currently implemented backend API.

The API is stateless for user data: clients send full configuration and optional override payloads on each compute request.

Note: CSV export is not part of the current release scope and there is no CSV export endpoint.

Multi-slot compare uses existing endpoints (`/simulate` and `/stress-test`) with client-side slot orchestration. No dedicated compare endpoint is required.

Bookmark persistence is client-only (`localStorage`) in the current release. There are no bookmark create/list/load/delete API endpoints.

## Base URL

- All routes are served under `/api/v1`.

## Content Type

- Request and response bodies use `application/json`.

## Error Shape

All non-2xx route errors use:

```ts
{
  code: "VALIDATION_ERROR" | "COMPUTE_ERROR";
  message: string;
  fieldErrors?: Array<{ path: string; issue: string }>;
}
```

## Endpoints

### GET `/api/v1/health`

Response:

```ts
{ status: "ok" }
```

### POST `/api/v1/simulate`

Runs Manual or Monte Carlo based on `config.simulationMode`.

`config.withdrawalStrategy` supports all strategy variants in `SimulationConfig`, including `dynamicSwrAdaptive` with:

```ts
{
  type: "dynamicSwrAdaptive";
  params: {
    fallbackExpectedRateOfReturn: number;
    lookbackMonths: number;
    smoothingEnabled: boolean;
    smoothingBlend: number; // prior-withdrawal weight in [0, 0.95]
  };
}
```

Request:

```ts
{
  config: SimulationConfig;
  monthlyReturns?: MonthlyReturns[];          // optional path override (used by some tracking/stress flows)
  actualOverridesByMonth?: ActualOverridesByMonth;
  seed?: number;
}
```

`config.spendingPhases` accepts `0..4` phase entries. When empty, spending-phase min/max clamping is disabled and withdrawals follow strategy output.

`config.selectedHistoricalEra` supports preset eras plus `custom`. When `custom` is selected, `config.customHistoricalRange` is required and must provide inclusive month-year bounds:

```ts
{
  start: { month: number; year: number };
  end: { month: number; year: number };
}
```

`config.blockBootstrapEnabled` (boolean) and `config.blockBootstrapLength` (int, 3..36) control Monte Carlo return sampling. When enabled, the MC engine samples contiguous blocks of `blockBootstrapLength` months (with circular wrap) instead of independent draws. Defaults: `false`, `12`.

Response:

```ts
{
  simulationMode: SimulationMode;
  seedUsed?: number;
  configSnapshot?: SimulationConfig;          // full run config snapshot for compare/analysis surfaces
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;              // present for Monte Carlo mode
}
```

`MonteCarloResult` includes:

```ts
{
  simulationCount: number;
  successCount: number;
  probabilityOfSuccess: number;
  terminalValues: number[];
  withdrawalStatsReal?: {
    medianMonthly: number;
    meanMonthly: number;
    stdDevMonthly: number;
    p25Monthly: number;
    p75Monthly: number;
  };
  percentileCurves: {
    total: MonteCarloPercentileCurves;
    stocks: MonteCarloPercentileCurves;
    bonds: MonteCarloPercentileCurves;
    cash: MonteCarloPercentileCurves;
  };
  historicalSummary: HistoricalDataSummary;
}
```

### GET `/api/v1/historical/summary`

Returns annualized/summary statistics for the selected historical range.

Preset-era query:

```text
/api/v1/historical/summary?era=<HistoricalEra>
```

Custom-range query:

```text
/api/v1/historical/summary?era=custom&startMonth=<1..12>&startYear=<yyyy>&endMonth=<1..12>&endYear=<yyyy>
```

Response:

```ts
{
  summary: HistoricalDataSummary;
}
```

### GET `/api/v1/themes`

Returns built-in server-authored theme definitions plus catalog metadata and validation warnings.

Response:

```ts
{
  tokenModelVersion: "2";
  defaultSelection: {
    familyId: ThemeFamilyId;
    appearance: ThemeAppearance;
  };
  variants: ThemeDefinition[];       // new canonical list
  families: ThemeFamilyCatalogItem[]; // new canonical grouped catalog

  // Legacy compatibility aliases (temporary):
  defaultThemeId: ThemeId;
  themes: ThemeDefinition[];
  catalog: ThemeCatalogItem[];

  slotCatalog: ThemeSlotCatalogItem[];
  validationIssues: Array<{
    themeId: ThemeVariantId;
    tokenPath: string;
    severity: "warning";
    message: string;
  }>;
}
```

Theme contract note (v2):
- `tokenModelVersion` is currently fixed to `"2"`.
- `ThemeDefinition` now identifies concrete variants:
  - `id: ThemeVariantId`
  - `familyId: ThemeFamilyId`
  - `appearance: ThemeAppearance`
- `families` defines grouped selectable entries and supported appearances.
- `ThemeDefinition` now includes inheritance maps:
  - `semantic: Record<string, ThemeTokenRefOrValue>`
  - `slots: Record<string, ThemeTokenRefOrValue>`
  - `overrides?: Record<string, ThemeTokenRefOrValue>`
- `slotCatalog` provides canonical slot paths plus server fallback refs for deterministic client resolution.
- `ThemeDefinition.tokens.chart` includes:
  - base chart tokens (`manualLine`, `manualAreaTop`, `manualAreaBottom`, `mcMedianLine`, `mcBandOuter`, `mcBandInner`)
  - compare slot color tokens (`compareSlotA` .. `compareSlotH`) used to keep compare chips/tabs/chart line colors aligned per slot ID.

### POST `/api/v1/reforecast`

Deterministic reforecast endpoint for Tracking workflows.

Request:

```ts
{
  config: SimulationConfig;
  actualOverridesByMonth: ActualOverridesByMonth;
}
```

Response:

```ts
{
  result: SinglePathResult;
  lastEditedMonthIndex: number | null;
}
```

### POST `/api/v1/stress-test`

Runs stress scenarios against current config and optional base context.

Request:

```ts
{
  config: SimulationConfig;
  scenarios: StressScenario[];                // 1..4
  monthlyReturns?: MonthlyReturns[];          // optional manual-path alignment input
  base?: {
    result: SinglePathResult;
    monteCarlo?: MonteCarloResult;
  };
  actualOverridesByMonth?: ActualOverridesByMonth;
  seed?: number;
}
```

Response:

```ts
{
  result: StressTestResult;
}
```

## Source of Truth

Request/response contract source of truth is:

- `packages/shared/src/contracts/api.ts`
- `packages/shared/src/contracts/schemas.ts`

## Compare Orchestration (v2.0)

No new backend API route is required.

Client behavior:
1. Multi-slot run calls `POST /simulate` once per active slot (`A`..`H`, 1..8 slots; compare-active when >1).
2. Compare stress run calls `POST /stress-test` once per active slot using shared scenario definitions.
3. Calls are executed with bounded parallelism (queue-based concurrency), not unbounded fan-out.
4. Partial failures are surfaced per slot while preserving successful slot results.
5. Compare run parity rule: all slot requests are supplied shared stochastic inputs (shared monthly returns in Manual, shared seed/sampling stream in Monte Carlo) so differences reflect configuration, not randomness.
