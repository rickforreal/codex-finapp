import { z } from 'zod';

import { AppMode, HistoricalEra, SimulationMode, ThemeId, type MonthlySimulationRow, type SimulateResponse, type SinglePathResult, type StressTestResult } from '@finapp/shared';

import { getSnapshotState, type CompareSlotId, type SnapshotState, type WorkspaceSnapshot, useAppStore } from './useAppStore';

export const SNAPSHOT_SCHEMA_VERSION = 4;

export const PACKED_ROW_COLUMNS = [
  'monthIndex',
  'year',
  'monthInYear',
  'startStocks',
  'startBonds',
  'startCash',
  'moveStocks',
  'moveBonds',
  'moveCash',
  'wdStocks',
  'wdBonds',
  'wdCash',
  'wdRequested',
  'wdActual',
  'wdShortfall',
  'incomeTotal',
  'expenseTotal',
  'endStocks',
  'endBonds',
  'endCash',
] as const;

export type PackedRows = {
  columns: typeof PACKED_ROW_COLUMNS;
  data: number[][];
};

type PackedSinglePathResult = Omit<SinglePathResult, 'rows'> & {
  rowsPacked: PackedRows;
};

type PackedSimulateResponse = Omit<SimulateResponse, 'result'> & {
  result: PackedSinglePathResult;
};

type PackedStressResult = Omit<StressTestResult, 'base' | 'scenarios'> & {
  base: Omit<StressTestResult['base'], 'result'> & {
    result: PackedSinglePathResult;
  };
  scenarios: Array<Omit<StressTestResult['scenarios'][number], 'result'> & {
    result: PackedSinglePathResult;
  }>;
};

type PackedSimulationResults = {
  manual: PackedSimulateResponse | null;
  monteCarlo: PackedSimulateResponse | null;
  status: SnapshotState['simulationResults']['status'];
  mcStale: boolean;
  reforecast: PackedSimulateResponse | null;
  errorMessage: string | null;
};

type PackedStressState = Omit<SnapshotState['stress'], 'result'> & {
  result: PackedStressResult | null;
};

type PackedWorkspaceSnapshot = Omit<WorkspaceSnapshot, 'simulationResults' | 'stress'> & {
  simulationResults: PackedSimulationResults;
  stress: PackedStressState;
};

type PackedCompareWorkspace = {
  activeSlotId: CompareSlotId;
  baselineSlotId: CompareSlotId;
  slotOrder: CompareSlotId[];
  slots: Partial<Record<CompareSlotId, PackedWorkspaceSnapshot>>;
};

type PackedSnapshotState = Omit<SnapshotState, 'planningWorkspace' | 'trackingWorkspace' | 'compareWorkspace' | 'simulationResults' | 'stress'> & {
  planningWorkspace: PackedWorkspaceSnapshot | null;
  trackingWorkspace: PackedWorkspaceSnapshot | null;
  compareWorkspace: PackedCompareWorkspace;
  simulationResults: PackedSimulationResults;
  stress: PackedStressState;
};

type PackedSnapshotEnvelope = {
  schemaVersion: number;
  name: string;
  savedAt: string;
  data: PackedSnapshotState;
};

type SnapshotEnvelope = {
  schemaVersion: number;
  name: string;
  savedAt: string;
  data: SnapshotState;
};

type SnapshotLoadErrorCode = 'version_mismatch' | 'invalid_snapshot';

export class SnapshotLoadError extends Error {
  code: SnapshotLoadErrorCode;

