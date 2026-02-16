# Synthwave '84 Theme Tasks

- [x] S84-T1: Add shared theme identifier
Phase: Feature/Synthwave84
Dependencies: none
Acceptance Criteria:
[AC1] `ThemeId.Synthwave84` is added in `packages/shared/src/constants/enums.ts`.
[AC2] Shared package build/typecheck pass.

- [x] S84-T2: Add Synthwave '84 theme definition to server registry
Phase: Feature/Synthwave84
Dependencies: S84-T1
Acceptance Criteria:
[AC1] `packages/server/src/themes/registry.ts` includes complete Synthwave '84 `ThemeDefinition`.
[AC2] Theme payload schema validation remains successful.
[AC3] `/api/v1/themes` returns Synthwave '84 in both catalog and definitions.

- [x] S84-T3: Update theme route tests for built-in catalog set
Phase: Feature/Synthwave84
Dependencies: S84-T1, S84-T2
Acceptance Criteria:
[AC1] `packages/server/tests/routes/themes.test.ts` includes `ThemeId.Synthwave84` expectation.
[AC2] Route tests pass.

- [ ] S84-T4: Manual visual QA and persistence validation
Phase: Feature/Synthwave84
Dependencies: S84-T2
Acceptance Criteria:
[AC1] Synthwave '84 appears in theme selector and applies instantly.
[AC2] Theme is persisted/restored via snapshot + local preference.
[AC3] Readability passes checklist in `ACCEPTANCE.md`.

- [ ] S84-T5: Regression gate + log updates
Phase: Feature/Synthwave84
Dependencies: S84-T3, S84-T4
Acceptance Criteria:
[AC1] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all pass.
[AC2] `PROGRESS.txt` captures completion and any assumptions/decisions.
