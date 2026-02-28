# Stay The Course Theme Acceptance

## Functional Acceptance

1. API exposes new theme
- `GET /api/v1/themes` includes `stayTheCourse` in catalog and definitions.
- Existing default theme remains unchanged.

2. Theme selection works
- Theme appears in command bar theme menu as `Stay The Course`.
- Selecting it applies without reload or rerun.

3. Persistence works
- Snapshot save/load round-trips selected theme ID.
- Local preference restore still works when no snapshot override is active.

## Visual Acceptance Checklist

1. Command bar + sidebar + input sections
- Dark surfaces are consistent and readable.
- Primary/secondary controls are visually distinct.

2. Summary + charts
- Stat cards remain legible with clear positive/negative semantics.
- Portfolio/withdrawal charts remain readable in all modes.
- Tooltip text/background contrast is sufficient.

3. Detail ledger
- Body/header text contrast is readable on dark surfaces.
- Focus/edited/stale/read-only states remain distinguishable.

4. Stress panel
- Scenario cards and rows are readable.
- Scenario color separation remains clear.

## Exit Criteria

- Root `TASKS.md` includes and completes Stay The Course task entries.
- `PROGRESS.txt` includes append-only completion entry.
- Regression gate is green.
