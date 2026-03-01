# CHANGE: Segmented Toggle Active Hover Contrast

- Change ID: `CHG-0006`
- Status: `Done`
- Created: `2026-03-01`
- Updated: `2026-03-01`

## Why

The active segment in shared segmented toggles (for example Planning/Tracking) visually collapsed on hover because hover styling overrode the active fill in both light and dark themes.

## Scope

- Fix segmented toggle hover styling so active segments retain active background/text colors while hovered.
- Apply fix at shared segmented-toggle CSS level.

## Non-goals

- No theme palette/token changes.
- No behavior changes for toggle selection logic.
- No contract/schema/API updates.

## Surfaces Touched

- `packages/client/src/styles/index.css`

## Classification Rationale

Minor UX polish with no product contract or data-model impact.

## Canonical Docs Impact

No canonical doc impact.

Rationale: this is a styling specificity fix inside an existing control and does not change documented behavior or data contracts.
