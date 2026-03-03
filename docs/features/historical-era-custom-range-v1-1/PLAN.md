# Plan: Historical Era Custom Range v1.1 (Event Labels)

## Delta From Baseline
- Baseline: `docs/features/historical-era-custom-range/`
- Changes in this wave:
  - Add a broad historical event catalog for custom slider context.
  - Add exact-match event label rendering for both slider thumbs.
  - Update UX docs to specify event-label behavior.

## Decisions Locked
- Resolution rule: exact month-year match only.
- Event density: broad catalog (~45 events) within dataset bounds.
- Label placement: small text above slider, left-aligned for start thumb and right-aligned for end thumb.
- Fallback behavior: show no event label text when no exact match exists.

## Implementation

### 1. Client event catalog + lookup helper
- Add a reusable client helper module containing:
  - event list `{ year, month, label }`
  - `getHistoricalEventLabel(month, year): string | null`
- Use month-ordinal map lookup for O(1) exact matching.

### 2. HistoricalDataSummary custom slider UX
- In custom-era view, compute:
  - `startEventLabel` from custom start month-year.
  - `endEventLabel` from custom end month-year.
- Render a compact two-column label row above the slider track.
- Preserve existing slider mechanics, endpoint date labels, read-only behavior, and no auto-run semantics.

### 3. Tests
- Add unit tests for event helper:
  - exact-match resolution
  - non-match returns null
  - broad catalog size + unique month-year coverage

## Canonical Docs Impact
- `docs/SPECS.md`: update Affordance #11a custom behavior to include independent event labels.
- `docs/SCENARIOS.md`: update Monte Carlo scenario flow with event label visibility during thumb movement.
- No impact: `docs/DATA_MODEL.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md` (no contract/model/architecture/product-scope change).
