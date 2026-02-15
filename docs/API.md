# API.md — FinApp Compute API (Current)

This document describes the currently implemented backend API.

The API is stateless for user data: clients send full configuration and optional override payloads on each compute request.

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
