# API.md — Retirement Forecasting App (v1)

This document defines the Web API surface for the backend compute service. The API is **stateless** in v1 (no server persistence). Clients (web now; iOS/Android later) send the full scenario payload (config + tracking ledger) to compute results.

All request/response DTOs MUST align with the canonical data model in `DATA_MODEL.md` (notably: `SimulationConfigV1`, `TrackingLedgerV1`, and the `*ResultV1` shapes).

---

## 1. API Principles

- **Versioning:** All endpoints are under `/v1`.
- **Stateless:** No server-side scenario storage in v1. The server computes purely from request payload.
- **Validation:** All inputs are schema-validated (Zod + Fastify schema integration).
- **Determinism:** Deterministic forecast endpoints never use RNG.
- **Reproducibility:** Manual and Monte Carlo runs return `seed` (and/or include it in the representative path), and may accept a seed to reproduce results.
- **Request identity:** Compute responses include `requestHash` to support client caching and staleness detection (as defined in the data model).

---

## 2. Common Conventions

### 2.1 Content type

- Requests and responses use `application/json`.

### 2.2 Authentication

- None in v1.

### 2.3 Error envelope

All non-2xx responses MUST follow this shape:

```ts
export interface ApiErrorV1 {
  requestId: string; // server-generated
  code:
    | "VALIDATION_ERROR"
    | "SEMANTIC_ERROR"
    | "COMPUTE_ERROR"
    | "NOT_SUPPORTED";
  message: string;

  // Present for VALIDATION_ERROR and some SEMANTIC_ERROR cases
  fieldErrors?: Array<{
    path: string;    // e.g. "config.spending.monthlyMinSpend"
    issue: string;   // human-readable
  }>;
}
```

### 2.4 Request/response metadata

All successful compute responses include:

- `requestHash`: string
- `generatedAt`: ISO datetime

These fields are already part of the canonical result types in DATA_MODEL.md.

---

## 3. Core Request DTOs

### 3.1 Scenario payload (for compute)

v1 compute endpoints accept the scenario as:

- `config`: SimulationConfigV1
- `tracking`: TrackingLedgerV1

These are defined in DATA_MODEL.md.

```ts
export interface ScenarioComputeInputV1 {
  config: SimulationConfigV1;
  tracking: TrackingLedgerV1;
}
```

### 3.2 Mode hint

The server does not persist mode, but computation can differ depending on whether the caller wants:

- a fully clean projection (Planning), or
- a projection respecting the tracking ledger (Tracking).

```ts
export type ModeV1 = "planning" | "tracking";
```

### 3.3 Deterministic forecast request

```ts
export interface DeterministicForecastRequestV1 extends ScenarioComputeInputV1 {
  mode: ModeV1;

  // Optional hints for performance (server may ignore in v1)
  options?: {
    // If false, server may omit rows and return summary only (default true)
    includeRows?: boolean;

    // If true, include real-dollar series wherever applicable (default true)
    includeReal?: boolean;
  };
}
```

### 3.4 Manual simulation request

```ts
export interface ManualSimulationRequestV1 extends ScenarioComputeInputV1 {
  mode: ModeV1;

  options?: {
    seed?: number; // if omitted, server generates one
    includeRows?: boolean;
    includeReal?: boolean;
  };
}
```

### 3.5 Monte Carlo request

```ts
export type HistoricalEraV1 =
  | "1926-1949"
  | "1950-1974"
  | "1975-1999"
  | "2000-2023"
  | "all"; // example eras, must match engine datasets

export interface MonteCarloRequestV1 extends ScenarioComputeInputV1 {
  mode: ModeV1;

  options: {
    era: HistoricalEraV1;
    runs: number;          // e.g., 1000; server may cap
    representativePath?: boolean; // default true
    includeRealBands?: boolean;   // default optional
  };
}
```

---

## 4. Endpoints

### 4.1 Validate scenario

Validates the scenario payload without running a full simulation. May also normalize inputs (e.g., clamp minor numeric issues) if you choose to support that.

**POST** `/v1/validateScenario`

Request: ScenarioComputeInputV1

Response:

```ts
export interface ValidateScenarioResponseV1 {
  requestId: string;
  valid: boolean;
  fieldErrors?: ApiErrorV1["fieldErrors"];
}
```

**Notes**

- This endpoint is optional if you validate in each compute endpoint anyway, but it can be useful for UX (early validation before running).

### 4.2 Deterministic forecast (reactive reforecast)

The canonical endpoint for fast, deterministic projections.

**POST** `/v1/forecast/deterministic`

Request: DeterministicForecastRequestV1

Response: DeterministicForecastResultV1

**Behavior**

- Always deterministic (no RNG).
- In planning mode: runs from the configured starting portfolio with assumptions only.
- In tracking mode: respects tracking.actualsByMonth as authoritative for months present; projects the remaining future months.

### 4.3 Manual simulation (single stochastic path)

Runs a single stochastic simulation path using user-provided expected returns + volatility (as available in the config).

**POST** `/v1/simulate/manual`

Request: ManualSimulationRequestV1

Response: ManualSimulationResultV1

**Behavior**

- If seed is provided, results must be reproducible for the same engine version and dataset inputs.
- In tracking mode: months with actuals are applied first, then the stochastic path begins after the last actual boundary.

### 4.4 Monte Carlo simulation (synchronous v1)

Runs N paths using historical datasets sampled by month; returns percentile bands and PoS.

**POST** `/v1/simulate/montecarlo`

Request: MonteCarloRequestV1

Response: MonteCarloResultV1

**Behavior**

- Synchronous in v1; server may cap runs for runtime safety.
- Returns:
  - `probabilityOfSuccess`
  - `percentile bands[]`
  - optional representative path for table display
- The PoS definition and percentile semantics must match DATA_MODEL.md.

**Upgrade path**

If Monte Carlo becomes too slow, replace with async job endpoints:

- POST `/v1/jobs/montecarlo`
- GET `/v1/jobs/:id`

(Not in v1 scope.)

---

## 5. Response Types (Canonical)

The API returns the canonical result types as defined in DATA_MODEL.md:

- DeterministicForecastResultV1
- ManualSimulationResultV1
- MonteCarloResultV1

The row and summary shapes are also canonical:

- MonthRowV1
- SummaryStatsV1

(Implementation note: the server should import these from packages/contracts and return them directly.)

---

## 6. Staleness and Caching Guidance (Client-facing)

### 6.1 requestHash

The server computes requestHash as a stable hash of:

- relevant config content
- relevant tracking content (including the effective boundary)
- mode
- and for simulations: seed/era/runs where applicable

Clients can cache responses by requestHash and mark cached Monte Carlo as stale using the rules defined in DATA_MODEL.md.

### 6.2 Debouncing

- UI clients should debounce calls to `/forecast/deterministic` for slider drags.
- UI clients should abort in-flight requests when new edits occur.

---

## 7. HTTP Status Codes

- **200 OK** — success
- **400 Bad Request** — schema validation failure (VALIDATION_ERROR)
- **422 Unprocessable Entity** — semantic domain violation (SEMANTIC_ERROR)
- **500 Internal Server Error** — unexpected compute error (COMPUTE_ERROR)
- **501 Not Implemented** — feature not supported in the current engine (NOT_SUPPORTED)

---

## 8. Backward Compatibility

- API is versioned by URL prefix.
- DTO evolution:
  - Backward-compatible additions should be optional fields.
  - Breaking changes require /v2 and updated schemaVersion for exports.
