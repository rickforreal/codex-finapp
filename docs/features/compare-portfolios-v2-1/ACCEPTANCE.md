# Compare Portfolios v2.1 — Acceptance

## Functional Acceptance

1. Compare panel visibility
- Panel renders only in Compare mode.
- Panel renders only when current simulation mode snapshots are available for all active slots.
- Panel is hidden when no differences exist.

2. Table content
- Columns: `Parameter` plus active slot columns (`A`..`H`), with baseline marker in header.
- Rows include only parameters with cross-slot differences.
- Coverage includes all editable families: core, portfolio, returns, withdrawal strategy, drawdown strategy, spending phases summary, income events summary, expense events summary.

3. Difference semantics
- Equality comparison uses normalized internal values.
- List-type rows ignore ids and use deterministic summaries.
- Non-baseline differing cells are highlighted.

4. Integration behavior
- Panel appears between Summary Stats and Portfolio Chart.
- Existing compare chart/stats/ledger/stress behavior is unchanged.

## Regression Acceptance

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.

## Edge-Case Acceptance

1. Identical slots
- No rows are produced and panel is hidden.

2. Strategy-type divergence
- Strategy type row differs; unsupported params show `N/A` and only diff rows are rendered.

3. Slot count variability
- Panel supports 2..8 active slots.

4. Partial compare run context
- If any active slot lacks current-mode snapshot, panel remains hidden.