  constructor(code: SnapshotLoadErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const assetBalancesSchema = z
  .object({
    stocks: z.number().int().nonnegative(),
    bonds: z.number().int().nonnegative(),
    cash: z.number().int().nonnegative(),
  })
  .strict();

const snapshotStateSchema = z
  .object({
    mode: z.nativeEnum(AppMode),
    trackingInitialized: z.boolean(),
    planningWorkspace: z.unknown().nullable(),
    trackingWorkspace: z.unknown().nullable(),
    compareWorkspace: z.unknown().optional(),
    simulationMode: z.nativeEnum(SimulationMode),
    selectedHistoricalEra: z.nativeEnum(HistoricalEra),
    coreParams: z
      .object({
        startingAge: z.number().int().min(1).max(120),
        withdrawalsStartAt: z.number().int().min(1).max(120),
        retirementStartDate: z
          .object({
            month: z.number().int().min(1).max(12),
            year: z.number().int().min(1900).max(3000),
          })
          .strict(),
        retirementDuration: z.number().int().min(1).max(100),
        inflationRate: z.number().min(0).max(0.2),
      })
      .strict(),
    portfolio: assetBalancesSchema,
    returnAssumptions: z
      .object({
        stocks: z.object({ expectedReturn: z.number().min(-1).max(1), stdDev: z.number().min(0).max(1) }).strict(),
        bonds: z.object({ expectedReturn: z.number().min(-1).max(1), stdDev: z.number().min(0).max(1) }).strict(),
        cash: z.object({ expectedReturn: z.number().min(-1).max(1), stdDev: z.number().min(0).max(1) }).strict(),
      })
      .strict(),
    spendingPhases: z.array(z.unknown()),
    withdrawalStrategy: z.unknown(),
    drawdownStrategy: z.unknown(),
    historicalData: z.unknown(),
    incomeEvents: z.array(z.unknown()),
    expenseEvents: z.array(z.unknown()),
    actualOverridesByMonth: z.record(z.string(), z.unknown()),
    lastEditedMonthIndex: z.number().int().nullable(),
    simulationResults: z.unknown(),
    stress: z.unknown(),
    theme: z
      .object({
        selectedThemeId: z.nativeEnum(ThemeId),
        defaultThemeId: z.nativeEnum(ThemeId),
        themes: z.array(z.unknown()),
        catalog: z.array(z.unknown()),
        validationIssues: z.array(z.unknown()),
        status: z.enum(['idle', 'loading', 'ready', 'error']),
        errorMessage: z.string().nullable(),
      })
      .strict(),
    ui: z.unknown(),
  })
  .strict();

const snapshotEnvelopeSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    name: z.string().min(1),
    savedAt: z.string().datetime(),
    data: snapshotStateSchema,
  })
  .strict();

const makeDownloadFilename = (name: string): string => {
  const safe = name
    .trim()
    .replace(/[^a-z0-9 _-]+/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  return `${safe.length > 0 ? safe : 'snapshot'}.json`;
};

const invalidSnapshot = (): SnapshotLoadError =>
  new SnapshotLoadError('invalid_snapshot', "This file doesn't appear to be a valid snapshot.");

const isCompareSlotId = (value: unknown): value is CompareSlotId =>
  value === 'A' ||
  value === 'B' ||
  value === 'C' ||
  value === 'D' ||
  value === 'E' ||
  value === 'F' ||
  value === 'G' ||
  value === 'H';

const asFiniteNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidSnapshot();
  }
  return value;
};

function validatePackedColumns(columns: unknown): asserts columns is typeof PACKED_ROW_COLUMNS {
  if (!Array.isArray(columns) || columns.length !== PACKED_ROW_COLUMNS.length) {
    throw invalidSnapshot();
  }

  PACKED_ROW_COLUMNS.forEach((column, index) => {
    if (columns[index] !== column) {
      throw invalidSnapshot();
    }
  });
}

const packRows = (rows: MonthlySimulationRow[]): PackedRows => ({
  columns: PACKED_ROW_COLUMNS,
  data: rows.map((row) => [
    row.monthIndex,
    row.year,
    row.monthInYear,
    row.startBalances.stocks,
    row.startBalances.bonds,
    row.startBalances.cash,
    row.marketChange.stocks,
    row.marketChange.bonds,
    row.marketChange.cash,
    row.withdrawals.byAsset.stocks,
    row.withdrawals.byAsset.bonds,
    row.withdrawals.byAsset.cash,
    row.withdrawals.requested,
    row.withdrawals.actual,
    row.withdrawals.shortfall,
    row.incomeTotal,
    row.expenseTotal,
    row.endBalances.stocks,
    row.endBalances.bonds,
    row.endBalances.cash,
  ]),
});

