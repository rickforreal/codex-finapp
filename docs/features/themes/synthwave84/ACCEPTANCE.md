# Synthwave '84 Theme Acceptance

## Functional Acceptance

1. API availability
- `GET /api/v1/themes` includes `synthwave84` in catalog and full theme list.
- `defaultThemeId` remains unchanged.

2. Theme switching
- Synthwave '84 is listed in theme picker.
- Selecting it applies globally without reload or simulation rerun.

3. Persistence
- Snapshot save/load preserves Synthwave '84 selection.
- Local preference restores Synthwave '84 when no snapshot override applies.

## Visual Acceptance Checklist

1. Command bar + input panel
- Neon-dark palette is applied consistently to navbar, cards, borders, and controls.
- Primary/secondary controls remain visually distinct.

2. Stats + chart
- Stat card text/value colors remain legible.
- Manual line/area remain clear against chart background.
- Monte Carlo median and bands are visually separable.
- Stress scenario lines are distinguishable from base line and one another.

3. Detail table
- Header/body text remains readable in dense rows.
- Edited cell, preserved rows, stale indicator, and selected-cell outline are clearly visible.
- In-cell edit mode remains legible.

4. Stress panel
- Scenario cards and compact comparison charts remain clear and interpretable.

## Non-Goals

- Perfect 1:1 recreation of VS Code editor chrome.
- New theming architecture beyond existing semantic token system.

## Exit Criteria

- All tasks in `TASKS.md` completed.
- Regression gate green.
- No blocking readability/usability issues in checklist.
