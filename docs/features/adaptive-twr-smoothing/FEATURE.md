# Feature: Adaptive TWR Smoothing

## Problem
Dynamic SWR (Adaptive TWR) can oscillate between spending phase min/max bounds month-to-month when the raw adaptive target hovers around those thresholds. This produces noisy withdrawals that feel unstable.

## Goal
Add configurable blend smoothing to Adaptive TWR so monthly withdrawals can be stabilized without introducing a new strategy variant.

## Scope
- Extend `dynamicSwrAdaptive` params with:
  - `smoothingEnabled: boolean`
  - `smoothingBlend: number` (prior-withdrawal weight)
- Apply smoothing before spending phase monthly clamp.
- Use prior month **final** withdrawal (post-clamp) as smoothing anchor.
- Expose toggle + slider in Withdrawal Strategy UI.
- Preserve backward compatibility for old snapshots/bookmarks by defaulting missing fields.

## Non-goals
- No new strategy type.
- No changes to drawdown sequencing.
- No changes to phase clamp semantics.