const unpackRows = (packed: unknown): MonthlySimulationRow[] => {
  if (!packed || typeof packed !== 'object') {
    throw invalidSnapshot();
  }

  const record = packed as { columns?: unknown; data?: unknown };
  validatePackedColumns(record.columns);

  if (!Array.isArray(record.data)) {
    throw invalidSnapshot();
  }

  return record.data.map((rowEntry) => {
    if (!Array.isArray(rowEntry) || rowEntry.length !== PACKED_ROW_COLUMNS.length) {
      throw invalidSnapshot();
    }

    const values = rowEntry.map((value) => asFiniteNumber(value));

    return {
      monthIndex: values[0]!,
      year: values[1]!,
      monthInYear: values[2]!,
      startBalances: {
        stocks: values[3]!,
        bonds: values[4]!,
        cash: values[5]!,
      },
      marketChange: {
        stocks: values[6]!,
        bonds: values[7]!,
        cash: values[8]!,
      },
      withdrawals: {
        byAsset: {
          stocks: values[9]!,
          bonds: values[10]!,
          cash: values[11]!,
        },
        requested: values[12]!,
        actual: values[13]!,
        shortfall: values[14]!,
      },
      incomeTotal: values[15]!,
      expenseTotal: values[16]!,
      endBalances: {
        stocks: values[17]!,
        bonds: values[18]!,
        cash: values[19]!,
      },
    };
  });
};

const packSinglePathResult = (result: SinglePathResult): PackedSinglePathResult => ({
  summary: result.summary,
  rowsPacked: packRows(result.rows),
});

const unpackSinglePathResult = (packed: unknown): SinglePathResult => {
  if (!packed || typeof packed !== 'object') {
    throw invalidSnapshot();
  }
  const record = packed as { summary?: unknown; rowsPacked?: unknown };
  if (!record.summary || typeof record.summary !== 'object') {
    throw invalidSnapshot();
  }

  const summary = record.summary as {
    totalWithdrawn?: unknown;
    totalShortfall?: unknown;
    terminalPortfolioValue?: unknown;
  };

  return {
    rows: unpackRows(record.rowsPacked),
    summary: {
      totalWithdrawn: asFiniteNumber(summary.totalWithdrawn),
      totalShortfall: asFiniteNumber(summary.totalShortfall),
      terminalPortfolioValue: asFiniteNumber(summary.terminalPortfolioValue),
    },
  };
};

const packSimulateResponse = (response: SimulateResponse | null): PackedSimulateResponse | null => {
  if (!response) {
    return null;
  }
  return {
    ...response,
    result: packSinglePathResult(response.result),
  };
};

const unpackSimulateResponse = (response: unknown): SimulateResponse | null => {
  if (response === null) {
    return null;
  }
  if (!response || typeof response !== 'object') {
    throw invalidSnapshot();
  }

  const record = response as Omit<SimulateResponse, 'result'> & { result?: unknown };
  if (!record.result) {
    throw invalidSnapshot();
  }

  return {
    ...record,
    result: unpackSinglePathResult(record.result),
  };
};

const packSimulationResults = (
  simulationResults: SnapshotState['simulationResults'],
): PackedSimulationResults => ({
  manual: packSimulateResponse(simulationResults.manual),
  monteCarlo: packSimulateResponse(simulationResults.monteCarlo),
  reforecast: packSimulateResponse(simulationResults.reforecast),
  status: simulationResults.status,
  mcStale: simulationResults.mcStale,
  errorMessage: simulationResults.errorMessage,
});

