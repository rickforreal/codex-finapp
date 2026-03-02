# Feature: Block Bootstrap Sampling for Monte Carlo Engine

## Problem
The Monte Carlo engine samples historical monthly returns independently (i.i.d.) — each month is drawn uniformly at random from the era-filtered pool. This destroys sequential correlation present in real market returns: momentum, crash clustering, recovery arcs, and other short-to-medium-term autocorrelation patterns.

## Goal
Add optional block bootstrap sampling to the Monte Carlo engine. Instead of drawing individual months, the engine draws contiguous blocks of N months (with circular wrap), preserving within-block sequential structure while maintaining between-block randomization.

## Scope
- Extend `SimulationConfig` with `blockBootstrapEnabled` (boolean) and `blockBootstrapLength` (3..36 months).
- Implement block sampling function in `monteCarlo.ts` alongside existing i.i.d. sampler.
- Add toggle + slider UI in `HistoricalDataSummary` component (sidebar, MC mode only).
- Integrate with compare sync on the `historicalEra` family (block bootstrap settings sync when era is locked).
- Bump snapshot schema version to 7.

## Non-goals
- No changes to the deterministic simulation path.
- No changes to stress test mechanics.
- No new simulation mode — this is a configuration option within Monte Carlo.
- No statistical analysis or recommendation of optimal block length.
