# Feature: Monte Carlo Rust N-API Migration

## Problem
High-path Monte Carlo workloads (10,000 runs across multi-slot compare and stress scenarios) still exceed acceptable latency on local hardware despite TypeScript engine optimizations.

## Goal
Introduce a Rust-backed Monte Carlo runtime through an in-process N-API boundary, while preserving the existing HTTP API and exact output semantics via TS fallback and parity controls.

## Scope
- Add a new internal native workspace package for Rust MC runtime.
- Port Monte Carlo compute hot path to Rust while preserving output contract shape.
- Add server-side engine selector (`FINAPP_MC_ENGINE=rust|ts`, default `ts`).
- Add resilient fallback when Rust binding load/execute fails.
- Add optional shadow compare mode (`FINAPP_MC_SHADOW_COMPARE=1`) to execute both engines for sampled requests and log parity deltas.
- Wire stress MC to the same selector through shared `runMonteCarlo` path.
- Add native build/test hooks and CI workflow for darwin-arm64 + linux-x64.

## Non-goals
- No external API contract changes.
- No sidecar service.
- No default flip to Rust in this wave.
- No manual-only deterministic engine migration in this wave.
