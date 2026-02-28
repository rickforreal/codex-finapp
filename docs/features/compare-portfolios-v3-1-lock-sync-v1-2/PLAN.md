# CPV31.2 — Implementation Plan

## Delta From Baseline
Baseline: `docs/features/compare-portfolios-v3-1-lock-sync/` and update wave `-v1-1`.

Changes vs baseline:
1. Spending Phases moves from required (`min 1`) to optional (`0..4`).
2. Engine spending clamp becomes conditional on phase presence.
3. Snapshot/bookmark load normalizes legacy phase arrays to empty.

## Plan
1. Update `simulateRequestSchema` to allow empty spending phases.
2. Refactor deterministic + Monte Carlo simulation paths to skip phase clamp when no active phase exists.
3. Change client initial state to `spendingPhases: []`.
4. Allow remove-to-zero in spending phase mutations.
5. Render Spending Phases empty state with explanation + Add CTA.
6. Normalize loaded snapshot/bookmark state to zero spending phases and clear spending-phase compare instance lock overrides.
7. Add/adjust tests for zero-phase defaults, no-clamp semantics, and migration behavior.
8. Update canonical docs and trackers.

## Acceptance
- App starts with zero spending phases.
- `/simulate` accepts empty spending-phase payloads.
- Engine applies no min/max clamp when phase list is empty.
- Snapshot/bookmark load clears legacy spending phases.
