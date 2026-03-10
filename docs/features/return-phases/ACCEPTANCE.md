# Acceptance: Return Phases

## Functional
- [x] `SimulationConfig` supports `returnPhases` with max 4 entries and contiguous full-horizon coverage.
- [x] Each phase supports source `manual` or `historical` with source-specific parameter ownership.
- [x] Legacy single-source return configs normalize to one full-horizon phase.
- [x] `simulationRuns` remains global and unchanged in behavior.
- [x] Server `/simulate` manual branch uses phase-aware monthly return generation.
- [x] Server `/simulate` MC branch uses phase-aware historical/manual generation with hard bootstrap boundaries.
- [x] Server `/reforecast` and stress flows use phase-aware return resolution.
- [x] Compare lock/sync supports `returnPhases` family semantics.
- [x] Compare Insight shows return-phase count and per-phase rows with only-differences behavior.

## Determinism / Parity
- [x] Fixed seed + same config produces deterministic outputs in TS and Rust.
- [x] TS and Rust outputs match for mixed-phase manual/historical fixtures.
- [x] Bootstrap blocks never cross return-phase boundaries.

## Client UX
- [x] Returns section renders Return Phases list UI with add/remove/edit and max-4 guard.
- [x] Phase boundaries remain contiguous (no gaps/overlaps) after edits.
- [x] Per-phase controls switch correctly between Manual and Historical controls.
- [x] Global Simulation Runs control remains at section level.
- [x] Legacy loaded state (workspace/snapshot/bookmark) auto-migrates to one phase.

## Gates
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run build -w @finapp/native-mc`
- [x] `npm run test -w @finapp/native-mc`
