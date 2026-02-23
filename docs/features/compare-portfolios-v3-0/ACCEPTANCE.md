# Compare Portfolios v3.0 — Acceptance

## Functional Acceptance

1. Mode model
- Mode toggle shows only `Planning` and `Tracking`.
- No user-facing Compare mode control remains.

2. Compare slot manager
- Compare slot manager is visible in sidebar in both modes.
- Starts with only slot `A`.
- `A` is non-removable.
- Non-`A` slots removable down to min slot count of 1.

3. Output routing
- With one active slot, single-portfolio output surfaces render.
- With more than one active slot, compare output surfaces render.

4. Tracking canonical hard floor
- `A.lastEditedMonthIndex` defines locked history floor.
- For non-`A` slots, months `<=` floor are immutable and sourced from `A`.
- Non-`A` overrides in locked range are removed automatically.

5. Run behavior
- Single slot: existing run behavior preserved.
- Multi-slot: run executes all active slots in both modes.
- Shared stochastic parity retained for multi-slot runs.

6. Snapshot behavior
- Schema version increments.
- Snapshot load rejects payloads containing `data.mode = "compare"` with explicit unsupported error.
- Valid snapshots still load via silent full-state replace.

## Unit/Store Acceptance

1. Slot invariants
- initial slot order is `['A']`.
- remove `A` is no-op.
- min slot count is `1`.

2. Compare activation selector
- false for one slot, true for more than one slot.

3. Tracking floor enforcement
- enforcement removes non-`A` overrides at/before `A` boundary.
- increasing `A` boundary re-normalizes non-`A` slots.

4. Config mode mapping
- compare multi-slot configs use `planning` or `tracking` only.

## Component Acceptance

1. CommandBar
- two-mode segmented toggle only.
- run path switches to multi-slot orchestration when slot count > 1.

2. Sidebar
- compare slot manager visible in both modes.

3. DetailTable (Tracking + multi-slot)
- non-`A` cells before/at `A` boundary are non-editable.
- post-boundary cells remain editable.

4. Output components
- all compare output surfaces switch on slot count, not `AppMode.Compare`.

## Regression Acceptance

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
