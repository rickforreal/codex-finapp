# Plan: Absolute Date Parameters v1.2 (Rust Parity + Performance Recovery)

## Delta From Baseline
Baseline: `docs/features/absolute-date-params/`

Changes vs baseline assumptions:
1. Native Rust runtime is no longer schema-compatible after the absolute-date refactor and currently falls back to TS.
2. Stress transform descriptor semantics changed from year-based to date-based and must be reflected across native boundary.
3. Performance target now explicitly includes restoring pre-refactor latency characteristics for high-run MC and compare workloads.

## Summary
Make Rust runtime fully compatible with absolute-date contracts (`birthDate`, `portfolioStart`, `portfolioEnd`, date-based spending phases and stress starts), ensure valid requests execute natively without fallback, and verify latency recovery for 10k-run/multi-portfolio paths.

## Implementation Changes

### 1) Native contract parity (`packages/native-mc`)
- Update native `SimulationConfig` DTO and related structs:
  - core params -> `birthDate`, `portfolioStart`, `portfolioEnd`, `inflationRate`.
  - spending phases -> `start`/`end` MonthYear and optional min/max bounds.
  - stress scenarios -> `start` MonthYear (replace year-based start).
- Replace legacy duration/withdrawal gating logic with date-anchored timeline logic mirroring TS:
  - duration months from `monthsBetween(portfolioStart, portfolioEnd)`.
  - spending phase lookup by simulated month date.
  - no legacy `withdrawalsStartAt` dependency.
- Update native stress transform descriptor shape and month-index mapping using `portfolioStart + scenario.start` timeline conversion.

### 2) Engine behavior parity and fallback elimination
- Ensure `/simulate` manual, `/simulate` MC, `/reforecast`, and `/stress-test` all pass valid date-anchored payloads through Rust path without schema errors.
- Keep TS fallback behavior for genuine native failures, but tighten tests to fail if fallback occurs for valid date-anchored fixtures.

### 3) Hot-path performance pass
- Remove obvious date-resolution overhead from per-run/per-month hot loops where needed to maintain prior latency profile.
- Keep behavior unchanged while reducing repeated per-iteration date computations.

### 4) Verification and benchmarks
- Add/extend tests for:
  - date-anchored native parity (manual/reforecast/MC/stress).
  - no-fallback assertions on valid date-anchored requests.
- Benchmark and compare elapsed times for:
  - single portfolio MC (10k runs),
  - compare MC (8 portfolios, 10k runs),
  - compare + stress MC.
- Capture measured results in progress log.

## Public Interface / Contract Impact
- External API contracts remain unchanged from absolute-date feature.
- Internal native DTO contracts are updated to match current shared absolute-date contracts.

## Regression Gate
- `npm run build -w @finapp/native-mc`
- `npm run test -w @finapp/native-mc`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Canonical Docs Impact
Expected updates:
- `docs/ARCHITECTURE.md` (runtime parity/perf notes if behavior changed)
- `docs/API.md` (only if runtime-selector behavior documentation needs adjustment)

If no canonical updates are required beyond implementation parity, record explicit "no canonical doc impact" rationale in `PROGRESS.txt`.
