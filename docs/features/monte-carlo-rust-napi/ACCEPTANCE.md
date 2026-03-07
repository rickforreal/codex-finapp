# Acceptance: Monte Carlo Rust N-API Migration

## Functional
- [x] Server supports `FINAPP_MC_ENGINE=ts|rust` with default `ts`.
- [x] Rust runtime exports in-process MC compute via `runMonteCarloJson` and returns MC payload-compatible JSON.
- [x] Rust load/execute failure does not break requests; TS fallback executes and returns response.
- [x] `FINAPP_MC_SHADOW_COMPARE=1` triggers dual-engine run for sampled requests and logs parity deltas.
- [x] Stress MC path uses same selector/fallback behavior via shared engine path.

## Build/CI
- [x] Native workspace package exists and is runnable through npm workspace scripts.
- [x] Root build/test scripts invoke native hooks.
- [x] CI workflow exists for native build/test on darwin-arm64 + linux-x64.

## Regression
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Tracking
- [x] Root `TASKS.md` includes Rust migration tasks.
- [x] `PROGRESS.txt` includes kickoff and completion entries.
