# TASKS

## Phase 1 Plan — Foundation

- [x] P1-T1: Initialize monorepo workspace scaffolding
Phase: 1 (Foundation)
Dependencies: none
Acceptance Criteria:
[AC1] Root workspace files exist: `package.json`, `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`.
[AC2] Workspace directories exist: `packages/shared`, `packages/server`, `packages/client`.
[AC3] Root scripts for `dev`, `build`, `test`, `typecheck`, and `lint` are defined in `package.json`.

- [x] P1-T2: Scaffold shared package structure and placeholder types
Phase: 1 (Foundation)
Dependencies: P1-T1
Acceptance Criteria:
[AC1] `packages/shared/src/{domain,contracts,ui,constants}` exists with placeholder files for `SimulationConfig` and `SimulationResult`.
[AC2] Enums include `AssetClass`, `WithdrawalStrategyType`, and `SimulationMode`.
[AC3] ESLint import boundary rule is configured so `domain`/`contracts` cannot import from `ui`.

- [x] P1-T3: Scaffold Fastify server with health route
Phase: 1 (Foundation)
Dependencies: P1-T1, P1-T2
Acceptance Criteria:
[AC1] `packages/server` contains Fastify app bootstrap with CORS and structured logging.
[AC2] `GET /api/v1/health` returns `{ "status": "ok" }`.
[AC3] Server start script listens on configurable `PORT`.

- [x] P1-T4: Scaffold React client shell with Tailwind theme and health call
Phase: 1 (Foundation)
Dependencies: P1-T1, P1-T2, P1-T3
Acceptance Criteria:
[AC1] `packages/client` has Vite + React + Tailwind configured.
[AC2] `AppShell` renders sidebar placeholder and output placeholder; `CommandBar` renders static placeholder controls.
[AC3] On mount, client calls health endpoint via an API wrapper and logs the response.

- [x] P1-T5: Create Zustand store skeleton matching architecture slices
Phase: 1 (Foundation)
Dependencies: P1-T4
Acceptance Criteria:
[AC1] `useAppStore` exists with empty slice structure matching `ARCHITECTURE.md` Section 6.2.
[AC2] Store types are imported from `@shared` placeholders without circular imports.
[AC3] Client compiles with store wired into app bootstrapping.

- [x] P1-T6: Validate Phase 1 tooling and DoD checks
Phase: 1 (Foundation)
Dependencies: P1-T2, P1-T3, P1-T4, P1-T5
Acceptance Criteria:
[AC1] `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` run successfully from root.
[AC2] `npm run dev` starts both client and server.
[AC3] Manual check confirms app shell renders and browser console logs health response.
