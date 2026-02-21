# Synthwave '84 Theme Implementation Plan

## Summary

Add a new built-in server-defined theme (`synthwave84`) inspired by Robb Owen's VS Code Synthwave '84. The theme should deliver a high-energy neon-dark aesthetic across all currently tokenized app surfaces while preserving readability and functional clarity for charts, stats, table editing states, and stress overlays.

This is an additive feature within the existing Phase 13 theming architecture.

## Scope

In scope:
- Add `ThemeId.Synthwave84` to shared enums/contracts.
- Add a complete `ThemeDefinition` in server theme registry.
- Ensure `/api/v1/themes` catalog and theme payload include Synthwave '84.
- Update route tests for built-in theme set.
- Validate client selector + persistence behavior without new client architecture changes.

Out of scope:
- Runtime custom theme import.
- Changes to theme precedence rules.
- Token model/schema expansion unless a hard gap is discovered.

## Visual Intent

Design goals:
- Deep midnight/purple base layers with neon pink/cyan accents.
- High visual identity while preserving quantitative readability (especially chart/grid/tooltip/table).
- Strong color separation between:
  - manual/median line vs MC bands
  - stress scenarios A-D
  - positive/negative value semantics
  - table edited/preserved/stale/selected states

## Implementation Changes

### 1) Shared enums/contracts
File(s):
- `packages/shared/src/constants/enums.ts`

Changes:
- Add `ThemeId.Synthwave84 = 'synthwave84'`.

Notes:
- Existing Zod schemas consume `ThemeId` via native enums, so no schema structure change required.

### 2) Server theme registry
File(s):
- `packages/server/src/themes/registry.ts`

Changes:
- Add Synthwave '84 `ThemeDefinition` with:
  - `id: ThemeId.Synthwave84`
  - `name: "Synthwave '84"`
  - descriptive metadata
  - complete token bundle including color/state/chart tokens and base token inheritance.

Constraints:
- `defaultForApp` remains `false`.
- Existing defaults (Light) and high-contrast behavior remain unchanged.

### 3) Route test coverage
File(s):
- `packages/server/tests/routes/themes.test.ts`

Changes:
- Extend built-in IDs assertion to include `ThemeId.Synthwave84`.

### 4) Client behavior validation
Expected code changes:
- none, unless QA surfaces a hard tokenization gap.

Validation focus:
- Theme appears in command bar selector.
- Applying Synthwave '84 updates all tokenized surfaces immediately.
- Snapshot/local preference round-trip preserves selected Synthwave theme.

## Risks and Mitigations

Risk 1: Neon palette hurts legibility in dense table/chart contexts.
- Mitigation: tune chart/state tokens for contrast; use conservative opacity for large fills.

Risk 2: Stress scenario lines become visually ambiguous.
- Mitigation: assign scenario colors with clear hue/luminance spacing.

Risk 3: Accessibility warning volume spikes.
- Mitigation: iterate contrast-sensitive token pairs (text/surface, tooltip text/bg, inverse text/button).

## Verification Gate

Automated:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Manual:
- Execute `ACCEPTANCE.md` checklist in both Manual and Monte Carlo modes.
- Verify Tracking table state markers (edited/preserved/stale/selected) under Synthwave '84.
- Verify stress overlays and tooltip readability.

## Deliverables

- Shared enum update.
- Server theme registry update with Synthwave '84 tokens.
- Updated route tests for built-in theme set.
- Feature planning docs in this folder: `ACCEPTANCE.md`, `TOKENS.md`.
- Task status is tracked in root `TASKS.md`.
