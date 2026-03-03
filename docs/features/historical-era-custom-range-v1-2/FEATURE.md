# Feature Update: Historical Era Custom Range v1.2 (Event Snap)

## Baseline
- Baseline feature folder: `docs/features/historical-era-custom-range/`
- Prior update: `docs/features/historical-era-custom-range-v1-1/`

## Problem
Exact month-year slider control can make event-aligned stopping difficult when users try to select an event month precisely.

## Goal
Add light magnetic snapping near mapped event months so event selection is easier without forcing event-only movement.

## Scope
- Add in-client snap helper for event month ordinals.
- Apply snapping to both custom-range thumbs.
- Keep month granularity and exact-event labeling behavior unchanged.

## Non-goals
- No backend/API/data-model changes.
- No event-only lock; non-event months remain selectable.