const unpackSimulationResults = (simulationResults: unknown): SnapshotState['simulationResults'] => {
  if (!simulationResults || typeof simulationResults !== 'object') {
    throw invalidSnapshot();
  }

  const record = simulationResults as {
    manual?: unknown;
    monteCarlo?: unknown;
    reforecast?: unknown;
    status?: unknown;
    mcStale?: unknown;
    errorMessage?: unknown;
  };

  if (
    record.status !== 'idle' &&
    record.status !== 'running' &&
    record.status !== 'complete' &&
    record.status !== 'error'
  ) {
    throw invalidSnapshot();
  }

  if (typeof record.mcStale !== 'boolean') {
    throw invalidSnapshot();
  }

  if (record.errorMessage !== null && typeof record.errorMessage !== 'string') {
    throw invalidSnapshot();
  }

  return {
    manual: unpackSimulateResponse(record.manual ?? null),
    monteCarlo: unpackSimulateResponse(record.monteCarlo ?? null),
    reforecast: unpackSimulateResponse(record.reforecast ?? null),
    status: record.status,
    mcStale: record.mcStale,
    errorMessage: record.errorMessage,
  };
};

const packStressResult = (result: StressTestResult | null): PackedStressResult | null => {
  if (!result) {
    return null;
  }

  return {
    ...result,
    base: {
      ...result.base,
      result: packSinglePathResult(result.base.result),
    },
    scenarios: result.scenarios.map((scenario) => ({
      ...scenario,
      result: packSinglePathResult(scenario.result),
    })),
  };
};

const unpackStressResult = (result: unknown): StressTestResult | null => {
  if (result === null) {
    return null;
  }
  if (!result || typeof result !== 'object') {
    throw invalidSnapshot();
  }

  const record = result as {
    simulationMode?: unknown;
    base?: unknown;
    scenarios?: unknown;
    timingSensitivity?: unknown;
  };

  if (record.simulationMode !== SimulationMode.Manual && record.simulationMode !== SimulationMode.MonteCarlo) {
    throw invalidSnapshot();
  }

  if (!record.base || typeof record.base !== 'object') {
    throw invalidSnapshot();
  }

  const base = record.base as Omit<StressTestResult['base'], 'result'> & { result?: unknown };
  if (!base.result) {
    throw invalidSnapshot();
  }

  if (!Array.isArray(record.scenarios)) {
    throw invalidSnapshot();
  }

  const scenarios = record.scenarios.map((scenario) => {
    if (!scenario || typeof scenario !== 'object') {
      throw invalidSnapshot();
    }
    const entry = scenario as Omit<StressTestResult['scenarios'][number], 'result'> & { result?: unknown };
    if (!entry.result) {
      throw invalidSnapshot();
    }

    return {
      ...entry,
      result: unpackSinglePathResult(entry.result),
    };
  });

  return {
    ...(record as Omit<StressTestResult, 'base' | 'scenarios'>),
    simulationMode: record.simulationMode,
    base: {
      ...base,
      result: unpackSinglePathResult(base.result),
    },
    scenarios,
  };
};

const packStressState = (stress: SnapshotState['stress']): PackedStressState => ({
  ...stress,
  result: packStressResult(stress.result),
});

const unpackStressState = (stress: unknown): SnapshotState['stress'] => {
  if (!stress || typeof stress !== 'object') {
    throw invalidSnapshot();
  }

  const record = stress as {
    isExpanded?: unknown;
    scenarios?: unknown;
    result?: unknown;
    status?: unknown;
    errorMessage?: unknown;
  };

  if (typeof record.isExpanded !== 'boolean') {
    throw invalidSnapshot();
  }

  if (!Array.isArray(record.scenarios)) {
    throw invalidSnapshot();
  }

  if (
    record.status !== 'idle' &&
    record.status !== 'running' &&
    record.status !== 'complete' &&
    record.status !== 'error'
  ) {
    throw invalidSnapshot();
  }

  if (record.errorMessage !== null && typeof record.errorMessage !== 'string') {
    throw invalidSnapshot();
  }

  return {
    isExpanded: record.isExpanded,
    scenarios: record.scenarios as SnapshotState['stress']['scenarios'],
    result: unpackStressResult(record.result ?? null),
    status: record.status,
    errorMessage: record.errorMessage,
  };
};

