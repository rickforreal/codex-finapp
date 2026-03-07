# Plan: Rust Simulation Engine Migration v1.1 (All Server Flows)

## Delta From Baseline
Baseline: `docs/features/monte-carlo-rust-napi/`

Changes vs baseline:
- Expands Rust coverage from MC-only to all server simulation flows (`/simulate` manual, `/reforecast`, stress manual, stress MC transforms).
- Introduces global selector `FINAPP_SIM_ENGINE` while keeping MC-specific alias behavior for backward compatibility.
- Adds native DTO/function boundaries for single-path and deterministic reforecast execution.
- Replaces MC stress callback transform path with serializable descriptor transforms to enable Rust execution without TS callback fallback.

## Implementation

### 1. Native runtime expansion (`packages/native-mc`)
- Keep `runMonteCarloJson` and add:
  - `runSinglePathJson`
  - `runReforecastJson`
- Extend native MC options with serializable stress transform descriptor:
  - `stockCrash`, `bondCrash`, `broadMarketCrash`, `prolongedBear`, `highInflationSpike`, `custom`.
- Reuse shared simulation primitives to keep manual/reforecast/MC behavior aligned.

### 2. Server runtime wrappers and selector model
- Add global selector `FINAPP_SIM_ENGINE=ts|rust`.
- MC compatibility rule:
  - if `FINAPP_SIM_ENGINE` is unset, honor existing `FINAPP_MC_ENGINE`.
- Add runtime wrappers for:
  - manual single-path simulation,
  - deterministic reforecast,
  - Monte Carlo (existing + flow-tagged fallback logging).
- Fallback logging includes flow tags:
  - `simulate_manual`, `reforecast`, `stress_manual`, `stress_mc`.

### 3. Route and stress wiring
- `/simulate` manual branch uses runtime wrapper.
- `/reforecast` uses runtime wrapper.
- Stress manual path uses runtime wrapper.
- Stress MC path uses descriptor-based transforms (no TS callback dependency).

### 4. Contracts/docs
- External HTTP contracts unchanged.
- Internal native DTO additions for single-path/reforecast + MC transform descriptor.
- Canonical docs update:
  - `docs/API.md`
  - `docs/ARCHITECTURE.md`

## Validation
- Exact parity comparisons for manual/reforecast/stress manual/stress MC.
- Per-flow fallback tests with forced native failure.
- Determinism checks for repeated seeded runs.
- Regression gate:
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run build -w @finapp/native-mc`
  - `npm run test -w @finapp/native-mc`
