# ACCEPTANCE: Compare Slot Theme-Adaptive Visual Refinement

- Change ID: `CHG-0003`

## Functional Acceptance

- [x] Compare chart uses slot-ID-stable theme chart tokens for all active slot lines (`A..H`).
- [x] Sidebar compare chips use slot-color backgrounds and remain readable across built-in themes.
- [x] Compare detail ledger circular tabs use the same slot-color mapping as chart lines.
- [x] Baseline chip/tab affordance is theme-adaptive and slot-color-based (no hardcoded gold dependency).
- [x] Hover remove control is a solid red circle with high-contrast `X` glyph.

## Visual / Interaction Checks (if UI)

- [x] In Light, Dark, Monokai, Synthwave '84, and High Contrast themes, baseline marker text remains legible.
- [x] Hover remove affordance remains visually obvious at default zoom.
- [x] Slot color identity remains consistent between sidebar chips, ledger tabs, and chart legend lines.

## Contract / Data Checks

- [x] Theme chart token schema includes `compareSlotA` through `compareSlotH`.
- [x] `GET /api/v1/themes` payload validates with the expanded `ThemeDefinition.tokens.chart` token set.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0003`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0003`
- [x] Canonical docs updated for token/contract-impacting changes
