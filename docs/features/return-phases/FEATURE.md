# Feature: Return Phases

## Summary
Add phase-based return modeling per portfolio so users can define up to 4 contiguous return phases across the portfolio timeline, with each phase independently configured as Manual or Historical while keeping `simulationRuns` global.

## Motivation
The current returns model enforces one global source/parameter set for the full horizon. Users need to model regime changes across time (for example, early-stagflation historical years, then custom manual assumptions, then full-history sampling) without splitting analysis across separate portfolios.

## Scope

### In scope
- Add `returnPhases` to simulation configuration (contiguous full coverage, max 4)
- Per-phase source switching (`manual` or `historical`) with phase-specific parameters
- Phase-aware return generation for all server simulation flows (`/simulate` manual + MC, `/reforecast`, stress)
- TS + Rust parity for phase-aware return generation
- UI for add/remove/edit return phases with contiguous boundary behavior
- Keep `simulationRuns` as one global setting per portfolio
- Compare lock/sync and Compare Insight support for return-phase differences
- Legacy state migration to one full-horizon phase

### Out of scope
- Changing endpoint paths or introducing a new service
- Removing TS fallback runtime path
- Snapshot/bookmark backwards-compatibility beyond one-phase normalization
- Expanding beyond 4 return phases
