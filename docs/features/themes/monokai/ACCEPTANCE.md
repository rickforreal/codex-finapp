# Monokai Theme Acceptance

## Functional Acceptance

1. API exposes Monokai theme
- `GET /api/v1/themes` includes catalog entry and full definition for `monokai`.
- `defaultThemeId` remains unchanged (`light`).

2. Theme selection works globally
- Monokai appears in command bar theme menu.
- Selecting Monokai applies immediately without simulation rerun or page reload.

3. Persistence works
- Snapshot save/load preserves selected theme as `monokai`.
- Local preference persistence restores Monokai on reload when no snapshot override is applied.

## Visual Acceptance Checklist

1. Command bar + input panel
- Brand block, section headers, cards, fields, and borders use Monokai-appropriate dark palette.
- Primary buttons are clearly distinguishable from secondary controls.

2. Stats + chart
- Stats cards remain readable and semantic positive/negative colors are clear.
- Manual line and area remain visible on dark background.
- Monte Carlo median vs confidence bands are visually separable.
- Stress scenario overlays are distinguishable from base line and from each other.

3. Detail table
- Header, body, sticky regions, and cell text are readable.
- Edited cell tint, preserved-row background, stale badge colors, and selected-cell outline are clearly visible.
- In-cell edit mode remains legible.

4. Stress panel
- Scenario cards and compact charts are readable and color-distinct.

## Non-Goals (Acceptance)

- Pixel-perfect parity with VS Code editor chrome is not required.
- No additional theming architecture changes are required for this feature.

## Exit Criteria

- Feature tasks are tracked in root `TASKS.md` and are complete.
- Regression gate is green.
- No blocking readability/usability issues in the visual checklist.
