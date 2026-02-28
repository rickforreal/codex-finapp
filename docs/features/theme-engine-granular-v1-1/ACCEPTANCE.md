# Acceptance: Theme Engine Granular v1.1

## Contract
- [ ] `GET /api/v1/themes` includes:
  - `tokenModelVersion: "2"`
  - `slotCatalog[]`
  - v2 `ThemeDefinition` fields (`semantic`, `slots`, optional `overrides`)
- [ ] Route tests pass with new payload checks.

## Resolver and Inheritance
- [ ] Client resolves slot vars with precedence:
  - overrides > slots > slot catalog fallback > semantic > primitive.
- [ ] Resolver test covers override precedence and semantic/token references.
- [ ] Theme engine test verifies emitted `--theme-slot-*` variables.

## UI Application
- [ ] Command bar shell/actions/popovers/tooltips/modal consume slot-driven classes.
- [ ] App shell/sidebar/status panel consume slot-driven classes.
- [ ] Shared control primitives (inputs/segmented/toggle/sync controls) consume slot-driven classes.
- [ ] Summary stat cards, compare diff panel, chart panel, and stress panel consume slot-driven classes.

## Compatibility
- [ ] Existing theme selection precedence remains unchanged.
- [ ] Snapshot parsing supports missing `theme.slotCatalog` by defaulting to empty array.
- [ ] No mode/compare/stress/tracking behavior regressions.

## Regression Gate
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
