# Theme Families + Per-Theme Appearance (Light/Dark) v1 Acceptance

## Functional Acceptance

1. API contract:
- `GET /api/v1/themes` includes `families`, `variants`, and `defaultSelection`.
- Legacy fields (`defaultThemeId`, `themes`, `catalog`) still exist.

2. Theme picker:
- Theme menu shows family rows.
- Non-A11y families support inline light/dark toggles.
- High Contrast row shows A11y badge and no appearance toggle.

3. Selection behavior:
- Selecting a family restores that family’s remembered appearance.
- Toggling appearance updates the active variant immediately without reload.

4. Compatibility:
- Legacy snapshot/theme selections still load and map correctly.
- Local preference migration from legacy key/path works.

## Regression Gate

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
