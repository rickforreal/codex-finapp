# CPV31.2 — Zero-Phase Spending Defaults

## Problem
Spending Phases currently starts with a required default card and enforces a minimum of one phase. This makes phase min/max bounds mandatory even when users want strategy-only withdrawals.

## Goal
- Default to zero spending phases.
- Treat Spending Phases as optional (`0..4`).
- When zero phases exist, apply no phase clamp to withdrawals.
- Preserve add/remove UX for users who want bounded phases later.

## Scope
- Client/store defaults and Spending Phases UI empty state.
- Shared/server validation and engine behavior for zero-phase requests.
- Snapshot/bookmark load migration to clear legacy phases.
- Compare lock/sync compatibility with empty spending-phase lists.

## Out of Scope
- Withdrawal strategy formula changes.
- New backend endpoints.

## Canonical Docs Impact
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/DATA_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/API.md`
