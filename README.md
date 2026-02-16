# FinApp

Retirement forecasting and funds-management web app built as a TypeScript monorepo.

FinApp helps model retirement outcomes in two workflows:
- `Planning`: run stochastic Manual simulations or Monte Carlo distributions.
- `Tracking`: enter actuals, preserve realized history, and re-simulate future months.

The app is intentionally stateless on the backend for user data. All planning/tracking state lives in the client and can be exported/imported via snapshot JSON files.

## What’s Implemented

- Full retirement simulation engine (monthly resolution).
- 12 withdrawal strategies.
- Bucket and Rebalancing drawdown strategies (with glide path support).
- Income and expense event modeling.
- Monte Carlo mode from historical era datasets.
- Tracking mode with editable actuals and stale-state behavior in Tracking+MC.
- Stress testing scenarios with chart overlays and comparison metrics.
- Snapshot save/load with strict schema version validation and packed output rows.
- Server-defined theme system with built-ins (`Light`, `Dark`, `High Contrast`).

## Repository Layout

```text
.
├── docs/                    # product + technical specs (source of truth)
├── data/                    # historical returns dataset(s)
├── packages/
│   ├── shared/              # shared domain models, API contracts, zod schemas
│   ├── server/              # Fastify API + simulation/stress engines
│   └── client/              # React + Zustand + Tailwind UI
├── TASKS.md                 # phase/task checklist history
├── PROGRESS.txt             # reverse-chronological build log
└── AGENTS.md                # agent workflow/rules used during development
```

## Key Docs

Read these first when extending the system:

1. `docs/ENGINEERING.md` - phase sequencing, DoD, workflow expectations.
2. `docs/ARCHITECTURE.md` - component boundaries and data flow.
3. `docs/DATA_MODEL.md` - canonical types, snapshot format, constraints.
4. `docs/API.md` - endpoint contracts.
5. `docs/SPECS.md` - UI affordances and behavior expectations.
6. `docs/SCENARIOS.md` - golden user journeys.
7. `docs/WITHDRAWAL_STRATEGIES.md` - strategy math/intent.

## Tech Stack

- Node.js 20+, npm workspaces
- TypeScript (all packages)
- Server: Fastify
- Client: React + Zustand + Vite + Tailwind
- Validation: Zod (shared contracts)
- Testing: Vitest

## Development Setup

```bash
npm install
npm run dev
```

Default local flow:
- Client: Vite dev server (typically `http://localhost:5173`)
- Server API: Fastify (typically `http://localhost:3001`)

## Workspace Commands

From repo root:

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

Run package-specific checks:

```bash
npm run test -w @finapp/server
npm run test -w @finapp/client
npm run typecheck -w @finapp/shared
```

## API Surface (Current)

Base path: `/api/v1`

- `GET /health`
- `POST /simulate`
- `POST /reforecast`
- `POST /stress-test`
- `GET /historical/summary`
- `GET /themes`

For full payloads, use `docs/API.md` and shared contracts in:
- `packages/shared/src/contracts/api.ts`
- `packages/shared/src/contracts/schemas.ts`

## State, Snapshots, and Versioning

- App state is maintained in Zustand (`packages/client/src/store/useAppStore.ts`).
- Snapshot serialization lives in `packages/client/src/store/snapshot.ts`.
- Snapshot schema version is strict (exact match required on load).
- Cached simulation rows are packed to reduce snapshot file size.

## Extensibility Guide

### 1) Add a New Theme (Server-Defined)

Theme system is server-owned by design:
- Definitions live in `packages/server/src/themes/registry.ts`.
- Validation warnings are produced in `packages/server/src/themes/validation.ts`.
- Route exposure: `GET /api/v1/themes`.

To add a theme:
1. Add a new `ThemeId` in `packages/shared/src/constants/enums.ts`.
2. Extend registry with a complete `ThemeDefinition` token bundle.
3. Ensure schema validity (`packages/shared/src/contracts/schemas.ts`).
4. If needed, map additional tokens in `packages/client/src/styles/themeEngine.ts`.
5. Verify UI coverage in dark/high-contrast contexts and run full checks.

### 2) Add a Withdrawal Strategy

1. Add strategy type/params in shared domain (`packages/shared/src/domain/simulation.ts`).
2. Add schema constraints in shared contracts.
3. Implement server calculator in `packages/server/src/engine/strategies/`.
4. Register strategy resolution in engine wiring.
5. Add client parameter UI in withdrawal strategy components.
6. Add unit tests (server strategy tests are expected per strategy).

### 3) Add a Stress Scenario Type

1. Extend shared stress union + validation.
2. Implement scenario effect in `packages/server/src/engine/stress.ts`.
3. Add UI controls in `packages/client/src/components/output/StressTestPanel.tsx`.
4. Add engine + route tests.

### 4) Add/Change Snapshot Fields

1. Update `SnapshotState` in store.
2. Update serializer/parser in `snapshot.ts`.
3. Bump `SNAPSHOT_SCHEMA_VERSION`.
4. Add/adjust snapshot tests for round-trip + invalid payload behavior.

## Quality Gates

Before merging significant changes, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Notes

- `.temp/` is used for working notes/scratch artifacts and is not source-of-truth.
- Product and implementation history is intentionally tracked in `TASKS.md` and `PROGRESS.txt`.
