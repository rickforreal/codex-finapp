# Acceptance: Historical Era Custom Range (Month-Year)

## Functional
- [x] Historical Era dropdown includes `Custom`.
- [x] Selecting `Custom` uses an inclusive month-year range.
- [x] Historical summary stats update from custom-filtered rows.
- [x] Monte Carlo sampling uses custom-filtered rows.
- [x] Changes remain run-gated (no simulation auto-run).

## Contracts
- [x] `HistoricalEra.Custom` exists in shared enum.
- [x] `SimulationConfig.customHistoricalRange` exists.
- [x] Schema requires custom range when era is custom.
- [x] Schema rejects invalid month-year ordering (`start > end`).
- [x] Historical summary route supports custom query params.

## Compare + Persistence
- [x] Compare `historicalEra` lock/sync propagates custom range.
- [x] Snapshot/bookmark round-trip preserves custom range.
- [x] Legacy snapshot load defaults missing custom range safely.

## UI
- [x] Custom view shows a two-thumb slider and `MMM YYYY` endpoint labels.
- [x] Initial custom range is seeded from currently selected preset.
- [x] Previous custom range is retained when toggling away and back.
- [x] Controls are disabled for read-only compare follower slots.

## Regression Gate
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
