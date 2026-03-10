# Plan: Return Phases

## Implementation
1. Docs-first setup and root tracker updates (`TASKS.md`, `PROGRESS.txt`).
2. Shared model/schema refactor:
- Add `ReturnPhase` domain model and `returnPhases: ReturnPhase[]` on `SimulationConfig`.
- Keep legacy single-source return fields as compatibility inputs.
- Normalize legacy configs to one full-horizon phase.
- Validate contiguous full coverage, no gaps/overlaps, max 4, and source-specific requirements.
3. Server engine updates (TS):
- Add phase-aware monthly return resolver used by manual, MC, reforecast, and stress runs.
- Enforce hard phase boundaries for block-bootstrap sampling.
- Preserve deterministic seeding and compare shared-stochastic parity.
4. Native runtime parity (Rust):
- Extend DTOs to include `returnPhases` and compatibility normalization.
- Mirror phase-aware return generation and bootstrap-boundary rules.
- Keep TS fallback/oracle behavior unchanged.
5. Client/store/UI updates:
- Replace returns section with Return Phases editor (add/remove/edit, max 4, contiguous ranges).
- Keep `simulationRuns` as a global section-level control.
- Add legacy migration in workspace/snapshot/bookmark load paths.
- Update stale-state transitions and validation messaging.
6. Compare lock/sync + insight updates:
- Replace legacy `returnAssumptions`/`historicalEra` sync families with unified `returnPhases` family.
- Extend compare-insight diff builder with phase count and per-phase rows.
7. Canonical doc updates:
- `docs/SPECS.md`, `docs/SCENARIOS.md`, `docs/DATA_MODEL.md`, `docs/API.md`.
- `docs/ARCHITECTURE.md` only if pipeline boundaries/flow descriptions materially change.

## Contracts / Compatibility
- External API remains additive/compatible.
- `simulationRuns` remains global.
- Legacy saved configs are normalized to a single full-horizon return phase.

## Risks
- TS/Rust parity drift in phase-boundary bootstrap behavior.
- Compare sync complexity for instance-level phase locks.
- Migration edge cases when legacy historical fields are partially populated.

## Validation Strategy
- Build parity fixture corpus with mixed phase timelines (`manual -> historical -> manual`).
- Assert deterministic equality for fixed-seed TS vs Rust outputs across all server flows.
- Preserve existing fallback behavior and runtime-selector resilience.
