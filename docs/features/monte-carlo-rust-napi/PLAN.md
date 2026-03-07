# Plan: Monte Carlo Rust N-API Migration

## Implementation

### 1. Native package scaffold
- Create `packages/native-mc` with:
  - Rust crate configured for `napi-rs`.
  - JS loader entrypoint for platform binding resolution.
  - build/test scripts invoked from npm workspace.
- Export one native function: `runMonteCarloJson(requestJson, optionsJson) -> resultJson`.

### 2. Port Monte Carlo core compute to Rust (MC path)
- Implement Rust equivalents of:
  - run-count clamping + seed handling,
  - i.i.d and block-bootstrap historical sampling,
  - manual-assumption stochastic return generation,
  - month-by-month simulator loop,
  - strategy dispatch (all configured withdrawal strategies),
  - drawdown/event handling,
  - percentile aggregation + representative-run selection/replay.
- Keep output payload shape aligned to current `MonteCarloExecutionResult` contract.

### 3. Engine selector + fallback/shadow wiring
- Refactor `packages/server/src/engine/monteCarlo.ts` to:
  - keep TS implementation as canonical fallback.
  - choose runtime via `FINAPP_MC_ENGINE` (`ts` default).
  - attempt Rust path when selected; on failure, log structured warning and fallback to TS.
  - optionally run shadow compare when `FINAPP_MC_SHADOW_COMPARE=1` for sampled requests.
- Add parity delta logging for key invariants (simulationCount, successCount, probability, terminal median, representative terminal).

### 4. Rust boundary adapter in server
- Add adapter module to load native binding lazily and map shared DTOs to/from JSON.
- Ensure adapter errors are surfaced as typed engine errors for fallback logic.
- Resolve and pass historical input context (selected-era months + historical summary) across native boundary for parity with TS path.

### 5. Stress and compare compatibility
- Keep `runStressTest` unchanged in behavior; it benefits via shared `runMonteCarlo` path.
- Preserve compare orchestration and client API behavior.

### 6. Build/CI integration
- Add root scripts for native build/test.
- Integrate native hooks into root build/test pipeline with safe skip behavior when Rust toolchain is unavailable locally.
- Add GitHub Actions workflow matrix for native build/test on macOS and Linux.

## Canonical Docs Impact
- `docs/ARCHITECTURE.md`: add MC runtime selector and native fallback model.
- `docs/API.md`: document internal env toggles (no contract change).
