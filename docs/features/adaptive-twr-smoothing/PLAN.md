# Plan: Adaptive TWR Smoothing

## Delta From Baseline
Baseline behavior (Adaptive TWR) recalculates monthly and then applies spending phase clamp directly. This update inserts optional blend smoothing between raw strategy output and clamp.

## Implementation
1. Shared types + schemas
- Add `smoothingEnabled` and `smoothingBlend` to `DynamicSwrAdaptiveParams`.
- Validate `smoothingBlend` in `[0, 0.95]` and require boolean flag.

2. Engine
- Keep existing adaptive ROI computation.
- Compute `W_raw_m`.
- If smoothing enabled, compute `W_smooth_m = blend * W_prev_m + (1 - blend) * W_raw_m`.
- Apply phase monthly clamp to `W_smooth_m`.
- Persist month final withdrawal as next month `W_prev`.
- Apply in both deterministic and simulator execution paths.

3. Client/store
- Add defaults: `smoothingEnabled=true`, `smoothingBlend=0.7`.
- Ensure legacy loaded state without these fields normalizes to defaults.
- Ensure compare sync/diff views include new parameters.

4. UI
- Adaptive TWR controls include:
  - `Withdrawal Smoothing` toggle
  - `Smoothing Blend (Prior Weight)` slider (0..95%)
- Disable slider when toggle is off.

5. Docs + trackers
- Update root docs: `SPECS.md`, `WITHDRAWAL_STRATEGIES.md`, `DATA_MODEL.md`, `API.md`, `SCENARIOS.md`.
- Update `TASKS.md` and append-only `PROGRESS.txt`.

## Canonical Docs Impact
- `docs/SPECS.md` (strategy parameter/behavior updates)
- `docs/WITHDRAWAL_STRATEGIES.md` (formula + processing order)
- `docs/DATA_MODEL.md` (strategy param shape)
- `docs/API.md` (request DTO shape)
- `docs/SCENARIOS.md` (example behavior)
