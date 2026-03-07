# Acceptance: Rust Simulation Engine Migration v1.1 (All Server Flows)

## Functional
- [ ] `FINAPP_SIM_ENGINE=ts|rust` controls engine selection for manual `/simulate`, `/reforecast`, and stress flows.
- [ ] Monte Carlo engine honors `FINAPP_SIM_ENGINE`, and if unset, falls back to `FINAPP_MC_ENGINE` behavior.
- [ ] Manual `/simulate` can execute via Rust engine and returns contract-compatible response.
- [ ] `/reforecast` can execute via Rust engine and returns contract-compatible response.
- [ ] Stress manual path executes via Rust-capable runtime wrapper.
- [ ] Stress MC path executes with descriptor-based transforms (no TS callback requirement).
- [ ] Native failures in each flow fall back to TS and log structured warning with flow tag.

## Parity
- [ ] Manual `/simulate`: Rust equals TS for seeded/manual fixtures (row + summary exact equality).
- [ ] `/reforecast`: Rust equals TS for tracking override fixtures (row + summary exact equality).
- [ ] Stress manual: Rust equals TS across scenario types.
- [ ] Stress MC: Rust equals TS for representative path + percentile outputs on fixed fixtures.

## Regression / Build
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run build -w @finapp/native-mc`
- [ ] `npm run test -w @finapp/native-mc`

## Tracking / Docs
- [ ] Root `TASKS.md` includes v1.1 Rust migration tasks.
- [ ] `PROGRESS.txt` includes append-only kickoff and completion entries.
- [ ] Canonical docs updated: `docs/API.md`, `docs/ARCHITECTURE.md`.
