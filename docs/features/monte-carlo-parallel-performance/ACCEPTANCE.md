# Acceptance: Monte Carlo Parallel Performance (Server-Side)

## Functional
- [x] Monte Carlo still clamps run count to `1..10000` and produces stable percentile outputs.
- [x] Representative path selection semantics remain deterministic for fixed seed.
- [x] Stress test Monte Carlo run count follows `config.simulationRuns` (clamped), not fixed 1000.
- [x] Compare and compare-stress client orchestration remain bounded while allowing up to 8 concurrent slot requests, with adaptive downshifting for heavy MC workloads.

## Performance/Runtime
- [x] Monte Carlo percentile computation performs one sort per month distribution per asset class (not one sort per percentile).
- [x] Monte Carlo no longer stores full path objects for all runs.
- [x] Non-representative Monte Carlo runs skip row materialization and stream month-end metrics from simulator fast path.
- [x] Server can run with multiple workers (cluster) outside test mode.

## Regression
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Tracking
- [x] Root `TASKS.md` includes this feature tasks.
- [x] `PROGRESS.txt` includes append-only kickoff and completion entries.
