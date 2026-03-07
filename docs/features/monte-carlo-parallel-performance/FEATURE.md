# Feature: Monte Carlo Parallel Performance (Server-Side)

## Problem
Monte Carlo runs become slow when users run 8 compare portfolios and stress scenarios, especially at higher path counts. The engine currently performs expensive percentile aggregation and representative-path retention in a way that adds avoidable CPU and memory overhead.

## Goal
Deliver a server-side performance wave that keeps computation on the backend, supports up to 10,000 runs consistently, and substantially improves end-to-end responsiveness for compare + stress workloads.

## Scope
- Optimize Monte Carlo aggregation internals in the server engine.
- Remove full-run path retention during Monte Carlo aggregation and reconstruct the representative path deterministically.
- Align Monte Carlo stress run counts with configured `simulationRuns` (clamped to `1..10000`) instead of fixed 1000.
- Add process-level server parallelism to improve multi-request throughput.
- Increase compare/stress client request fan-out cap to better utilize server-side parallel workers.

## Non-goals
- No Rust port in this wave.
- No asynchronous job queue/polling UX in this wave.
- No API contract shape changes.
