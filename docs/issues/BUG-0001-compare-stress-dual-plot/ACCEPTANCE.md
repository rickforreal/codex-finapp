# ACCEPTANCE: Compare Stress Overlay Missing A/B Scenario Lines

- Bug ID: `BUG-0001`

## Functional Acceptance Criteria

- [x] In Compare mode, each stress scenario renders two lines: `<Scenario> (A)` and `<Scenario> (B)`.
- [x] A/B scenario lines use same scenario hue with solid/dashed distinction.
- [x] Legend lists separate entries for scenario `(A)` and `(B)`.
- [x] Hover tooltip shows scenario `(A)` and `(B)` values when available.

## Test Cases

1. Compare + Manual + one scenario: verify two scenario lines with correct labels/styles.
2. Compare + Monte Carlo + one scenario: verify two scenario lines with correct labels/styles.
3. Compare with one slot stress failure: successful slot overlays remain visible and panel shows slot-specific error.

## Regression Checklist

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`

## Manual QA Checklist

- [x] Non-compare stress behavior remains unchanged in Planning/Tracking.
- [x] Portfolio A/B base lines and compare legend continue to render correctly.
- [x] Stress tooltip entries do not overlap or hide key compare entries.

## Closure

- [x] Root `TASKS.md` updated with bug completion
- [x] `PROGRESS.txt` includes resolution summary with bug ID
- [x] Canonical docs update not required (documented in plan)
