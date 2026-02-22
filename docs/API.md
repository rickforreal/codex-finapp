# API.md — FinApp Compute API (Current)

This document describes the currently implemented backend API.

The API is stateless for user data: clients send full configuration and optional override payloads on each compute request.

Note: CSV export is not part of the current release scope and there is no CSV export endpoint.

Compare mode uses existing endpoints (`/simulate` and `/stress-test`) with client-side multi-slot orchestration. No dedicated compare endpoint is required.

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

Response:

```ts
{
  simulationMode: SimulationMode;
  seedUsed?: number;
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;              // present for Monte Carlo mode
}
```

### GET `/api/v1/historical/summary?era=<HistoricalEra>`

Returns annualized/summary statistics for the selected historical era.

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
  defaultThemeId: ThemeId;
  themes: ThemeDefinition[];
  catalog: ThemeCatalogItem[];
  validationIssues: Array<{
    themeId: ThemeId;
    tokenPath: string;
    severity: "warning";
    message: string;
  }>;
}
```

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
1. Compare run calls `POST /simulate` once per active slot (`A`..`H`, 2..8 slots).
2. Compare stress run calls `POST /stress-test` once per active slot using shared scenario definitions.
3. Calls are executed with bounded parallelism (queue-based concurrency), not unbounded fan-out.
4. Partial failures are surfaced per slot while preserving successful slot results.
5. Compare run parity rule: all slot requests are supplied shared stochastic inputs (shared monthly returns in Manual, shared seed/sampling stream in Monte Carlo) so differences reflect configuration, not randomness.
