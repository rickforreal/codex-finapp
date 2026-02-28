# Stay The Course Theme Implementation Plan

## Summary

Introduce a new built-in theme ID (`stayTheCourse`) with a dark UI baseline and bright teal accent language derived from the provided palette. The theme should work through the existing v2 token model (`tokens -> semantic -> slots/overrides`) and remain fully compatible with current theme selection and persistence behavior.

## Scope

In scope:
- Add `ThemeId.StayTheCourse` to shared enums/contracts.
- Add server theme definition in `packages/server/src/themes/registry.ts`.
- Ensure `/api/v1/themes` includes catalog + full definition.
- Keep slot coverage and fallback behavior unchanged (no architecture changes).
- Validate readability on command bar, sidebar, inputs, stats, charts, detail ledger, and stress panel.

Out of scope:
- Runtime custom theme authoring/import UI.
- Any changes to theme precedence (snapshot > local preference > server default).
- Token model/schema redesign.

## Palette Source

Provided colors (authoritative):
- `#04F2C6` (primary aqua)
- `#04F2AE` (secondary mint-aqua)
- `#048C65` (deep green-teal support tone)
- `#04F29B` (success-leaning mint)
- `#0C0C0C` (base dark background)

## Implementation Changes

### 1) Shared enum

File:
- `packages/shared/src/constants/enums.ts`

Change:
- Add `ThemeId.StayTheCourse = 'stayTheCourse'`.

### 2) Server registry

File:
- `packages/server/src/themes/registry.ts`

Changes:
- Add new `ThemeDefinition` entry:
  - `id: ThemeId.StayTheCourse`
  - `name: 'Stay The Course'`
  - `description` describing dark + teal style
  - `defaultForApp: false`
  - full token bundle with mappings guided by `TOKENS.md`
- Keep semantic/slot inheritance behavior identical to existing themes.

### 3) Route coverage

File:
- `packages/server/tests/routes/themes.test.ts`

Change:
- Assert new built-in theme ID is present.

### 4) Client verification

Expected code changes:
- none unless token gaps are discovered.

Verification:
- Theme appears in command bar theme menu.
- Theme switch applies all slot-driven surfaces immediately.
- Snapshot/bookmark/local preference restore selected ID correctly.

## Canonical Docs Impact

No canonical doc impact expected for initial add. This is an additive built-in theme pack using existing API/data model/architecture.

If implementation discovers behavior changes, update:
- `docs/SPECS.md` (only if visual behavior semantics change)
- `docs/API.md` / `docs/DATA_MODEL.md` (only if contract shape changes)

## Verification Gate

Automated:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Manual:
- apply theme in app and review major surfaces listed in `ACCEPTANCE.md`.
