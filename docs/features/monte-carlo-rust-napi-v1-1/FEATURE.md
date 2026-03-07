# Feature: Rust Simulation Engine Migration v1.1 (All Server Flows)

## Baseline
- Baseline feature: `docs/features/monte-carlo-rust-napi/`

## Problem
Rust migration currently covers Monte Carlo compute only. Manual `/simulate`, `/reforecast`, and stress scenario execution still rely on TypeScript-only paths, which limits end-to-end performance and introduces split engine semantics.

## Goal
Extend in-process Rust N-API simulation coverage to all server simulation flows while preserving API contracts, retaining TS fallback, and enforcing exact parity before any default engine flip.

## Scope
- Add Rust-native single-path execution for manual `/simulate`.
- Add Rust-native deterministic reforecast execution for `/reforecast`.
- Route stress manual and stress Monte Carlo paths through Rust-capable runtime wrappers.
- Replace TS callback-based MC stress transforms with serializable descriptor payloads compatible with native boundary.
- Introduce global selector `FINAPP_SIM_ENGINE=ts|rust` with MC alias compatibility.

## Non-goals
- No external HTTP API shape changes.
- No immediate default flip to Rust.
- No sidecar service architecture.
