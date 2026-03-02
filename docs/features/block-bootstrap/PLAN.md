# Plan: Block Bootstrap Sampling

## Implementation

### 1. Shared types + schemas
- Add `blockBootstrapEnabled: boolean` and `blockBootstrapLength: number` to `SimulationConfig`.
- Add Zod validators: `blockBootstrapEnabled: z.boolean()`, `blockBootstrapLength: z.number().int().min(3).max(36)`.

### 2. Engine (`monteCarlo.ts`)
- Rename existing `sampleHistoricalReturns` to `sampleHistoricalReturnsIid`.
- Add `sampleHistoricalReturnsBlock`: draws contiguous blocks of `blockLength` months with circular wrap from the era pool.
- Call site dispatches based on `config.blockBootstrapEnabled`.
- Everything downstream (percentile curves, representative path) unchanged.

### 3. Tests
- Update `createBaseConfig()` fixture with default values (`false`, `12`).
- Add 3 tests: determinism with same seed, divergence from i.i.d., blockLength=1 edge case.

### 4. Client store (`useAppStore.ts`)
- Add fields to `WorkspaceSnapshot`, `SnapshotState`, initial state defaults.
- Add `setBlockBootstrapEnabled` and `setBlockBootstrapLength` actions following `setSelectedHistoricalEra` pattern (respect compare sync on `historicalEra` family).
- Update `workspaceFromState`, `snapshotFieldsFromWorkspace`, `currentInputFieldsFromState`, `cloneSnapshotState`, `snapshotStateFromStore`, `configFromWorkspace`, `applyCompareSyncFromMaster`, `useSimulationConfig`.

### 5. Snapshot schema (`snapshot.ts`)
- Bump `SNAPSHOT_SCHEMA_VERSION` from 6 to 7.
- Add both fields to `snapshotStateSchema`.

### 6. UI (`HistoricalDataSummary.tsx`)
- Between era dropdown and stats table: toggle switch + conditional slider section.
- Toggle label: "Block Bootstrap Sampling". Slider range: 3..36, step 1, default 12.
- Dynamic helper text with current block length.
- All controls disabled when `readOnly` is true.
- Slider uses `accent-brand-blue` for theme alignment (matching Withdrawal Smoothing slider pattern).

## Canonical Docs Impact
- `docs/SPECS.md` — add block bootstrap affordance to Historical Data Summary section.
- `docs/ARCHITECTURE.md` — update MC sampling description.
- `docs/DATA_MODEL.md` — add fields to `SimulationConfig`.
- `docs/API.md` — update `SimulateRequest.config` fields description.
