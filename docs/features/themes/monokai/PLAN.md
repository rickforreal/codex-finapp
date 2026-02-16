# Monokai Theme Implementation Plan

## Summary

Add a new built-in server-defined theme (`monokai`) that applies a VS Code Monokai-inspired visual language across all currently tokenized UI surfaces (navbar, input cards, stats cards, chart, detail table, stress panel, and editing states). The theme must be selectable from the existing theme menu, persist via existing snapshot/local preference behavior, and pass existing theme validation and regression checks.

This plan is intentionally additive and does not change theming architecture.

## Scope

In scope:
- Add `ThemeId.Monokai` to shared enum/contracts.
- Add a full `ThemeDefinition` entry for Monokai in server registry.
- Ensure Monokai appears in `/api/v1/themes` catalog and payload.
- Update tests that assert built-in theme IDs.
- Verify client auto-renders new theme option (no bespoke UI branching).

Out of scope:
- Runtime custom theme authoring/import.
- Changing theme precedence rules.
- Expanding token model shape (unless implementation reveals a hard gap).

## Design Targets

Monokai intent:
- Dark, editor-like background hierarchy.
- Warm code-accent palette for positives/negatives/warnings and scenario lines.
- Readable but not high-contrast-first (High Contrast theme remains the strict A11y mode).
- Mono-friendly typography feel while keeping app-level readability.

Token design constraints:
- Keep WCAG validation warnings limited and explainable.
- Preserve strong semantic separation between:
  - interactive primary vs secondary controls
  - table edited/preserved/stale/selected states
  - chart MC bands vs median/manual lines
  - stress scenarios A-D

## Implementation Changes

### 1) Shared contracts
File(s):
- `packages/shared/src/constants/enums.ts`

Changes:
- Add `ThemeId.Monokai = 'monokai'`.

Notes:
- Existing schema contracts consume `ThemeId` via `z.nativeEnum`, so no extra schema shape change required.

### 2) Server theme registry
File(s):
- `packages/server/src/themes/registry.ts`

Changes:
- Add Monokai `ThemeDefinition` entry with:
  - `id: ThemeId.Monokai`
  - `name: 'Monokai'`
  - `description` referencing VS Code Monokai-inspired style
  - `version: '1.0.0'`
  - `defaultForApp: false`
  - complete token bundle (`color`, `state`, `chart`, plus base spacing/radius/border/shadow/motion/typography).

Notes:
- Keep Light as default theme.
- Keep High Contrast semantics unchanged.

### 3) Route/test updates
File(s):
- `packages/server/tests/routes/themes.test.ts`

Changes:
- Extend built-in ID assertion to include `ThemeId.Monokai`.
- Keep existing checks for default theme and validation issues.

### 4) Client behavior validation
File(s):
- no code changes expected unless a hard gap is found

Validation focus:
- Theme selector menu shows Monokai from catalog.
- Selecting Monokai applies all existing CSS variables without missing-token regressions.
- Snapshot save/load and local preference retain Monokai selection.

## Risks and Mitigations

Risk 1: Monokai colors reduce contrast in some UI regions.
- Mitigation: review `/themes` validation issues and perform targeted UI smoke checks (stats cards, input cards, table text, tooltip).

Risk 2: Some surfaces still rely on non-tokenized hardcoded colors.
- Mitigation: if found during QA, log follow-up under a separate theming-hardening task; do not block Monokai launch unless readability/functionality breaks.

Risk 3: Chart readability suffers (median vs bands vs stress overlays).
- Mitigation: tune chart token contrast and opacity values for Monokai specifically.

## Verification Gate

Automated:
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

Manual:
- Apply Monokai and inspect all major surfaces listed in `ACCEPTANCE.md`.
- Run both Manual and Monte Carlo simulation and verify chart/table/stress visuals remain legible.
- Save/load snapshot with Monokai selected and confirm restored theme.

## Deliverables

- Updated shared enum and server theme registry.
- Updated route test coverage for built-in theme list.
- Feature docs in this folder:
  - `TASKS.md`
  - `ACCEPTANCE.md`
  - `TOKENS.md`
