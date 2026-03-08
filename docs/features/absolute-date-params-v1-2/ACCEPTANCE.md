# Acceptance: Absolute Date Parameters v1.2 (Rust Parity + Performance Recovery)

## Functional
- [ ] Valid absolute-date requests execute on Rust path without fallback logs for:
  - [ ] `/simulate` manual
  - [ ] `/simulate` Monte Carlo
  - [ ] `/reforecast`
  - [ ] `/stress-test` manual
  - [ ] `/stress-test` Monte Carlo
- [ ] Native stress transforms honor date-based scenario starts.
- [ ] Native outputs match TS outputs for seeded date-anchored fixtures.

## Performance
- [ ] 10k-run single-portfolio MC latency is at or near pre-absolute-date profile.
- [ ] 8-portfolio compare MC latency recovers from fallback-regressed state.
- [ ] compare + stress MC latency recovers from fallback-regressed state.

## Regression
- [ ] `npm run build -w @finapp/native-mc`
- [ ] `npm run test -w @finapp/native-mc`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`

## Tracking
- [ ] `TASKS.md` updated with v1.2 implementation tasks.
- [ ] `PROGRESS.txt` contains append-only kickoff and completion entries with measured timings.
