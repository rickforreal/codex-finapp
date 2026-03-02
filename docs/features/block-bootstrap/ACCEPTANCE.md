# Acceptance: Block Bootstrap Sampling

## Functional
- [x] `SimulationConfig` includes `blockBootstrapEnabled` and `blockBootstrapLength`.
- [x] Zod schema validates `blockBootstrapLength` in `[3, 36]`.
- [x] With block bootstrap disabled, MC behavior is identical to pre-change i.i.d. sampling.
- [x] With block bootstrap enabled, MC samples contiguous blocks with circular wrap.
- [x] Block bootstrap is deterministic with the same seed.
- [x] Block bootstrap produces different percentile curves than i.i.d. with the same seed.
- [x] Block length = 1 runs without error (degenerate case).

## UI
- [x] Toggle switch appears between era dropdown and stats table in HistoricalDataSummary.
- [x] Slider appears when toggle is ON, hidden when OFF.
- [x] Slider range is 3..36, step 1, default 12.
- [x] Helper text updates dynamically with current block length.
- [x] All controls disabled when `readOnly` is true.
- [x] Slider uses theme-aligned `accent-brand-blue` styling.

## Compare Mode
- [x] Block bootstrap fields stored per-slot in WorkspaceSnapshot.
- [x] Fields sync with `historicalEra` family lock.
- [x] Each slot can independently change block bootstrap when era is unlocked.
- [x] Switching active slots restores slot-specific block bootstrap settings.

## Snapshots
- [x] Schema version bumped to 7.
- [x] Block bootstrap fields included in snapshot serialization.
- [x] v6 snapshots rejected at version gate (existing strict behavior).

## Regression
- [x] `npm run typecheck`
- [x] `npm test` (all existing + 3 new MC tests pass)
- [x] `npm run build`
