# ACCEPTANCE: Theme Dropdown Scroll + Selected-Row Visibility

- Change ID: `CHG-0005`

## Functional Acceptance

- [x] Theme dropdown list has a bounded max height and vertical scrolling when family count exceeds visible space.
- [x] Reopening theme dropdown auto-scrolls the currently selected family row into view.
- [x] Command bar popover scrollbars are theme-aware (no bright white scrollbar in dark themes).
- [x] Theme family selection and per-family appearance toggles continue to function.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0005`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0005`
- [x] Canonical docs updated if required by scope (not required for this change)
