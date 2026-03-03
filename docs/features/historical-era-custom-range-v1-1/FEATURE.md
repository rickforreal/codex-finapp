# Feature Update: Historical Era Custom Range v1.1 (Event Labels)

## Baseline
- Baseline feature folder: `docs/features/historical-era-custom-range/`

## Problem
The custom month-year slider provides date endpoints but no contextual market event cues while dragging. Users cannot quickly map selected months to notable historical regimes.

## Goal
Show independent historical event labels for each custom-range thumb (start and end), updated live as the thumb moves.

## Scope
- Add a curated event catalog covering Jul 1926 through Dec 2025.
- Resolve event labels using exact month-year matching only.
- Render small labels above the custom slider:
  - Left label for start thumb month-year.
  - Right label for end thumb month-year.
- Keep all current custom-range and run-gated behavior unchanged.

## Non-goals
- No backend or API changes.
- No auto-rerun behavior.
- No nearest-event interpolation for non-event months.
