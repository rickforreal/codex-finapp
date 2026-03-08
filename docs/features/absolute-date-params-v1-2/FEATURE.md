# Feature Update: Absolute Date Parameters v1.2 (Rust Parity + Performance Recovery)

## Baseline
- Baseline feature: `docs/features/absolute-date-params/`
- Prior update: `docs/features/absolute-date-params-v1-1/`

## Problem
After date-anchored core parameter changes, native Rust simulation still expects legacy year-based fields. Runtime therefore falls back to TypeScript (`mc_rust_fallback_to_ts` / `sim_rust_fallback_to_ts`) for valid requests, causing significant latency regression in high-run Monte Carlo, especially multi-portfolio compare workloads.

## Goal
Restore native Rust execution for date-anchored configs and recover prior Monte Carlo latency profile while preserving absolute-date behavior.

## Scope
- Update native runtime DTOs and simulation/stress timeline logic to date-anchored contracts.
- Eliminate fallback for valid date-anchored requests.
- Recover latency through native-path restoration and targeted hot-path improvements where required.
- Add parity/fallback/perf validation for date-anchored workloads.

## Non-goals
- No rollback of absolute-date model.
- No API product-surface expansion.
- No snapshot/bookmark migration work.