const packWorkspace = (workspace: WorkspaceSnapshot | null): PackedWorkspaceSnapshot | null => {
  if (!workspace) {
    return null;
  }

  return {
    ...workspace,
    simulationResults: packSimulationResults(workspace.simulationResults),
    stress: packStressState(workspace.stress),
  };
};

const packCompareWorkspace = (compareWorkspace: SnapshotState['compareWorkspace']): PackedCompareWorkspace => ({
  activeSlotId: compareWorkspace.activeSlotId,
  baselineSlotId: compareWorkspace.baselineSlotId,
  slotOrder: [...compareWorkspace.slotOrder],
  slots: Object.fromEntries(
    Object.entries(compareWorkspace.slots).map(([slotId, workspace]) => [
      slotId,
      workspace ? packWorkspace(workspace) : workspace,
    ]),
  ),
});

const unpackWorkspace = (workspace: unknown): WorkspaceSnapshot | null => {
  if (workspace === null) {
    return null;
  }
  if (!workspace || typeof workspace !== 'object') {
    throw invalidSnapshot();
  }

  const record = workspace as Omit<WorkspaceSnapshot, 'simulationResults' | 'stress'> & {
    simulationResults?: unknown;
    stress?: unknown;
  };

  if (!record.simulationResults || !record.stress) {
    throw invalidSnapshot();
  }

  return {
    ...record,
    simulationResults: unpackSimulationResults(record.simulationResults),
    stress: unpackStressState(record.stress),
  };
};

const defaultCompareWorkspace = (): SnapshotState['compareWorkspace'] => ({
  activeSlotId: 'A',
  baselineSlotId: 'A',
  slotOrder: ['A', 'B'],
  slots: {},
});

const unpackCompareWorkspace = (compareWorkspace: unknown): SnapshotState['compareWorkspace'] => {
  if (compareWorkspace === null || compareWorkspace === undefined) {
    return defaultCompareWorkspace();
  }
  if (!compareWorkspace || typeof compareWorkspace !== 'object') {
    throw invalidSnapshot();
  }

  // Legacy pair snapshot shape support.
  const legacy = compareWorkspace as {
    activeSlot?: unknown;
    leftWorkspace?: unknown;
    rightWorkspace?: unknown;
  };
  if (
    (legacy.activeSlot === 'left' || legacy.activeSlot === 'right') &&
    ('leftWorkspace' in legacy || 'rightWorkspace' in legacy)
  ) {
    const left = unpackWorkspace(legacy.leftWorkspace ?? null);
    const right = unpackWorkspace(legacy.rightWorkspace ?? null);
    const slots: SnapshotState['compareWorkspace']['slots'] = {};
    if (left) {
      slots.A = left;
    }
    if (right) {
      slots.B = right;
    }
    return {
      activeSlotId: legacy.activeSlot === 'right' ? 'B' : 'A',
      baselineSlotId: 'A',
      slotOrder: ['A', 'B'],
      slots,
    };
  }

  const record = compareWorkspace as {
    activeSlotId?: unknown;
    baselineSlotId?: unknown;
    slotOrder?: unknown;
    slots?: unknown;
  };

  if (typeof record.activeSlotId !== 'string' || typeof record.baselineSlotId !== 'string') {
    throw invalidSnapshot();
  }
  if (!Array.isArray(record.slotOrder)) {
    throw invalidSnapshot();
  }
  if (!record.slots || typeof record.slots !== 'object') {
    throw invalidSnapshot();
  }

  const slotOrder = record.slotOrder.filter((entry): entry is CompareSlotId => isCompareSlotId(entry));
  if (slotOrder.length < 2 || slotOrder.length > 8) {
    throw invalidSnapshot();
  }

  const slots = Object.fromEntries(
    Object.entries(record.slots as Record<string, unknown>).map(([slotId, workspace]) => [slotId, unpackWorkspace(workspace)]),
  ) as SnapshotState['compareWorkspace']['slots'];

  const normalizedSlots = Object.fromEntries(
    Object.entries(slots).filter(([, workspace]) => workspace !== null),
  ) as SnapshotState['compareWorkspace']['slots'];
  const normalizedOrder = slotOrder.filter((slotId) => normalizedSlots[slotId]);
  const resolvedOrder: CompareSlotId[] = normalizedOrder.length >= 2 ? normalizedOrder : ['A', 'B'];
  const recordActiveSlotId = isCompareSlotId(record.activeSlotId) ? record.activeSlotId : null;
  const recordBaselineSlotId = isCompareSlotId(record.baselineSlotId) ? record.baselineSlotId : null;
  const activeSlotId = recordActiveSlotId && resolvedOrder.includes(recordActiveSlotId)
    ? recordActiveSlotId
    : (resolvedOrder[0] ?? 'A');
  const baselineSlotId = recordBaselineSlotId && resolvedOrder.includes(recordBaselineSlotId)
    ? recordBaselineSlotId
    : (resolvedOrder[0] ?? 'A');

  return {
    activeSlotId,
    baselineSlotId,
    slotOrder: resolvedOrder,
    slots: normalizedSlots,
  };
};

