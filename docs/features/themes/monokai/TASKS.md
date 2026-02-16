# Monokai Theme Tasks

- [x] M1: Add shared theme identifier
Phase: Feature/Monokai
Dependencies: none
Acceptance Criteria:
[AC1] `ThemeId.Monokai` is added in `packages/shared/src/constants/enums.ts`.
[AC2] Shared package typecheck/build passes.

- [x] M2: Add Monokai theme definition to server registry
Phase: Feature/Monokai
Dependencies: M1
Acceptance Criteria:
[AC1] `packages/server/src/themes/registry.ts` includes complete `ThemeDefinition` for Monokai.
[AC2] Theme registry payload validation still passes at startup.
[AC3] Monokai is catalog-visible in `/api/v1/themes` response.

- [x] M3: Update theme route tests for built-in catalog set
Phase: Feature/Monokai
Dependencies: M1, M2
Acceptance Criteria:
[AC1] `packages/server/tests/routes/themes.test.ts` expects Monokai in built-in IDs.
[AC2] Route tests pass.

- [ ] M4: Client smoke verification for theme selection and persistence
Phase: Feature/Monokai
Dependencies: M2
Acceptance Criteria:
[AC1] Monokai appears in command bar theme picker.
[AC2] Selecting Monokai updates UI colors across tokenized surfaces.
[AC3] Snapshot and local preference restore Monokai correctly.

- [ ] M5: Regression gate and release notes
Phase: Feature/Monokai
Dependencies: M3, M4
Acceptance Criteria:
[AC1] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` all pass.
[AC2] `PROGRESS.txt` includes implementation summary and any assumptions.
