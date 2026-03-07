# Plan: Monte Carlo Parallel Performance (Server-Side)

## Summary
Implement a server-first performance wave focused on (1) reducing Monte Carlo compute/memory overhead and (2) enabling real parallel execution across simultaneous compare/stress requests via process-level workers.

## Implementation

### 1. Monte Carlo engine optimization
- Refactor percentile curve derivation in `packages/server/src/engine/monteCarlo.ts` to sort each month's distribution once per asset and derive all required percentiles from that sorted array.
- Replace full `runResults` path retention with compact per-run summary retention (`terminal`, `drawdown`, `shortfall`, `runIndex`).
- Select representative run index from summary metrics after global medians are known.
- Deterministically replay only the selected run to produce `representativePath`.

### 2. Stress Monte Carlo run-count parity
- In `packages/server/src/engine/stress.ts`, replace fixed `runs: 1000` with run-count resolution from `config.simulationRuns` (clamped `1..10000`).
- Apply the same resolved run count for base and scenario Monte Carlo stress runs.

### 3. Server-side parallel throughput
- Update `packages/server/src/server.ts` to use Node cluster workers in non-test runtime.
- Worker count: `FINAPP_SERVER_WORKERS` if set; otherwise `max(1, availableParallelism - 1)`.
- Keep test/runtime safety: do not cluster under test mode.

### 4. Client fan-out tuning
- Raise compare and compare-stress bounded parallelism from 4 to 8 in:
  - `packages/client/src/components/layout/CommandBar.tsx`
  - `packages/client/src/components/output/StressTestPanel.tsx`
- Preserve bounded queue behavior (no unbounded request bursts).

## Canonical Docs Impact
- `docs/ARCHITECTURE.md`: note process-level worker parallelism for server throughput.
- `docs/API.md`: clarify stress Monte Carlo uses configured `simulationRuns` semantics (same clamp policy).
- No API schema shape changes.