const packSnapshotState = (state: SnapshotState): PackedSnapshotState => ({
  ...state,
  planningWorkspace: packWorkspace(state.planningWorkspace),
  trackingWorkspace: packWorkspace(state.trackingWorkspace),
  compareWorkspace: packCompareWorkspace(state.compareWorkspace),
  simulationResults: packSimulationResults(state.simulationResults),
  stress: packStressState(state.stress),
});

const unpackSnapshotState = (packed: unknown): SnapshotState => {
  const baseValidation = snapshotStateSchema.safeParse(packed);
  if (!baseValidation.success) {
    throw invalidSnapshot();
  }

  const data = baseValidation.data as SnapshotState & {
    planningWorkspace: unknown;
    trackingWorkspace: unknown;
    compareWorkspace?: unknown;
    simulationResults: unknown;
    stress: unknown;
  };

  return {
    ...data,
    compareWorkspace: unpackCompareWorkspace(data.compareWorkspace),
    planningWorkspace: unpackWorkspace(data.planningWorkspace),
    trackingWorkspace: unpackWorkspace(data.trackingWorkspace),
    simulationResults: unpackSimulationResults(data.simulationResults),
    stress: unpackStressState(data.stress),
  };
};

export const buildSnapshotEnvelope = (name: string): PackedSnapshotEnvelope => ({
  schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  name: name.trim(),
  savedAt: new Date().toISOString(),
  data: packSnapshotState(getSnapshotState()),
});

export const serializeSnapshot = (name: string): { json: string; filename: string } => {
  const envelope = buildSnapshotEnvelope(name);
  return {
    json: JSON.stringify(envelope),
    filename: makeDownloadFilename(name),
  };
};

export const parseSnapshot = (raw: string): SnapshotEnvelope => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw invalidSnapshot();
  }

  const firstPass = snapshotEnvelopeSchema.safeParse(parsed);
  if (!firstPass.success) {
    throw invalidSnapshot();
  }

  if (firstPass.data.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new SnapshotLoadError('version_mismatch', 'This snapshot version is not supported by this app.');
  }

  return {
    schemaVersion: firstPass.data.schemaVersion,
    name: firstPass.data.name,
    savedAt: firstPass.data.savedAt,
    data: unpackSnapshotState(firstPass.data.data),
  };
};

export const applySnapshot = (raw: string): SnapshotEnvelope => {
  const snapshot = parseSnapshot(raw);
  useAppStore.getState().setStateFromSnapshot(snapshot.data);
  return snapshot;
};
