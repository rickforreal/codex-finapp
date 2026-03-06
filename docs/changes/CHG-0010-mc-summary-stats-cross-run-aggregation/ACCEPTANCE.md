# ACCEPTANCE: Monte Carlo Summary Stats Cross-Run Aggregation

- Change ID: `CHG-0010`

## Functional Acceptance

- [x] Server Monte Carlo response includes cross-run aggregated real withdrawal metrics (median/mean/stddev/p25/p75).
- [x] Summary cards #35-#39 use aggregated Monte Carlo metrics instead of representative-path-only values.
- [x] Manual-mode summary metrics remain unchanged.
- [x] Compare mode summary cards use the same Monte Carlo aggregated metrics per slot.

## Visual / Interaction Checks (if UI)

- [x] Monte Carlo monthly withdrawal stat cards show more stable values across reruns than representative-path-only behavior.
- [x] Portfolio End behavior remains aligned to Monte Carlo terminal percentile semantics.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0010`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0010`
- [x] Canonical docs updated if required by change scope
