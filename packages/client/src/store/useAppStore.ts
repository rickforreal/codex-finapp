import { create } from 'zustand';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
  SimulationMode,
  ThemeAppearance,
  ThemeFamilyId,
  ThemeId,
  ThemeVariantId,
  WithdrawalStrategyType,
  type DrawdownStrategy,
  type ActualMonthOverride,
  type ActualOverridesByMonth,
  type HistoricalDataSummary,
  type ThemeFamilyCatalogItem,
  type ThemeDefinition,
  type ThemeSlotCatalogItem,
  type ThemeValidationIssue,
  type StressScenario,
  type StressTestResult,
  type SimulationConfig,
  type SimulateResponse,
  type WithdrawalStrategyConfig,
} from '@finapp/shared';

import { createId } from '../lib/id';
import { sanitizeTrackingActualOverrides } from '../lib/trackingActuals';

export type IncomeEventForm = {
  id: string;
  name: string;
  amount: number;
  depositTo: AssetClass;
  start: { month: number; year: number };
  end: { month: number; year: number } | 'endOfRetirement';
  frequency: 'monthly' | 'quarterly' | 'annual' | 'oneTime';
  inflationAdjusted: boolean;
};

export type ExpenseEventForm = {
  id: string;
  name: string;
  amount: number;
  sourceFrom: AssetClass | 'follow-drawdown';
  start: { month: number; year: number };
  end: { month: number; year: number } | 'endOfRetirement';
  frequency: 'monthly' | 'annual' | 'oneTime';
  inflationAdjusted: boolean;
};

export type SpendingPhaseForm = {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  minMonthlySpend: number;
  maxMonthlySpend: number;
};

type ChartDisplayMode = 'nominal' | 'real';
type TableGranularity = 'monthly' | 'annual';
type RunStatus = 'idle' | 'running' | 'complete' | 'error';
type ReforecastStatus = 'idle' | 'pending' | 'complete';
type StressRunStatus = 'idle' | 'running' | 'complete' | 'error';
type ThemeStatus = 'idle' | 'loading' | 'ready' | 'error';
export const COMPARE_SLOT_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type CompareSlotId = (typeof COMPARE_SLOT_IDS)[number];
export const COMPARE_SYNC_FAMILIES = [
  'coreParams',
  'startingPortfolio',
  'returnAssumptions',
  'spendingPhases',
  'withdrawalStrategy',
  'drawdownStrategy',
  'incomeEvents',
  'expenseEvents',
  'historicalEra',
] as const;
export type CompareSyncFamilyKey = (typeof COMPARE_SYNC_FAMILIES)[number];
export const COMPARE_SYNC_LIST_FAMILIES = [
  'spendingPhases',
  'incomeEvents',
  'expenseEvents',
] as const;
export type CompareSyncListFamilyKey = (typeof COMPARE_SYNC_LIST_FAMILIES)[number];

type CompareSyncSlotOverrides = {
  families: Partial<Record<CompareSyncFamilyKey, boolean>>;
  instances: Record<CompareSyncListFamilyKey, Record<string, boolean>>;
};

type CompareSyncState = {
  familyLocks: Record<CompareSyncFamilyKey, boolean>;
  instanceLocks: Record<CompareSyncListFamilyKey, Record<string, boolean>>;
  unsyncedBySlot: Partial<Record<CompareSlotId, CompareSyncSlotOverrides>>;
};

type WithdrawalParamKey =
  | 'initialWithdrawalRate'
  | 'annualWithdrawalRate'
  | 'expectedRealReturn'
  | 'drawdownTarget'
  | 'expectedRateOfReturn'
  | 'fallbackExpectedRateOfReturn'
  | 'lookbackMonths'
  | 'smoothingEnabled'
  | 'smoothingBlend'
  | 'baseWithdrawalRate'
  | 'extrasWithdrawalRate'
  | 'minimumFloor'
  | 'capitalPreservationTrigger'
  | 'capitalPreservationCut'
  | 'prosperityTrigger'
  | 'prosperityRaise'
  | 'guardrailsSunset'
  | 'ceiling'
  | 'floor'
  | 'spendingRate'
  | 'smoothingWeight'
  | 'pmtExpectedReturn'
  | 'priorYearWeight'
  | 'capeWeight'
  | 'startingCape';

type WithdrawalStrategyParamsForm = {
  initialWithdrawalRate: number;
  annualWithdrawalRate: number;
  expectedRealReturn: number;
  drawdownTarget: number;
  expectedRateOfReturn: number;
  fallbackExpectedRateOfReturn: number;
  lookbackMonths: number;
  smoothingEnabled: boolean;
  smoothingBlend: number;
  baseWithdrawalRate: number;
  extrasWithdrawalRate: number;
  minimumFloor: number;
  capitalPreservationTrigger: number;
  capitalPreservationCut: number;
  prosperityTrigger: number;
  prosperityRaise: number;
  guardrailsSunset: number;
  ceiling: number;
  floor: number;
  spendingRate: number;
  smoothingWeight: number;
  pmtExpectedReturn: number;
  priorYearWeight: number;
  capeWeight: number;
  startingCape: number;
};

export type WorkspaceSnapshot = {
  simulationMode: SimulationMode;
  selectedHistoricalEra: HistoricalEra;
  coreParams: {
    startingAge: number;
    withdrawalsStartAt: number;
    retirementStartDate: { month: number; year: number };
    retirementDuration: number;
    inflationRate: number;
  };
  portfolio: {
    stocks: number;
    bonds: number;
    cash: number;
  };
  returnAssumptions: {
    stocks: { expectedReturn: number; stdDev: number };
    bonds: { expectedReturn: number; stdDev: number };
    cash: { expectedReturn: number; stdDev: number };
  };
  spendingPhases: SpendingPhaseForm[];
  withdrawalStrategy: {
    type: WithdrawalStrategyType;
    params: WithdrawalStrategyParamsForm;
  };
  drawdownStrategy: {
    type: DrawdownStrategyType;
    bucketOrder: AssetClass[];
    rebalancing: {
      targetAllocation: { stocks: number; bonds: number; cash: number };
      glidePathEnabled: boolean;
      glidePath: Array<{
        year: number;
        allocation: { stocks: number; bonds: number; cash: number };
      }>;
    };
  };
  historicalData: {
    summary: HistoricalDataSummary | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    errorMessage: string | null;
  };
  incomeEvents: IncomeEventForm[];
  expenseEvents: ExpenseEventForm[];
  actualOverridesByMonth: ActualOverridesByMonth;
  lastEditedMonthIndex: number | null;
  simulationResults: {
    manual: SimulateResponse | null;
    monteCarlo: SimulateResponse | null;
    status: RunStatus;
    mcStale: boolean;
    reforecast: SimulateResponse | null;
    errorMessage: string | null;
  };
  stress: {
    isExpanded: boolean;
    scenarios: StressScenario[];
    result: StressTestResult | null;
    status: StressRunStatus;
    errorMessage: string | null;
  };
};

export type SnapshotState = {
  mode: AppMode;
  trackingInitialized: boolean;
  planningWorkspace: WorkspaceSnapshot | null;
  trackingWorkspace: WorkspaceSnapshot | null;
  compareWorkspace: {
    activeSlotId: CompareSlotId;
    baselineSlotId: CompareSlotId;
    slotOrder: CompareSlotId[];
    slots: Partial<Record<CompareSlotId, WorkspaceSnapshot>>;
    compareSync: CompareSyncState;
  };
  simulationMode: SimulationMode;
  selectedHistoricalEra: HistoricalEra;
  coreParams: {
    startingAge: number;
    withdrawalsStartAt: number;
    retirementStartDate: { month: number; year: number };
    retirementDuration: number;
    inflationRate: number;
  };
  portfolio: {
    stocks: number;
    bonds: number;
    cash: number;
  };
  returnAssumptions: {
    stocks: { expectedReturn: number; stdDev: number };
    bonds: { expectedReturn: number; stdDev: number };
    cash: { expectedReturn: number; stdDev: number };
  };
  spendingPhases: SpendingPhaseForm[];
  withdrawalStrategy: {
    type: WithdrawalStrategyType;
    params: WithdrawalStrategyParamsForm;
  };
  drawdownStrategy: {
    type: DrawdownStrategyType;
    bucketOrder: AssetClass[];
    rebalancing: {
      targetAllocation: { stocks: number; bonds: number; cash: number };
      glidePathEnabled: boolean;
      glidePath: Array<{
        year: number;
        allocation: { stocks: number; bonds: number; cash: number };
      }>;
    };
  };
  historicalData: {
    summary: HistoricalDataSummary | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    errorMessage: string | null;
  };
  incomeEvents: IncomeEventForm[];
  expenseEvents: ExpenseEventForm[];
  actualOverridesByMonth: ActualOverridesByMonth;
  lastEditedMonthIndex: number | null;
  simulationResults: {
    manual: SimulateResponse | null;
    monteCarlo: SimulateResponse | null;
    status: RunStatus;
    mcStale: boolean;
    reforecast: SimulateResponse | null;
    errorMessage: string | null;
  };
  stress: {
    isExpanded: boolean;
    scenarios: StressScenario[];
    result: StressTestResult | null;
    status: StressRunStatus;
    errorMessage: string | null;
  };
  theme: {
    selectedThemeFamilyId: ThemeFamilyId;
    selectedAppearanceByFamily: Record<ThemeFamilyId, ThemeAppearance>;
    defaultThemeFamilyId: ThemeFamilyId;
    defaultAppearance: ThemeAppearance;
    activeVariantId: ThemeVariantId | null;
    variants: ThemeDefinition[];
    families: ThemeFamilyCatalogItem[];
    legacyDefaultThemeId: ThemeId;
    legacyThemes: ThemeDefinition[];
    legacyCatalog: Array<{
      id: ThemeId;
      name: string;
      description: string;
      version: string;
      isHighContrast: boolean;
      defaultForApp: boolean;
    }>;
    slotCatalog: ThemeSlotCatalogItem[];
    validationIssues: ThemeValidationIssue[];
    status: ThemeStatus;
    errorMessage: string | null;
  };
  ui: {
    chartDisplayMode: ChartDisplayMode;
    chartBreakdownEnabled: boolean;
    tableGranularity: TableGranularity;
    tableAssetColumnsEnabled: boolean;
    tableSpreadsheetMode: boolean;
    tableSort: { column: string; direction: 'asc' | 'desc' } | null;
    chartZoom: { start: number; end: number } | null;
    reforecastStatus: ReforecastStatus;
    collapsedSections: Record<string, boolean>;
    isSidebarCollapsed: boolean;
  };
};

export type AppStore = SnapshotState & {
  setMode: (mode: AppMode) => void;
  setCompareActiveSlot: (slot: CompareSlotId) => void;
  setCompareBaselineSlot: (slot: CompareSlotId) => void;
  addCompareSlotFromSource: (sourceSlotId: CompareSlotId) => void;
  removeCompareSlot: (slot: CompareSlotId) => void;
  toggleCompareFamilyLock: (family: CompareSyncFamilyKey) => void;
  toggleCompareInstanceLock: (family: CompareSyncListFamilyKey, instanceId: string) => void;
  setCompareSlotFamilySync: (
    slot: CompareSlotId,
    family: CompareSyncFamilyKey,
    synced: boolean,
  ) => void;
  setCompareSlotInstanceSync: (
    slot: CompareSlotId,
    family: CompareSyncListFamilyKey,
    instanceId: string,
    synced: boolean,
  ) => void;
  upsertActualOverride: (monthIndex: number, patch: Partial<ActualMonthOverride>) => void;
  clearActualRowOverrides: (monthIndex: number) => void;
  clearAllActualOverrides: () => void;
  setSimulationMode: (mode: SimulationMode) => void;
  setSelectedHistoricalEra: (era: HistoricalEra) => void;
  setHistoricalSummaryStatus: (
    status: 'idle' | 'loading' | 'ready' | 'error',
    errorMessage?: string | null,
  ) => void;
  setHistoricalSummary: (summary: HistoricalDataSummary) => void;
  setCoreParam: (
    key: keyof AppStore['coreParams'],
    value: number | { month: number; year: number },
  ) => void;
  setPortfolioValue: (asset: AssetClass, value: number) => void;
  setReturnAssumption: (asset: AssetClass, key: 'expectedReturn' | 'stdDev', value: number) => void;
  addSpendingPhase: () => void;
  removeSpendingPhase: (id: string) => void;
  updateSpendingPhase: (id: string, patch: Partial<SpendingPhaseForm>) => void;
  setWithdrawalStrategyType: (type: WithdrawalStrategyType) => void;
  setWithdrawalParam: (key: WithdrawalParamKey, value: WithdrawalStrategyParamsForm[WithdrawalParamKey]) => void;
  setDrawdownType: (type: DrawdownStrategyType) => void;
  moveBucketAsset: (asset: AssetClass, direction: 'up' | 'down') => void;
  setRebalancingTargetAllocation: (asset: AssetClass, value: number) => void;
  setGlidePathEnabled: (enabled: boolean) => void;
  addGlidePathWaypoint: () => void;
  removeGlidePathWaypoint: (year: number) => void;
  updateGlidePathWaypoint: (
    year: number,
    patch: Partial<{ year: number; allocation: { stocks: number; bonds: number; cash: number } }>,
  ) => void;
  addIncomeEvent: (preset?: 'socialSecurity' | 'pension' | 'rentalIncome') => void;
  removeIncomeEvent: (id: string) => void;
  updateIncomeEvent: (id: string, patch: Partial<IncomeEventForm>) => void;
  addExpenseEvent: (preset?: 'newRoof' | 'longTermCare' | 'gift') => void;
  removeExpenseEvent: (id: string) => void;
  updateExpenseEvent: (id: string, patch: Partial<ExpenseEventForm>) => void;
  setSimulationStatus: (status: RunStatus, errorMessage?: string | null) => void;
  setSimulationResult: (mode: SimulationMode, result: SimulateResponse) => void;
  setCompareSlotSimulationStatus: (
    slot: CompareSlotId,
    status: RunStatus,
    errorMessage?: string | null,
  ) => void;
  setCompareSlotSimulationResult: (
    slot: CompareSlotId,
    mode: SimulationMode,
    result: SimulateResponse,
  ) => void;
  setCompareSlotStressStatus: (
    slot: CompareSlotId,
    status: StressRunStatus,
    errorMessage?: string | null,
  ) => void;
  setCompareSlotStressResult: (slot: CompareSlotId, result: StressTestResult) => void;
  clearCompareSlotStressResult: (slot: CompareSlotId) => void;
  setReforecastResult: (result: SimulateResponse) => void;
  toggleStressPanel: () => void;
  addStressScenario: () => void;
  removeStressScenario: (id: string) => void;
  updateStressScenario: (id: string, scenario: StressScenario) => void;
  setStressStatus: (status: StressRunStatus, errorMessage?: string | null) => void;
  setStressResult: (result: StressTestResult) => void;
  clearStressResult: () => void;
  setChartDisplayMode: (mode: ChartDisplayMode) => void;
  setChartBreakdownEnabled: (enabled: boolean) => void;
  setChartZoom: (zoom: { start: number; end: number } | null) => void;
  setTableGranularity: (granularity: TableGranularity) => void;
  setTableAssetColumnsEnabled: (enabled: boolean) => void;
  setTableSpreadsheetMode: (enabled: boolean) => void;
  setTableSort: (sort: { column: string; direction: 'asc' | 'desc' } | null) => void;
  toggleSection: (id: string) => void;
  toggleSidebar: () => void;
  setStateFromSnapshot: (snapshotState: SnapshotState) => void;
  setThemeState: (payload: {
    selectedThemeFamilyId?: ThemeFamilyId;
    selectedAppearanceByFamily?: Record<ThemeFamilyId, ThemeAppearance>;
    defaultThemeFamilyId?: ThemeFamilyId;
    defaultAppearance?: ThemeAppearance;
    activeVariantId?: ThemeVariantId | null;
    variants?: ThemeDefinition[];
    families?: ThemeFamilyCatalogItem[];
    legacyDefaultThemeId?: ThemeId;
    legacyThemes?: ThemeDefinition[];
    legacyCatalog?: AppStore['theme']['legacyCatalog'];
    slotCatalog?: ThemeSlotCatalogItem[];
    validationIssues?: ThemeValidationIssue[];
    status?: ThemeStatus;
    errorMessage?: string | null;
  }) => void;
  setSelectedThemeFamilyId: (familyId: ThemeFamilyId) => void;
  setThemeAppearanceForFamily: (familyId: ThemeFamilyId, appearance: ThemeAppearance) => void;
};

const defaultPhase = (): SpendingPhaseForm => ({
  id: createId('phase'),
  name: 'Phase 1',
  startYear: 1,
  endYear: 30,
  minMonthlySpend: 6_000,
  maxMonthlySpend: 12_000,
});

const defaultIncomeEvent = (): IncomeEventForm => ({
  id: createId('income'),
  name: 'Income',
  amount: 2_500,
  depositTo: AssetClass.Cash,
  start: { month: 1, year: 2030 },
  end: 'endOfRetirement',
  frequency: 'monthly',
  inflationAdjusted: true,
});

const defaultExpenseEvent = (): ExpenseEventForm => ({
  id: createId('expense'),
  name: 'Expense',
  amount: 25_000,
  sourceFrom: 'follow-drawdown',
  start: { month: 1, year: 2030 },
  end: 'endOfRetirement',
  frequency: 'oneTime',
  inflationAdjusted: false,
});

const scenarioColorOrder = ['A', 'B', 'C', 'D'] as const;

const defaultStressScenario = (index = 0): StressScenario => ({
  id: createId('stress'),
  label: `Scenario ${scenarioColorOrder[index] ?? String.fromCharCode(65 + index)}`,
  type: 'stockCrash',
  startYear: 1,
  params: { dropPct: -0.3 },
});

const incomeEventPreset = (
  preset: 'socialSecurity' | 'pension' | 'rentalIncome',
): Pick<IncomeEventForm, 'name' | 'amount' | 'depositTo' | 'frequency' | 'inflationAdjusted'> => {
  switch (preset) {
    case 'socialSecurity':
      return {
        name: 'Social Security',
        amount: 2_500,
        depositTo: AssetClass.Cash,
        frequency: 'monthly',
        inflationAdjusted: true,
      };
    case 'pension':
      return {
        name: 'Pension',
        amount: 1_800,
        depositTo: AssetClass.Cash,
        frequency: 'monthly',
        inflationAdjusted: false,
      };
    case 'rentalIncome':
      return {
        name: 'Rental Income',
        amount: 1_500,
        depositTo: AssetClass.Cash,
        frequency: 'monthly',
        inflationAdjusted: true,
      };
  }
};

const expenseEventPreset = (
  preset: 'newRoof' | 'longTermCare' | 'gift',
): Pick<ExpenseEventForm, 'name' | 'amount' | 'sourceFrom' | 'frequency' | 'inflationAdjusted'> => {
  switch (preset) {
    case 'newRoof':
      return {
        name: 'New Roof',
        amount: 35_000,
        sourceFrom: 'follow-drawdown',
        frequency: 'oneTime',
        inflationAdjusted: false,
      };
    case 'longTermCare':
      return {
        name: 'Long-Term Care',
        amount: 4_000,
        sourceFrom: 'follow-drawdown',
        frequency: 'monthly',
        inflationAdjusted: true,
      };
    case 'gift':
      return {
        name: 'Family Gift',
        amount: 50_000,
        sourceFrom: AssetClass.Bonds,
        frequency: 'oneTime',
        inflationAdjusted: false,
      };
  }
};

const normalizeAllocation = (allocation: { stocks: number; bonds: number; cash: number }) => {
  const total = allocation.stocks + allocation.bonds + allocation.cash;
  if (total <= 0) {
    return { stocks: 0, bonds: 0, cash: 0 };
  }
  return {
    stocks: allocation.stocks / total,
    bonds: allocation.bonds / total,
    cash: allocation.cash / total,
  };
};

const createDefaultGlidePath = (
  retirementDuration: number,
  target: { stocks: number; bonds: number; cash: number },
) => {
  const endingStocks = Math.max(0, target.stocks - 0.2);
  const endingBonds = target.bonds + 0.1;
  const endingCash = target.cash + 0.1;
  const ending = normalizeAllocation({
    stocks: endingStocks,
    bonds: endingBonds,
    cash: endingCash,
  });
  return [
    { year: 1, allocation: normalizeAllocation(target) },
    { year: retirementDuration, allocation: ending },
  ];
};

const resolveFirstPhaseStartYear = (startingAge: number, withdrawalsStartAt: number): number =>
  Math.max(1, withdrawalsStartAt - startingAge);

const defaultWithdrawalStrategyParams = (): WithdrawalStrategyParamsForm => ({
  initialWithdrawalRate: 0.04,
  annualWithdrawalRate: 0.04,
  expectedRealReturn: 0.03,
  drawdownTarget: 1,
  expectedRateOfReturn: 0.06,
  fallbackExpectedRateOfReturn: 0.06,
  lookbackMonths: 12,
  smoothingEnabled: true,
  smoothingBlend: 0.7,
  baseWithdrawalRate: 0.03,
  extrasWithdrawalRate: 0.1,
  minimumFloor: 0.95,
  capitalPreservationTrigger: 0.2,
  capitalPreservationCut: 0.1,
  prosperityTrigger: 0.2,
  prosperityRaise: 0.1,
  guardrailsSunset: 15,
  ceiling: 0.05,
  floor: 0.025,
  spendingRate: 0.05,
  smoothingWeight: 0.7,
  pmtExpectedReturn: 0.03,
  priorYearWeight: 0.6,
  capeWeight: 0.5,
  startingCape: 20,
});

const normalizeWithdrawalStrategyParams = (
  params: Partial<WithdrawalStrategyParamsForm> | undefined,
): WithdrawalStrategyParamsForm => {
  const defaults = defaultWithdrawalStrategyParams();
  const merged = { ...defaults, ...(params ?? {}) };
  return {
    ...merged,
    lookbackMonths: Math.round(merged.lookbackMonths),
    guardrailsSunset: Math.round(merged.guardrailsSunset),
    smoothingEnabled: typeof merged.smoothingEnabled === 'boolean' ? merged.smoothingEnabled : defaults.smoothingEnabled,
    smoothingBlend: Math.max(0, Math.min(0.95, Number.isFinite(merged.smoothingBlend) ? merged.smoothingBlend : defaults.smoothingBlend)),
  };
};

const resolveWithdrawalStrategyConfig = (
  type: WithdrawalStrategyType,
  params: WithdrawalStrategyParamsForm,
): WithdrawalStrategyConfig => {
  switch (type) {
    case WithdrawalStrategyType.ConstantDollar:
      return { type, params: { initialWithdrawalRate: params.initialWithdrawalRate } };
    case WithdrawalStrategyType.PercentOfPortfolio:
      return { type, params: { annualWithdrawalRate: params.annualWithdrawalRate } };
    case WithdrawalStrategyType.OneOverN:
      return { type, params: {} };
    case WithdrawalStrategyType.Vpw:
      return {
        type,
        params: {
          expectedRealReturn: params.expectedRealReturn,
          drawdownTarget: params.drawdownTarget,
        },
      };
    case WithdrawalStrategyType.DynamicSwr:
      return { type, params: { expectedRateOfReturn: params.expectedRateOfReturn } };
    case WithdrawalStrategyType.DynamicSwrAdaptive:
      return {
        type,
        params: {
          fallbackExpectedRateOfReturn: params.fallbackExpectedRateOfReturn ?? 0.06,
          lookbackMonths: Math.round(params.lookbackMonths ?? 12),
          smoothingEnabled: params.smoothingEnabled ?? true,
          smoothingBlend: Math.max(0, Math.min(0.95, params.smoothingBlend ?? 0.7)),
        },
      };
    case WithdrawalStrategyType.SensibleWithdrawals:
      return {
        type,
        params: {
          baseWithdrawalRate: params.baseWithdrawalRate,
          extrasWithdrawalRate: params.extrasWithdrawalRate,
        },
      };
    case WithdrawalStrategyType.NinetyFivePercent:
      return {
        type,
        params: {
          annualWithdrawalRate: params.annualWithdrawalRate,
          minimumFloor: params.minimumFloor,
        },
      };
    case WithdrawalStrategyType.GuytonKlinger:
      return {
        type,
        params: {
          initialWithdrawalRate: params.initialWithdrawalRate,
          capitalPreservationTrigger: params.capitalPreservationTrigger,
          capitalPreservationCut: params.capitalPreservationCut,
          prosperityTrigger: params.prosperityTrigger,
          prosperityRaise: params.prosperityRaise,
          guardrailsSunset: Math.round(params.guardrailsSunset),
        },
      };
    case WithdrawalStrategyType.VanguardDynamic:
      return {
        type,
        params: {
          annualWithdrawalRate: params.annualWithdrawalRate,
          ceiling: params.ceiling,
          floor: params.floor,
        },
      };
    case WithdrawalStrategyType.Endowment:
      return {
        type,
        params: {
          spendingRate: params.spendingRate,
          smoothingWeight: params.smoothingWeight,
        },
      };
    case WithdrawalStrategyType.HebelerAutopilot:
      return {
        type,
        params: {
          initialWithdrawalRate: params.initialWithdrawalRate,
          pmtExpectedReturn: params.pmtExpectedReturn,
          priorYearWeight: params.priorYearWeight,
        },
      };
    case WithdrawalStrategyType.CapeBased:
      return {
        type,
        params: {
          baseWithdrawalRate: params.baseWithdrawalRate,
          capeWeight: params.capeWeight,
          startingCape: params.startingCape,
        },
      };
  }
};

const recalculatePhaseBoundaries = (
  phases: SpendingPhaseForm[],
  retirementYears: number,
  firstPhaseStartYear: number,
): SpendingPhaseForm[] => {
  const sorted = [...phases].sort((a, b) => a.startYear - b.startYear);
  const clampedFirstStartYear = Math.min(Math.max(1, firstPhaseStartYear), retirementYears);
  const recalculated: SpendingPhaseForm[] = [];

  sorted.forEach((phase, index) => {
    const isLast = index === sorted.length - 1;
    const previousEndYear = recalculated[index - 1]?.endYear;
    const startYear =
      index === 0 ? clampedFirstStartYear : (previousEndYear ?? clampedFirstStartYear) + 1;
    const remainingPhases = sorted.length - index - 1;
    const latestEndForCurrent = Math.max(startYear, retirementYears - remainingPhases);
    const endYear = isLast
      ? retirementYears
      : Math.min(Math.max(phase.endYear, startYear), latestEndForCurrent);

    recalculated.push({ ...phase, startYear, endYear });
  });

  return recalculated;
};

const cloneWorkspace = (workspace: WorkspaceSnapshot): WorkspaceSnapshot => ({
  ...workspace,
  coreParams: {
    ...workspace.coreParams,
    retirementStartDate: { ...workspace.coreParams.retirementStartDate },
  },
  portfolio: { ...workspace.portfolio },
  returnAssumptions: {
    stocks: { ...workspace.returnAssumptions.stocks },
    bonds: { ...workspace.returnAssumptions.bonds },
    cash: { ...workspace.returnAssumptions.cash },
  },
  spendingPhases: workspace.spendingPhases.map((phase) => ({ ...phase })),
  withdrawalStrategy: {
    ...workspace.withdrawalStrategy,
    params: normalizeWithdrawalStrategyParams(workspace.withdrawalStrategy.params),
  },
  drawdownStrategy: {
    ...workspace.drawdownStrategy,
    bucketOrder: [...workspace.drawdownStrategy.bucketOrder],
    rebalancing: {
      ...workspace.drawdownStrategy.rebalancing,
      targetAllocation: { ...workspace.drawdownStrategy.rebalancing.targetAllocation },
      glidePath: workspace.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
        year: waypoint.year,
        allocation: { ...waypoint.allocation },
      })),
    },
  },
  historicalData: {
    ...workspace.historicalData,
    summary: workspace.historicalData.summary
      ? {
          ...workspace.historicalData.summary,
          selectedEra: { ...workspace.historicalData.summary.selectedEra },
          eras: workspace.historicalData.summary.eras.map((era) => ({ ...era })),
          byAsset: {
            stocks: { ...workspace.historicalData.summary.byAsset.stocks },
            bonds: { ...workspace.historicalData.summary.byAsset.bonds },
            cash: { ...workspace.historicalData.summary.byAsset.cash },
          },
        }
      : null,
  },
  incomeEvents: workspace.incomeEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  expenseEvents: workspace.expenseEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  actualOverridesByMonth: Object.fromEntries(
    Object.entries(workspace.actualOverridesByMonth).map(([month, value]) => [
      month,
      {
        startBalances: value.startBalances ? { ...value.startBalances } : undefined,
        withdrawalsByAsset: value.withdrawalsByAsset ? { ...value.withdrawalsByAsset } : undefined,
        incomeTotal: value.incomeTotal,
        expenseTotal: value.expenseTotal,
      },
    ]),
  ),
  simulationResults: { ...workspace.simulationResults },
  stress: {
    ...workspace.stress,
    scenarios: workspace.stress.scenarios.map((scenario) => ({ ...scenario })) as StressScenario[],
    result: workspace.stress.result
      ? {
          ...workspace.stress.result,
          base: { ...workspace.stress.result.base },
          scenarios: workspace.stress.result.scenarios.map((scenario) => ({ ...scenario })),
          timingSensitivity: workspace.stress.result.timingSensitivity?.map((series) => ({
            ...series,
            points: series.points.map((point) => ({ ...point })),
          })),
        }
      : null,
  },
});

const createCompareSyncSlotOverrides = (): CompareSyncSlotOverrides => ({
  families: {},
  instances: {
    spendingPhases: {},
    incomeEvents: {},
    expenseEvents: {},
  },
});

const getSpendingPhaseLockPrefixIds = (
  phases: SpendingPhaseForm[],
  locks: Record<string, boolean>,
): string[] => {
  const prefix: string[] = [];
  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];
    if (!phase) {
      break;
    }
    if (locks[phase.id] === true) {
      prefix.push(phase.id);
      continue;
    }
    break;
  }
  return prefix;
};

const normalizeSpendingPhaseInstanceLocks = (
  compareSync: CompareSyncState,
  masterPhases: SpendingPhaseForm[],
  slotOrder: CompareSlotId[],
): void => {
  const prefixIds = new Set(
    getSpendingPhaseLockPrefixIds(masterPhases, compareSync.instanceLocks.spendingPhases),
  );
  Object.keys(compareSync.instanceLocks.spendingPhases).forEach((instanceId) => {
    if (!prefixIds.has(instanceId)) {
      delete compareSync.instanceLocks.spendingPhases[instanceId];
    }
  });

  slotOrder.forEach((slotId) => {
    if (slotId === 'A') {
      return;
    }
    const overrides = compareSync.unsyncedBySlot[slotId];
    if (!overrides) {
      return;
    }
    Object.keys(overrides.instances.spendingPhases).forEach((instanceId) => {
      if (!prefixIds.has(instanceId)) {
        delete overrides.instances.spendingPhases[instanceId];
      }
    });
  });
};

const isSpendingPhaseLockEligible = (
  instanceId: string,
  masterPhases: SpendingPhaseForm[],
  locks: Record<string, boolean>,
): boolean => {
  const index = masterPhases.findIndex((phase) => phase.id === instanceId);
  if (index < 0) {
    return false;
  }
  if (index === 0) {
    return true;
  }
  const previous = masterPhases[index - 1];
  return previous ? locks[previous.id] === true : false;
};

const defaultCompareSyncState = (): CompareSyncState => ({
  familyLocks: {
    coreParams: false,
    startingPortfolio: false,
    returnAssumptions: false,
    spendingPhases: false,
    withdrawalStrategy: false,
    drawdownStrategy: false,
    incomeEvents: false,
    expenseEvents: false,
    historicalEra: false,
  },
  instanceLocks: {
    spendingPhases: {},
    incomeEvents: {},
    expenseEvents: {},
  },
  unsyncedBySlot: {},
});

const cloneCompareSyncState = (compareSync: CompareSyncState): CompareSyncState => ({
  familyLocks: { ...compareSync.familyLocks },
  instanceLocks: {
    spendingPhases: { ...compareSync.instanceLocks.spendingPhases },
    incomeEvents: { ...compareSync.instanceLocks.incomeEvents },
    expenseEvents: { ...compareSync.instanceLocks.expenseEvents },
  },
  unsyncedBySlot: Object.fromEntries(
    Object.entries(compareSync.unsyncedBySlot).map(([slotId, overrides]) => [
      slotId,
      {
        families: { ...(overrides?.families ?? {}) },
        instances: {
          spendingPhases: { ...(overrides?.instances.spendingPhases ?? {}) },
          incomeEvents: { ...(overrides?.instances.incomeEvents ?? {}) },
          expenseEvents: { ...(overrides?.instances.expenseEvents ?? {}) },
        },
      } satisfies CompareSyncSlotOverrides,
    ]),
  ) as Partial<Record<CompareSlotId, CompareSyncSlotOverrides>>,
});

const isSlotFamilySynced = (
  compareSync: CompareSyncState,
  slotId: CompareSlotId,
  family: CompareSyncFamilyKey,
): boolean => {
  if (slotId === 'A') {
    return true;
  }
  return compareSync.unsyncedBySlot[slotId]?.families[family] !== true;
};

const isSlotInstanceSynced = (
  compareSync: CompareSyncState,
  slotId: CompareSlotId,
  family: CompareSyncListFamilyKey,
  instanceId: string,
): boolean => {
  if (slotId === 'A') {
    return true;
  }
  return compareSync.unsyncedBySlot[slotId]?.instances[family][instanceId] !== true;
};

const upsertSpendingPhaseById = (
  list: SpendingPhaseForm[],
  phase: SpendingPhaseForm,
): SpendingPhaseForm[] => {
  const index = list.findIndex((entry) => entry.id === phase.id);
  if (index < 0) {
    return [...list, { ...phase }];
  }
  const next = [...list];
  next[index] = { ...phase };
  return next;
};

const upsertIncomeEventById = (
  list: IncomeEventForm[],
  event: IncomeEventForm,
): IncomeEventForm[] => {
  const index = list.findIndex((entry) => entry.id === event.id);
  if (index < 0) {
    return [
      ...list,
      {
        ...event,
        start: { ...event.start },
        end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
      },
    ];
  }
  const next = [...list];
  next[index] = {
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  };
  return next;
};

const upsertExpenseEventById = (
  list: ExpenseEventForm[],
  event: ExpenseEventForm,
): ExpenseEventForm[] => {
  const index = list.findIndex((entry) => entry.id === event.id);
  if (index < 0) {
    return [
      ...list,
      {
        ...event,
        start: { ...event.start },
        end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
      },
    ];
  }
  const next = [...list];
  next[index] = {
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  };
  return next;
};

const applyCompareSyncFromMaster = (
  compareWorkspace: SnapshotState['compareWorkspace'],
): SnapshotState['compareWorkspace'] => {
  const master = compareWorkspace.slots.A;
  if (!master) {
    return compareWorkspace;
  }

  const next = cloneCompareWorkspace(compareWorkspace);
  const compareSync = next.compareSync;
  normalizeSpendingPhaseInstanceLocks(compareSync, master.spendingPhases, next.slotOrder);

  const masterIdsByFamily: Record<CompareSyncListFamilyKey, Set<string>> = {
    spendingPhases: new Set(master.spendingPhases.map((phase) => phase.id)),
    incomeEvents: new Set(master.incomeEvents.map((event) => event.id)),
    expenseEvents: new Set(master.expenseEvents.map((event) => event.id)),
  };

  next.slotOrder.forEach((slotId) => {
    if (slotId === 'A') {
      return;
    }
    const workspace = next.slots[slotId];
    if (!workspace) {
      return;
    }

    COMPARE_SYNC_FAMILIES.forEach((family) => {
      if (!compareSync.familyLocks[family] || !isSlotFamilySynced(compareSync, slotId, family)) {
        return;
      }

      switch (family) {
        case 'coreParams':
          workspace.coreParams = {
            ...master.coreParams,
            retirementStartDate: { ...master.coreParams.retirementStartDate },
          };
          break;
        case 'startingPortfolio':
          workspace.portfolio = { ...master.portfolio };
          break;
        case 'returnAssumptions':
          workspace.returnAssumptions = {
            stocks: { ...master.returnAssumptions.stocks },
            bonds: { ...master.returnAssumptions.bonds },
            cash: { ...master.returnAssumptions.cash },
          };
          break;
        case 'spendingPhases':
          workspace.spendingPhases = master.spendingPhases.map((phase) => ({ ...phase }));
          break;
        case 'withdrawalStrategy':
          workspace.withdrawalStrategy = {
            ...master.withdrawalStrategy,
            params: { ...master.withdrawalStrategy.params },
          };
          break;
        case 'drawdownStrategy':
          workspace.drawdownStrategy = {
            ...master.drawdownStrategy,
            bucketOrder: [...master.drawdownStrategy.bucketOrder],
            rebalancing: {
              ...master.drawdownStrategy.rebalancing,
              targetAllocation: { ...master.drawdownStrategy.rebalancing.targetAllocation },
              glidePath: master.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
                year: waypoint.year,
                allocation: { ...waypoint.allocation },
              })),
            },
          };
          break;
        case 'incomeEvents':
          workspace.incomeEvents = master.incomeEvents.map((event) => ({
            ...event,
            start: { ...event.start },
            end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
          }));
          break;
        case 'expenseEvents':
          workspace.expenseEvents = master.expenseEvents.map((event) => ({
            ...event,
            start: { ...event.start },
            end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
          }));
          break;
        case 'historicalEra':
          workspace.selectedHistoricalEra = master.selectedHistoricalEra;
          break;
        default:
          break;
      }
    });

    if (
      !compareSync.familyLocks.spendingPhases ||
      !isSlotFamilySynced(compareSync, slotId, 'spendingPhases')
    ) {
      Object.keys(compareSync.instanceLocks.spendingPhases).forEach((instanceId) => {
        if (!isSlotInstanceSynced(compareSync, slotId, 'spendingPhases', instanceId)) {
          return;
        }
        const masterPhase = master.spendingPhases.find((entry) => entry.id === instanceId);
        if (!masterPhase) {
          workspace.spendingPhases = workspace.spendingPhases.filter(
            (entry) => entry.id !== instanceId,
          );
          return;
        }
        workspace.spendingPhases = upsertSpendingPhaseById(workspace.spendingPhases, masterPhase);
      });
    }

    if (
      !compareSync.familyLocks.incomeEvents ||
      !isSlotFamilySynced(compareSync, slotId, 'incomeEvents')
    ) {
      Object.keys(compareSync.instanceLocks.incomeEvents).forEach((instanceId) => {
        if (!isSlotInstanceSynced(compareSync, slotId, 'incomeEvents', instanceId)) {
          return;
        }
        const masterEvent = master.incomeEvents.find((entry) => entry.id === instanceId);
        if (!masterEvent) {
          workspace.incomeEvents = workspace.incomeEvents.filter(
            (entry) => entry.id !== instanceId,
          );
          return;
        }
        workspace.incomeEvents = upsertIncomeEventById(workspace.incomeEvents, masterEvent);
      });
    }

    if (
      !compareSync.familyLocks.expenseEvents ||
      !isSlotFamilySynced(compareSync, slotId, 'expenseEvents')
    ) {
      Object.keys(compareSync.instanceLocks.expenseEvents).forEach((instanceId) => {
        if (!isSlotInstanceSynced(compareSync, slotId, 'expenseEvents', instanceId)) {
          return;
        }
        const masterEvent = master.expenseEvents.find((entry) => entry.id === instanceId);
        if (!masterEvent) {
          workspace.expenseEvents = workspace.expenseEvents.filter(
            (entry) => entry.id !== instanceId,
          );
          return;
        }
        workspace.expenseEvents = upsertExpenseEventById(workspace.expenseEvents, masterEvent);
      });
    }
  });

  COMPARE_SYNC_LIST_FAMILIES.forEach((family) => {
    Object.keys(compareSync.instanceLocks[family]).forEach((instanceId) => {
      if (!masterIdsByFamily[family].has(instanceId)) {
        delete compareSync.instanceLocks[family][instanceId];
      }
    });
  });
  normalizeSpendingPhaseInstanceLocks(compareSync, master.spendingPhases, next.slotOrder);

  return next;
};

const cloneCompareWorkspace = (
  compareWorkspace: SnapshotState['compareWorkspace'],
): SnapshotState['compareWorkspace'] => ({
  activeSlotId: compareWorkspace.activeSlotId,
  baselineSlotId: compareWorkspace.baselineSlotId,
  slotOrder: [...compareWorkspace.slotOrder],
  compareSync: cloneCompareSyncState(compareWorkspace.compareSync),
  slots: Object.fromEntries(
    Object.entries(compareWorkspace.slots).map(([slotId, workspace]) => [
      slotId,
      workspace ? cloneWorkspace(workspace) : workspace,
    ]),
  ),
});

const sortCompareSlotOrder = (slotOrder: CompareSlotId[]): CompareSlotId[] =>
  [...slotOrder].sort(
    (left, right) => COMPARE_SLOT_IDS.indexOf(left) - COMPARE_SLOT_IDS.indexOf(right),
  );

const isCompareActiveFromWorkspace = (
  compareWorkspace: SnapshotState['compareWorkspace'],
): boolean => compareWorkspace.slotOrder.length > 1;

const cloneActualOverride = (override: ActualMonthOverride): ActualMonthOverride => ({
  startBalances: override.startBalances ? { ...override.startBalances } : undefined,
  withdrawalsByAsset: override.withdrawalsByAsset ? { ...override.withdrawalsByAsset } : undefined,
  incomeTotal: override.incomeTotal,
  expenseTotal: override.expenseTotal,
});

const normalizeTrackingCompareCanonicalFloor = (
  compareWorkspace: SnapshotState['compareWorkspace'],
): SnapshotState['compareWorkspace'] => {
  const canonicalWorkspace = compareWorkspace.slots.A;
  if (!canonicalWorkspace) {
    return compareWorkspace;
  }
  const canonicalOverrides = sanitizeTrackingActualOverrides(
    canonicalWorkspace.actualOverridesByMonth ?? {},
  );
  const canonicalMaxMonth = Object.keys(canonicalOverrides)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .reduce((max, value) => Math.max(max, value), 0);
  const canonicalBoundary =
    canonicalWorkspace.lastEditedMonthIndex ?? (canonicalMaxMonth > 0 ? canonicalMaxMonth : null);

  const next = cloneCompareWorkspace(compareWorkspace);
  const nextCanonicalWorkspace = next.slots.A;
  if (nextCanonicalWorkspace) {
    nextCanonicalWorkspace.actualOverridesByMonth = Object.fromEntries(
      Object.entries(canonicalOverrides).map(([month, override]) => [
        Number(month),
        cloneActualOverride(override),
      ]),
    ) as ActualOverridesByMonth;
    nextCanonicalWorkspace.lastEditedMonthIndex = canonicalBoundary;
  }

  next.slotOrder.forEach((slotId) => {
    if (slotId === 'A') {
      return;
    }
    const workspace = next.slots[slotId];
    if (!workspace) {
      return;
    }
    workspace.actualOverridesByMonth = Object.fromEntries(
      Object.entries(canonicalOverrides).map(([month, override]) => [
        Number(month),
        cloneActualOverride(override),
      ]),
    ) as ActualOverridesByMonth;
    workspace.lastEditedMonthIndex = canonicalBoundary;
  });

  return next;
};

const normalizeCompareWorkspace = (
  compareWorkspace: SnapshotState['compareWorkspace'],
): SnapshotState['compareWorkspace'] => {
  const normalizedSlots = Object.fromEntries(
    Object.entries(compareWorkspace.slots).filter(([, workspace]) => workspace),
  ) as SnapshotState['compareWorkspace']['slots'];
  const normalizedOrder = sortCompareSlotOrder(
    compareWorkspace.slotOrder.filter((slotId) => Boolean(normalizedSlots[slotId])),
  );
  const fallbackOrder: CompareSlotId[] = normalizedOrder.length >= 1 ? normalizedOrder : ['A'];
  const activeSlotId = fallbackOrder.includes(compareWorkspace.activeSlotId)
    ? compareWorkspace.activeSlotId
    : (fallbackOrder[0] ?? 'A');
  const baselineSlotId = fallbackOrder.includes(compareWorkspace.baselineSlotId)
    ? compareWorkspace.baselineSlotId
    : (fallbackOrder[0] ?? 'A');
  const compareSync = cloneCompareSyncState(
    compareWorkspace.compareSync ?? defaultCompareSyncState(),
  );
  Object.keys(compareSync.unsyncedBySlot).forEach((slotId) => {
    if (slotId === 'A' || !fallbackOrder.includes(slotId as CompareSlotId)) {
      delete compareSync.unsyncedBySlot[slotId as CompareSlotId];
    }
  });
  return {
    activeSlotId,
    baselineSlotId,
    slotOrder: fallbackOrder,
    compareSync,
    slots: normalizedSlots,
  };
};

const compareWorkspaceWithCurrentState = (state: AppStore): SnapshotState['compareWorkspace'] => {
  const compareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
  if (!isCompareActiveFromWorkspace(compareWorkspace)) {
    return compareWorkspace;
  }
  const currentWorkspace = cloneWorkspace(workspaceFromState(state));
  compareWorkspace.slots[compareWorkspace.activeSlotId] = currentWorkspace;
  if (!compareWorkspace.slotOrder.includes(compareWorkspace.activeSlotId)) {
    compareWorkspace.slotOrder = [...compareWorkspace.slotOrder, compareWorkspace.activeSlotId];
  }
  const normalized = applyCompareSyncFromMaster(normalizeCompareWorkspace(compareWorkspace));
  return state.mode === AppMode.Tracking
    ? normalizeTrackingCompareCanonicalFloor(normalized)
    : normalized;
};

const workspaceFromState = (state: AppStore): WorkspaceSnapshot => ({
  simulationMode: state.simulationMode,
  selectedHistoricalEra: state.selectedHistoricalEra,
  coreParams: {
    ...state.coreParams,
    retirementStartDate: { ...state.coreParams.retirementStartDate },
  },
  portfolio: { ...state.portfolio },
  returnAssumptions: {
    stocks: { ...state.returnAssumptions.stocks },
    bonds: { ...state.returnAssumptions.bonds },
    cash: { ...state.returnAssumptions.cash },
  },
  spendingPhases: state.spendingPhases.map((phase) => ({ ...phase })),
  withdrawalStrategy: {
    ...state.withdrawalStrategy,
    params: normalizeWithdrawalStrategyParams(state.withdrawalStrategy.params),
  },
  drawdownStrategy: {
    ...state.drawdownStrategy,
    bucketOrder: [...state.drawdownStrategy.bucketOrder],
    rebalancing: {
      ...state.drawdownStrategy.rebalancing,
      targetAllocation: { ...state.drawdownStrategy.rebalancing.targetAllocation },
      glidePath: state.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
        year: waypoint.year,
        allocation: { ...waypoint.allocation },
      })),
    },
  },
  historicalData: state.historicalData,
  incomeEvents: state.incomeEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  expenseEvents: state.expenseEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  actualOverridesByMonth: state.actualOverridesByMonth,
  lastEditedMonthIndex: state.lastEditedMonthIndex,
  simulationResults: { ...state.simulationResults },
  stress: {
    ...state.stress,
    scenarios: state.stress.scenarios.map((scenario) => ({ ...scenario })) as StressScenario[],
    result: state.stress.result,
  },
});

const isTrackingCompareActive = (state: Pick<AppStore, 'mode' | 'compareWorkspace'>): boolean =>
  state.mode === AppMode.Tracking && isCompareActiveFromWorkspace(state.compareWorkspace);

const markAllCompareSlotsTrackingStale = (
  compareWorkspace: SnapshotState['compareWorkspace'],
): SnapshotState['compareWorkspace'] => {
  const next = cloneCompareWorkspace(compareWorkspace);
  next.slotOrder.forEach((slotId) => {
    const workspace = next.slots[slotId];
    if (!workspace) {
      return;
    }
    workspace.simulationResults = {
      ...workspace.simulationResults,
      mcStale: true,
    };
  });
  return next;
};

const markTrackingOutputStateStale = (
  state: AppStore,
  nextCompareWorkspace: SnapshotState['compareWorkspace'] | null = null,
): Pick<AppStore, 'simulationResults' | 'compareWorkspace'> => {
  if (state.mode !== AppMode.Tracking) {
    return {
      simulationResults: state.simulationResults,
      compareWorkspace: nextCompareWorkspace ?? state.compareWorkspace,
    };
  }

  const compareWorkspace = nextCompareWorkspace ?? state.compareWorkspace;
  const staleCompareWorkspace = isCompareActiveFromWorkspace(compareWorkspace)
    ? markAllCompareSlotsTrackingStale(compareWorkspace)
    : compareWorkspace;

  return {
    simulationResults: {
      ...state.simulationResults,
      mcStale: true,
    },
    compareWorkspace: staleCompareWorkspace,
  };
};

const getEditableTrackingMonthUpperBoundForState = (state: AppStore): number => {
  const horizonMonths = Math.max(0, Math.round(state.coreParams.retirementDuration) * 12);
  if (horizonMonths === 0) {
    return 0;
  }
  return Math.max(1, Math.min(horizonMonths, (state.lastEditedMonthIndex ?? 0) + 1));
};

const isEditableTrackingMonthForState = (state: AppStore, monthIndex: number): boolean => {
  if (!Number.isInteger(monthIndex) || monthIndex <= 0) {
    return false;
  }
  return monthIndex <= getEditableTrackingMonthUpperBoundForState(state);
};

const trackingSimulationResultsCleared = (
  results: WorkspaceSnapshot['simulationResults'],
): WorkspaceSnapshot['simulationResults'] => ({
  ...results,
  manual: null,
  monteCarlo: null,
  reforecast: null,
  mcStale: false,
  status: 'idle',
  errorMessage: null,
});

const snapshotFieldsFromWorkspace = (workspace: WorkspaceSnapshot) => ({
  simulationMode: workspace.simulationMode,
  selectedHistoricalEra: workspace.selectedHistoricalEra,
  coreParams: workspace.coreParams,
  portfolio: workspace.portfolio,
  returnAssumptions: workspace.returnAssumptions,
  spendingPhases: workspace.spendingPhases,
  withdrawalStrategy: workspace.withdrawalStrategy,
  drawdownStrategy: workspace.drawdownStrategy,
  historicalData: workspace.historicalData,
  incomeEvents: workspace.incomeEvents,
  expenseEvents: workspace.expenseEvents,
  actualOverridesByMonth: workspace.actualOverridesByMonth,
  lastEditedMonthIndex: workspace.lastEditedMonthIndex,
  simulationResults: workspace.simulationResults,
  stress: workspace.stress,
});

const currentInputFieldsFromState = (state: AppStore) => ({
  selectedHistoricalEra: state.selectedHistoricalEra,
  coreParams: {
    ...state.coreParams,
    retirementStartDate: { ...state.coreParams.retirementStartDate },
  },
  portfolio: { ...state.portfolio },
  returnAssumptions: {
    stocks: { ...state.returnAssumptions.stocks },
    bonds: { ...state.returnAssumptions.bonds },
    cash: { ...state.returnAssumptions.cash },
  },
  spendingPhases: state.spendingPhases.map((phase) => ({ ...phase })),
  withdrawalStrategy: {
    ...state.withdrawalStrategy,
    params: { ...state.withdrawalStrategy.params },
  },
  drawdownStrategy: {
    ...state.drawdownStrategy,
    bucketOrder: [...state.drawdownStrategy.bucketOrder],
    rebalancing: {
      ...state.drawdownStrategy.rebalancing,
      targetAllocation: { ...state.drawdownStrategy.rebalancing.targetAllocation },
      glidePath: state.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
        year: waypoint.year,
        allocation: { ...waypoint.allocation },
      })),
    },
  },
  historicalData: {
    ...state.historicalData,
    summary: state.historicalData.summary
      ? {
          ...state.historicalData.summary,
          selectedEra: { ...state.historicalData.summary.selectedEra },
          eras: state.historicalData.summary.eras.map((era) => ({ ...era })),
          byAsset: {
            stocks: { ...state.historicalData.summary.byAsset.stocks },
            bonds: { ...state.historicalData.summary.byAsset.bonds },
            cash: { ...state.historicalData.summary.byAsset.cash },
          },
        }
      : null,
  },
  incomeEvents: state.incomeEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  expenseEvents: state.expenseEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  actualOverridesByMonth: Object.fromEntries(
    Object.entries(state.actualOverridesByMonth).map(([month, value]) => [
      month,
      {
        startBalances: value.startBalances ? { ...value.startBalances } : undefined,
        withdrawalsByAsset: value.withdrawalsByAsset ? { ...value.withdrawalsByAsset } : undefined,
        incomeTotal: value.incomeTotal,
        expenseTotal: value.expenseTotal,
      },
    ]),
  ),
  lastEditedMonthIndex: state.lastEditedMonthIndex,
});

const isCompareFamilyLockedAndSyncedForActiveSlot = (
  state: Pick<AppStore, 'compareWorkspace'>,
  family: CompareSyncFamilyKey,
): boolean => {
  const { activeSlotId, compareSync } = state.compareWorkspace;
  if (activeSlotId === 'A') {
    return false;
  }
  if (!compareSync.familyLocks[family]) {
    return false;
  }
  return isSlotFamilySynced(compareSync, activeSlotId, family);
};

const isCompareInstanceLockedAndSyncedForActiveSlot = (
  state: Pick<AppStore, 'compareWorkspace'>,
  family: CompareSyncListFamilyKey,
  instanceId: string,
): boolean => {
  if (isCompareFamilyLockedAndSyncedForActiveSlot(state, family)) {
    return true;
  }
  const { activeSlotId, compareSync } = state.compareWorkspace;
  if (activeSlotId === 'A') {
    return false;
  }
  if (!compareSync.instanceLocks[family][instanceId]) {
    return false;
  }
  return isSlotInstanceSynced(compareSync, activeSlotId, family, instanceId);
};

const cloneSnapshotState = (snapshot: SnapshotState): SnapshotState => {
  const normalizedSnapshot = snapshot;
  const syncedCompareWorkspace = applyCompareSyncFromMaster(
    normalizeCompareWorkspace(cloneCompareWorkspace(normalizedSnapshot.compareWorkspace)),
  );
  const normalizedCompareWorkspace =
    normalizedSnapshot.mode === AppMode.Tracking
      ? normalizeTrackingCompareCanonicalFloor(syncedCompareWorkspace)
      : syncedCompareWorkspace;
  const normalizedActiveWorkspace =
    normalizedCompareWorkspace.slots[normalizedCompareWorkspace.activeSlotId];

  return {
    mode: normalizedSnapshot.mode,
    trackingInitialized: normalizedSnapshot.trackingInitialized,
    planningWorkspace: normalizedSnapshot.planningWorkspace
      ? cloneWorkspace(normalizedSnapshot.planningWorkspace)
      : null,
    trackingWorkspace: normalizedSnapshot.trackingWorkspace
      ? cloneWorkspace(normalizedSnapshot.trackingWorkspace)
      : null,
    compareWorkspace: normalizedCompareWorkspace,
    simulationMode: normalizedSnapshot.simulationMode,
    selectedHistoricalEra: normalizedSnapshot.selectedHistoricalEra,
    coreParams: {
      ...normalizedSnapshot.coreParams,
      retirementStartDate: { ...normalizedSnapshot.coreParams.retirementStartDate },
    },
    portfolio: { ...normalizedSnapshot.portfolio },
    returnAssumptions: {
      stocks: { ...normalizedSnapshot.returnAssumptions.stocks },
      bonds: { ...normalizedSnapshot.returnAssumptions.bonds },
      cash: { ...normalizedSnapshot.returnAssumptions.cash },
    },
    spendingPhases: normalizedSnapshot.spendingPhases.map((phase) => ({ ...phase })),
    withdrawalStrategy: {
      type: normalizedSnapshot.withdrawalStrategy.type,
      params: normalizeWithdrawalStrategyParams(normalizedSnapshot.withdrawalStrategy.params),
    },
    drawdownStrategy: {
      type: normalizedSnapshot.drawdownStrategy.type,
      bucketOrder: [...normalizedSnapshot.drawdownStrategy.bucketOrder],
      rebalancing: {
        targetAllocation: { ...normalizedSnapshot.drawdownStrategy.rebalancing.targetAllocation },
        glidePathEnabled: normalizedSnapshot.drawdownStrategy.rebalancing.glidePathEnabled,
        glidePath: normalizedSnapshot.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
          year: waypoint.year,
          allocation: { ...waypoint.allocation },
        })),
      },
    },
    historicalData: {
      ...normalizedSnapshot.historicalData,
      summary: normalizedSnapshot.historicalData.summary
        ? {
            ...normalizedSnapshot.historicalData.summary,
            selectedEra: { ...normalizedSnapshot.historicalData.summary.selectedEra },
            eras: normalizedSnapshot.historicalData.summary.eras.map((era) => ({ ...era })),
            byAsset: {
              stocks: { ...normalizedSnapshot.historicalData.summary.byAsset.stocks },
              bonds: { ...normalizedSnapshot.historicalData.summary.byAsset.bonds },
              cash: { ...normalizedSnapshot.historicalData.summary.byAsset.cash },
            },
          }
        : null,
    },
    incomeEvents: normalizedSnapshot.incomeEvents.map((event) => ({
      ...event,
      start: { ...event.start },
      end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
    })),
    expenseEvents: normalizedSnapshot.expenseEvents.map((event) => ({
      ...event,
      start: { ...event.start },
      end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
    })),
    actualOverridesByMonth: normalizedActiveWorkspace
      ? Object.fromEntries(
          Object.entries(normalizedActiveWorkspace.actualOverridesByMonth).map(([month, value]) => [
            month,
            {
              startBalances: value.startBalances ? { ...value.startBalances } : undefined,
              withdrawalsByAsset: value.withdrawalsByAsset
                ? { ...value.withdrawalsByAsset }
                : undefined,
              incomeTotal: value.incomeTotal,
              expenseTotal: value.expenseTotal,
            },
          ]),
        )
      : Object.fromEntries(
          Object.entries(normalizedSnapshot.actualOverridesByMonth).map(([month, value]) => [
            month,
            {
              startBalances: value.startBalances ? { ...value.startBalances } : undefined,
              withdrawalsByAsset: value.withdrawalsByAsset
                ? { ...value.withdrawalsByAsset }
                : undefined,
              incomeTotal: value.incomeTotal,
              expenseTotal: value.expenseTotal,
            },
          ]),
        ),
    lastEditedMonthIndex:
      normalizedActiveWorkspace?.lastEditedMonthIndex ?? normalizedSnapshot.lastEditedMonthIndex,
    simulationResults: {
      ...normalizedSnapshot.simulationResults,
      manual: normalizedSnapshot.simulationResults.manual
        ? {
            ...normalizedSnapshot.simulationResults.manual,
            result: {
              ...normalizedSnapshot.simulationResults.manual.result,
              rows: normalizedSnapshot.simulationResults.manual.result.rows.map((row) => ({
                ...row,
                startBalances: { ...row.startBalances },
                marketChange: { ...row.marketChange },
                withdrawals: {
                  ...row.withdrawals,
                  byAsset: { ...row.withdrawals.byAsset },
                },
                endBalances: { ...row.endBalances },
              })),
              summary: { ...normalizedSnapshot.simulationResults.manual.result.summary },
            },
            monteCarlo: normalizedSnapshot.simulationResults.manual.monteCarlo
              ? {
                  ...normalizedSnapshot.simulationResults.manual.monteCarlo,
                  terminalValues: [
                    ...normalizedSnapshot.simulationResults.manual.monteCarlo.terminalValues,
                  ],
                  percentileCurves: {
                    total: {
                      ...normalizedSnapshot.simulationResults.manual.monteCarlo.percentileCurves
                        .total,
                    },
                    stocks: {
                      ...normalizedSnapshot.simulationResults.manual.monteCarlo.percentileCurves
                        .stocks,
                    },
                    bonds: {
                      ...normalizedSnapshot.simulationResults.manual.monteCarlo.percentileCurves
                        .bonds,
                    },
                    cash: {
                      ...normalizedSnapshot.simulationResults.manual.monteCarlo.percentileCurves
                        .cash,
                    },
                  },
                }
              : undefined,
          }
        : null,
      monteCarlo: normalizedSnapshot.simulationResults.monteCarlo
        ? {
            ...normalizedSnapshot.simulationResults.monteCarlo,
            result: {
              ...normalizedSnapshot.simulationResults.monteCarlo.result,
              rows: normalizedSnapshot.simulationResults.monteCarlo.result.rows.map((row) => ({
                ...row,
                startBalances: { ...row.startBalances },
                marketChange: { ...row.marketChange },
                withdrawals: {
                  ...row.withdrawals,
                  byAsset: { ...row.withdrawals.byAsset },
                },
                endBalances: { ...row.endBalances },
              })),
              summary: { ...normalizedSnapshot.simulationResults.monteCarlo.result.summary },
            },
            monteCarlo: normalizedSnapshot.simulationResults.monteCarlo.monteCarlo
              ? {
                  ...normalizedSnapshot.simulationResults.monteCarlo.monteCarlo,
                  terminalValues: [
                    ...normalizedSnapshot.simulationResults.monteCarlo.monteCarlo.terminalValues,
                  ],
                  percentileCurves: {
                    total: {
                      ...normalizedSnapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves
                        .total,
                    },
                    stocks: {
                      ...normalizedSnapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves
                        .stocks,
                    },
                    bonds: {
                      ...normalizedSnapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves
                        .bonds,
                    },
                    cash: {
                      ...normalizedSnapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves
                        .cash,
                    },
                  },
                }
              : undefined,
          }
        : null,
      reforecast: normalizedSnapshot.simulationResults.reforecast
        ? {
            ...normalizedSnapshot.simulationResults.reforecast,
            result: {
              ...normalizedSnapshot.simulationResults.reforecast.result,
              rows: normalizedSnapshot.simulationResults.reforecast.result.rows.map((row) => ({
                ...row,
                startBalances: { ...row.startBalances },
                marketChange: { ...row.marketChange },
                withdrawals: {
                  ...row.withdrawals,
                  byAsset: { ...row.withdrawals.byAsset },
                },
                endBalances: { ...row.endBalances },
              })),
              summary: { ...normalizedSnapshot.simulationResults.reforecast.result.summary },
            },
            monteCarlo: normalizedSnapshot.simulationResults.reforecast.monteCarlo
              ? {
                  ...normalizedSnapshot.simulationResults.reforecast.monteCarlo,
                  terminalValues: [
                    ...normalizedSnapshot.simulationResults.reforecast.monteCarlo.terminalValues,
                  ],
                  percentileCurves: {
                    total: {
                      ...normalizedSnapshot.simulationResults.reforecast.monteCarlo.percentileCurves
                        .total,
                    },
                    stocks: {
                      ...normalizedSnapshot.simulationResults.reforecast.monteCarlo.percentileCurves
                        .stocks,
                    },
                    bonds: {
                      ...normalizedSnapshot.simulationResults.reforecast.monteCarlo.percentileCurves
                        .bonds,
                    },
                    cash: {
                      ...normalizedSnapshot.simulationResults.reforecast.monteCarlo.percentileCurves
                        .cash,
                    },
                  },
                }
              : undefined,
          }
        : null,
    },
    stress: {
      ...normalizedSnapshot.stress,
      scenarios: normalizedSnapshot.stress.scenarios.map((scenario) => ({ ...scenario })),
      result: normalizedSnapshot.stress.result
        ? {
            ...normalizedSnapshot.stress.result,
            base: { ...normalizedSnapshot.stress.result.base },
            scenarios: normalizedSnapshot.stress.result.scenarios.map((scenario) => ({
              ...scenario,
            })),
            timingSensitivity: normalizedSnapshot.stress.result.timingSensitivity?.map(
              (series) => ({
                ...series,
                points: series.points.map((point) => ({ ...point })),
              }),
            ),
          }
        : null,
    },
    theme: {
      selectedThemeFamilyId: normalizedSnapshot.theme.selectedThemeFamilyId,
      selectedAppearanceByFamily: { ...normalizedSnapshot.theme.selectedAppearanceByFamily },
      defaultThemeFamilyId: normalizedSnapshot.theme.defaultThemeFamilyId,
      defaultAppearance: normalizedSnapshot.theme.defaultAppearance,
      activeVariantId: normalizedSnapshot.theme.activeVariantId,
      variants: normalizedSnapshot.theme.variants.map((theme) => ({ ...theme })),
      families: normalizedSnapshot.theme.families.map((item) => ({ ...item })),
      legacyDefaultThemeId: normalizedSnapshot.theme.legacyDefaultThemeId,
      legacyThemes: normalizedSnapshot.theme.legacyThemes.map((theme) => ({ ...theme })),
      legacyCatalog: normalizedSnapshot.theme.legacyCatalog.map((item) => ({ ...item })),
      slotCatalog: (normalizedSnapshot.theme.slotCatalog ?? []).map((item) => ({ ...item })),
      validationIssues: normalizedSnapshot.theme.validationIssues.map((issue) => ({ ...issue })),
      status: normalizedSnapshot.theme.status,
      errorMessage: normalizedSnapshot.theme.errorMessage,
    },
    ui: {
      ...normalizedSnapshot.ui,
      chartZoom: normalizedSnapshot.ui.chartZoom ? { ...normalizedSnapshot.ui.chartZoom } : null,
      tableSort: normalizedSnapshot.ui.tableSort ? { ...normalizedSnapshot.ui.tableSort } : null,
      collapsedSections: { ...normalizedSnapshot.ui.collapsedSections },
      isSidebarCollapsed: normalizedSnapshot.ui.isSidebarCollapsed ?? false,
    },
  };
};

export const useAppStore = create<AppStore>((set) => ({
  mode: AppMode.Planning,
  trackingInitialized: false,
  planningWorkspace: null,
  trackingWorkspace: null,
  compareWorkspace: {
    activeSlotId: 'A',
    baselineSlotId: 'A',
    slotOrder: ['A'],
    compareSync: defaultCompareSyncState(),
    slots: {},
  },
  simulationMode: SimulationMode.Manual,
  selectedHistoricalEra: HistoricalEra.FullHistory,
  coreParams: {
    startingAge: 60,
    withdrawalsStartAt: 60,
    retirementStartDate: { month: 1, year: 2030 },
    retirementDuration: 30,
    inflationRate: 0.03,
  },
  portfolio: {
    stocks: 2_000_000,
    bonds: 250_000,
    cash: 50_000,
  },
  returnAssumptions: {
    stocks: { expectedReturn: 0.08, stdDev: 0.15 },
    bonds: { expectedReturn: 0.04, stdDev: 0.07 },
    cash: { expectedReturn: 0.02, stdDev: 0.01 },
  },
  spendingPhases: [],
  withdrawalStrategy: {
    type: WithdrawalStrategyType.ConstantDollar,
    params: defaultWithdrawalStrategyParams(),
  },
  drawdownStrategy: {
    type: DrawdownStrategyType.Bucket,
    bucketOrder: [AssetClass.Cash, AssetClass.Bonds, AssetClass.Stocks],
    rebalancing: {
      targetAllocation: { stocks: 0.6, bonds: 0.3, cash: 0.1 },
      glidePathEnabled: false,
      glidePath: [],
    },
  },
  historicalData: {
    summary: null,
    status: 'idle',
    errorMessage: null,
  },
  incomeEvents: [],
  expenseEvents: [],
  actualOverridesByMonth: {},
  lastEditedMonthIndex: null,
  simulationResults: {
    manual: null,
    monteCarlo: null,
    status: 'idle',
    mcStale: false,
    reforecast: null,
    errorMessage: null,
  },
  stress: {
    isExpanded: true,
    scenarios: [],
    result: null,
    status: 'idle',
    errorMessage: null,
  },
  theme: {
    selectedThemeFamilyId: ThemeFamilyId.Default,
    selectedAppearanceByFamily: {
      [ThemeFamilyId.Default]: ThemeAppearance.Light,
      [ThemeFamilyId.Monokai]: ThemeAppearance.Dark,
      [ThemeFamilyId.Synthwave84]: ThemeAppearance.Dark,
      [ThemeFamilyId.StayTheCourse]: ThemeAppearance.Dark,
      [ThemeFamilyId.HighContrast]: ThemeAppearance.Dark,
      [ThemeFamilyId.PatagoniaVest]: ThemeAppearance.Dark,
      [ThemeFamilyId.MoneyNeverSleeps]: ThemeAppearance.Dark,
      [ThemeFamilyId.Hodl]: ThemeAppearance.Dark,
      [ThemeFamilyId.TrustMeBro]: ThemeAppearance.Dark,
      [ThemeFamilyId.ThreePieceSuit]: ThemeAppearance.Dark,
      [ThemeFamilyId.BuyHighSellLow]: ThemeAppearance.Dark,
      [ThemeFamilyId.ExitStrategy]: ThemeAppearance.Dark,
      [ThemeFamilyId.Ath]: ThemeAppearance.Dark,
      [ThemeFamilyId.Coastin]: ThemeAppearance.Dark,
      [ThemeFamilyId.MarginCall]: ThemeAppearance.Dark,
      [ThemeFamilyId.BigShort]: ThemeAppearance.Dark,
      [ThemeFamilyId.HoldingTheBag]: ThemeAppearance.Dark,
      [ThemeFamilyId.Boglehead]: ThemeAppearance.Dark,
      [ThemeFamilyId.CryptoBro]: ThemeAppearance.Dark,
      [ThemeFamilyId.TheVillages]: ThemeAppearance.Dark,
      [ThemeFamilyId.SeedRound]: ThemeAppearance.Dark,
      [ThemeFamilyId.Nineteen87]: ThemeAppearance.Dark,
      [ThemeFamilyId.Ramen]: ThemeAppearance.Dark,
      [ThemeFamilyId.ToTheMoon]: ThemeAppearance.Dark,
      [ThemeFamilyId.Wagmi]: ThemeAppearance.Dark,
      [ThemeFamilyId.Ngmi]: ThemeAppearance.Dark,
      [ThemeFamilyId.BuyTheDip]: ThemeAppearance.Dark,
      [ThemeFamilyId.ThisIsFine]: ThemeAppearance.Dark,
      [ThemeFamilyId.DeadCatBounce]: ThemeAppearance.Dark,
      [ThemeFamilyId.RugPull]: ThemeAppearance.Dark,
      [ThemeFamilyId.Whale]: ThemeAppearance.Dark,
      [ThemeFamilyId.LamboLoading]: ThemeAppearance.Dark,
      [ThemeFamilyId.TheSingularity]: ThemeAppearance.Dark,
      [ThemeFamilyId.ZoomOutBro]: ThemeAppearance.Dark,
      [ThemeFamilyId.BlackSwan]: ThemeAppearance.Dark,
      [ThemeFamilyId.TulipMania]: ThemeAppearance.Dark,
      [ThemeFamilyId.Nineteen29Vibes]: ThemeAppearance.Dark,
      [ThemeFamilyId.DotComShuffle]: ThemeAppearance.Dark,
      [ThemeFamilyId.BeanieBaby]: ThemeAppearance.Dark,
      [ThemeFamilyId.DebtSnowball]: ThemeAppearance.Dark,
      [ThemeFamilyId.SirThisIsAWendys]: ThemeAppearance.Dark,
      [ThemeFamilyId.Hopium]: ThemeAppearance.Dark,
      [ThemeFamilyId.Copium]: ThemeAppearance.Dark,
      [ThemeFamilyId.BaristaFire]: ThemeAppearance.Dark,
      [ThemeFamilyId.ThisTimeItsDifferent]: ThemeAppearance.Dark,
      [ThemeFamilyId.Satoshi]: ThemeAppearance.Dark,
    },
    defaultThemeFamilyId: ThemeFamilyId.Default,
    defaultAppearance: ThemeAppearance.Light,
    activeVariantId: null,
    variants: [],
    families: [],
    legacyDefaultThemeId: ThemeId.Light,
    legacyThemes: [],
    legacyCatalog: [],
    slotCatalog: [],
    validationIssues: [],
    status: 'idle',
    errorMessage: null,
  },
  ui: {
    chartDisplayMode: 'real',
    chartBreakdownEnabled: false,
    tableGranularity: 'annual',
    tableAssetColumnsEnabled: false,
    tableSpreadsheetMode: false,
    tableSort: null,
    chartZoom: null,
    reforecastStatus: 'idle',
    collapsedSections: {},
    isSidebarCollapsed: false,
  },
  setMode: (mode) =>
    set((state) => {
      if (mode === state.mode) {
        return state;
      }

      const currentWorkspace = cloneWorkspace(workspaceFromState(state));
      const planningWorkspace =
        state.mode === AppMode.Planning
          ? currentWorkspace
          : (state.planningWorkspace ?? currentWorkspace);
      const trackingWorkspace =
        state.mode === AppMode.Tracking ? currentWorkspace : state.trackingWorkspace;

      const persistedCompareWorkspace = (() => {
        const nextCompare = cloneCompareWorkspace(state.compareWorkspace);
        if (isCompareActiveFromWorkspace(nextCompare)) {
          nextCompare.slots[nextCompare.activeSlotId] = currentWorkspace;
        }
        return applyCompareSyncFromMaster(normalizeCompareWorkspace(nextCompare));
      })();

      if (mode === AppMode.Tracking) {
        if (isCompareActiveFromWorkspace(persistedCompareWorkspace)) {
          const activeCompareWorkspace =
            persistedCompareWorkspace.slots[persistedCompareWorkspace.activeSlotId] ??
            persistedCompareWorkspace.slots[persistedCompareWorkspace.slotOrder[0] ?? 'A'] ??
            currentWorkspace;
          return {
            mode,
            trackingInitialized: true,
            planningWorkspace,
            trackingWorkspace: state.trackingWorkspace ?? cloneWorkspace(currentWorkspace),
            compareWorkspace: persistedCompareWorkspace,
            ...snapshotFieldsFromWorkspace(cloneWorkspace(activeCompareWorkspace)),
          };
        }
        if (!state.trackingInitialized) {
          const seededTracking = cloneWorkspace(currentWorkspace);
          seededTracking.simulationResults = trackingSimulationResultsCleared(
            seededTracking.simulationResults,
          );
          seededTracking.stress = {
            ...seededTracking.stress,
            result: null,
            status: 'idle',
            errorMessage: null,
          };
          seededTracking.actualOverridesByMonth = {};
          seededTracking.lastEditedMonthIndex = null;
          return {
            mode,
            trackingInitialized: true,
            planningWorkspace,
            trackingWorkspace: seededTracking,
            compareWorkspace: persistedCompareWorkspace,
            ...snapshotFieldsFromWorkspace(seededTracking),
          };
        }

        const nextTracking = state.trackingWorkspace
          ? cloneWorkspace(state.trackingWorkspace)
          : cloneWorkspace(currentWorkspace);
        return {
          mode,
          planningWorkspace,
          trackingWorkspace: nextTracking,
          compareWorkspace: persistedCompareWorkspace,
          ...snapshotFieldsFromWorkspace(nextTracking),
        };
      }

      const nextPlanning = state.planningWorkspace
        ? cloneWorkspace(state.planningWorkspace)
        : cloneWorkspace(currentWorkspace);
      if (isCompareActiveFromWorkspace(persistedCompareWorkspace)) {
        const activeCompareWorkspace =
          persistedCompareWorkspace.slots[persistedCompareWorkspace.activeSlotId] ??
          persistedCompareWorkspace.slots[persistedCompareWorkspace.slotOrder[0] ?? 'A'] ??
          currentWorkspace;
        return {
          mode,
          planningWorkspace: nextPlanning,
          trackingWorkspace,
          compareWorkspace: persistedCompareWorkspace,
          ...snapshotFieldsFromWorkspace(cloneWorkspace(activeCompareWorkspace)),
        };
      }
      return {
        mode,
        planningWorkspace: nextPlanning,
        trackingWorkspace,
        compareWorkspace: persistedCompareWorkspace,
        ...snapshotFieldsFromWorkspace(nextPlanning),
      };
    }),
  setCompareActiveSlot: (slot) =>
    set((state) => {
      if (state.compareWorkspace.activeSlotId === slot) {
        return state;
      }
      const nextCompareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      const currentInputs = currentInputFieldsFromState(state);
      const activeSlotId = nextCompareWorkspace.activeSlotId;
      const activeWorkspace = nextCompareWorkspace.slots[activeSlotId];

      nextCompareWorkspace.slots[activeSlotId] = activeWorkspace
        ? cloneWorkspace({
            ...activeWorkspace,
            ...currentInputs,
          })
        : cloneWorkspace(workspaceFromState(state));
      if (!nextCompareWorkspace.slotOrder.includes(slot)) {
        return state;
      }
      nextCompareWorkspace.activeSlotId = slot;
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;

      const targetWorkspace = normalizedWorkspace.slots[slot];
      if (!targetWorkspace) {
        return { compareWorkspace: normalizedWorkspace };
      }

      return {
        compareWorkspace: normalizedWorkspace,
        ...snapshotFieldsFromWorkspace(cloneWorkspace(targetWorkspace)),
      };
    }),
  setCompareBaselineSlot: (slot) =>
    set((state) => {
      if (!state.compareWorkspace.slotOrder.includes(slot)) {
        return state;
      }
      if (state.compareWorkspace.baselineSlotId === slot) {
        return state;
      }
      return {
        compareWorkspace: {
          ...state.compareWorkspace,
          baselineSlotId: slot,
        },
      };
    }),
  addCompareSlotFromSource: (sourceSlotId) =>
    set((state) => {
      const nextCompareWorkspace = compareWorkspaceWithCurrentState(state);
      if (nextCompareWorkspace.slotOrder.length >= COMPARE_SLOT_IDS.length) {
        return state;
      }
      if (!nextCompareWorkspace.slotOrder.includes(sourceSlotId)) {
        return state;
      }
      const nextSlotId = COMPARE_SLOT_IDS.find(
        (slotId) => !nextCompareWorkspace.slotOrder.includes(slotId),
      );
      if (!nextSlotId) {
        return state;
      }
      const sourceWorkspace =
        nextCompareWorkspace.slots[sourceSlotId] ?? cloneWorkspace(workspaceFromState(state));
      if (!sourceWorkspace) {
        return state;
      }
      if (!nextCompareWorkspace.slots[sourceSlotId]) {
        nextCompareWorkspace.slots[sourceSlotId] = cloneWorkspace(sourceWorkspace);
      }
      nextCompareWorkspace.slotOrder = [...nextCompareWorkspace.slotOrder, nextSlotId];
      nextCompareWorkspace.slots[nextSlotId] = cloneWorkspace(sourceWorkspace);
      nextCompareWorkspace.slotOrder = sortCompareSlotOrder(nextCompareWorkspace.slotOrder);
      nextCompareWorkspace.compareSync.unsyncedBySlot[nextSlotId] =
        createCompareSyncSlotOverrides();
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;
      return {
        compareWorkspace: normalizedWorkspace,
      };
    }),
  removeCompareSlot: (slot) =>
    set((state) => {
      const nextCompareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      if (slot === 'A') {
        return state;
      }
      if (nextCompareWorkspace.slotOrder.length <= 1) {
        return state;
      }
      if (!nextCompareWorkspace.slotOrder.includes(slot)) {
        return state;
      }
      nextCompareWorkspace.slotOrder = nextCompareWorkspace.slotOrder.filter(
        (slotId) => slotId !== slot,
      );
      nextCompareWorkspace.slotOrder = sortCompareSlotOrder(nextCompareWorkspace.slotOrder);
      delete nextCompareWorkspace.slots[slot];
      delete nextCompareWorkspace.compareSync.unsyncedBySlot[slot];

      if (nextCompareWorkspace.activeSlotId === slot) {
        nextCompareWorkspace.activeSlotId = nextCompareWorkspace.slotOrder[0] ?? 'A';
      }
      if (nextCompareWorkspace.baselineSlotId === slot) {
        nextCompareWorkspace.baselineSlotId = nextCompareWorkspace.slotOrder[0] ?? 'A';
      }
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;

      const nextActiveWorkspace = normalizedWorkspace.slots[normalizedWorkspace.activeSlotId];
      if (!nextActiveWorkspace) {
        return { compareWorkspace: normalizedWorkspace };
      }
      return {
        compareWorkspace: normalizedWorkspace,
        ...snapshotFieldsFromWorkspace(cloneWorkspace(nextActiveWorkspace)),
      };
    }),
  toggleCompareFamilyLock: (family) =>
    set((state) => {
      const nextCompareWorkspace = compareWorkspaceWithCurrentState(state);
      const compareSync = cloneCompareSyncState(nextCompareWorkspace.compareSync);
      const nextLocked = !compareSync.familyLocks[family];
      compareSync.familyLocks[family] = nextLocked;

      nextCompareWorkspace.slotOrder.forEach((slotId) => {
        if (slotId === 'A') {
          return;
        }
        const overrides = compareSync.unsyncedBySlot[slotId] ?? createCompareSyncSlotOverrides();
        delete overrides.families[family];
        compareSync.unsyncedBySlot[slotId] = overrides;
      });

      nextCompareWorkspace.compareSync = compareSync;
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;
      const activeWorkspace = normalizedWorkspace.slots[normalizedWorkspace.activeSlotId];
      if (!activeWorkspace) {
        return { compareWorkspace: normalizedWorkspace };
      }
      return {
        compareWorkspace: normalizedWorkspace,
        ...snapshotFieldsFromWorkspace(cloneWorkspace(activeWorkspace)),
      };
    }),
  toggleCompareInstanceLock: (family, instanceId) =>
    set((state) => {
      if (!instanceId) {
        return state;
      }
      const nextCompareWorkspace = compareWorkspaceWithCurrentState(state);
      const compareSync = cloneCompareSyncState(nextCompareWorkspace.compareSync);
      const nextLocked = !compareSync.instanceLocks[family][instanceId];
      if (family === 'spendingPhases') {
        const masterPhases = nextCompareWorkspace.slots.A?.spendingPhases ?? [];
        normalizeSpendingPhaseInstanceLocks(
          compareSync,
          masterPhases,
          nextCompareWorkspace.slotOrder,
        );
        if (nextLocked) {
          if (
            !isSpendingPhaseLockEligible(
              instanceId,
              masterPhases,
              compareSync.instanceLocks.spendingPhases,
            )
          ) {
            return state;
          }
          compareSync.instanceLocks.spendingPhases[instanceId] = true;
        } else {
          const index = masterPhases.findIndex((phase) => phase.id === instanceId);
          if (index >= 0) {
            const tailIds = masterPhases.slice(index).map((phase) => phase.id);
            tailIds.forEach((id) => {
              delete compareSync.instanceLocks.spendingPhases[id];
            });
            nextCompareWorkspace.slotOrder.forEach((slotId) => {
              if (slotId === 'A') {
                return;
              }
              const overrides =
                compareSync.unsyncedBySlot[slotId] ?? createCompareSyncSlotOverrides();
              tailIds.forEach((id) => {
                delete overrides.instances.spendingPhases[id];
              });
              compareSync.unsyncedBySlot[slotId] = overrides;
            });
          } else {
            delete compareSync.instanceLocks.spendingPhases[instanceId];
          }
        }
      } else if (nextLocked) {
        compareSync.instanceLocks[family][instanceId] = true;
      } else {
        delete compareSync.instanceLocks[family][instanceId];
      }
      nextCompareWorkspace.slotOrder.forEach((slotId) => {
        if (slotId === 'A') {
          return;
        }
        const overrides = compareSync.unsyncedBySlot[slotId] ?? createCompareSyncSlotOverrides();
        delete overrides.instances[family][instanceId];
        compareSync.unsyncedBySlot[slotId] = overrides;
      });
      nextCompareWorkspace.compareSync = compareSync;
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;
      const activeWorkspace = normalizedWorkspace.slots[normalizedWorkspace.activeSlotId];
      if (!activeWorkspace) {
        return { compareWorkspace: normalizedWorkspace };
      }
      return {
        compareWorkspace: normalizedWorkspace,
        ...snapshotFieldsFromWorkspace(cloneWorkspace(activeWorkspace)),
      };
    }),
  setCompareSlotFamilySync: (slot, family, synced) =>
    set((state) => {
      if (slot === 'A') {
        return state;
      }
      if (!state.compareWorkspace.slotOrder.includes(slot)) {
        return state;
      }
      if (!state.compareWorkspace.compareSync.familyLocks[family]) {
        return state;
      }
      const nextCompareWorkspace = compareWorkspaceWithCurrentState(state);
      const compareSync = cloneCompareSyncState(nextCompareWorkspace.compareSync);
      const overrides = compareSync.unsyncedBySlot[slot] ?? createCompareSyncSlotOverrides();
      if (synced) {
        delete overrides.families[family];
      } else {
        overrides.families[family] = true;
      }
      compareSync.unsyncedBySlot[slot] = overrides;
      nextCompareWorkspace.compareSync = compareSync;
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;
      const activeWorkspace = normalizedWorkspace.slots[normalizedWorkspace.activeSlotId];
      if (!activeWorkspace) {
        return { compareWorkspace: normalizedWorkspace };
      }
      return {
        compareWorkspace: normalizedWorkspace,
        ...snapshotFieldsFromWorkspace(cloneWorkspace(activeWorkspace)),
      };
    }),
  setCompareSlotInstanceSync: (slot, family, instanceId, synced) =>
    set((state) => {
      if (!instanceId || slot === 'A') {
        return state;
      }
      if (!state.compareWorkspace.slotOrder.includes(slot)) {
        return state;
      }
      if (!state.compareWorkspace.compareSync.instanceLocks[family][instanceId]) {
        return state;
      }
      const nextCompareWorkspace = compareWorkspaceWithCurrentState(state);
      const compareSync = cloneCompareSyncState(nextCompareWorkspace.compareSync);
      const overrides = compareSync.unsyncedBySlot[slot] ?? createCompareSyncSlotOverrides();
      if (synced) {
        delete overrides.instances[family][instanceId];
      } else {
        overrides.instances[family][instanceId] = true;
      }
      compareSync.unsyncedBySlot[slot] = overrides;
      nextCompareWorkspace.compareSync = compareSync;
      const syncedWorkspace = applyCompareSyncFromMaster(
        normalizeCompareWorkspace(nextCompareWorkspace),
      );
      const normalizedWorkspace =
        state.mode === AppMode.Tracking
          ? normalizeTrackingCompareCanonicalFloor(syncedWorkspace)
          : syncedWorkspace;
      const activeWorkspace = normalizedWorkspace.slots[normalizedWorkspace.activeSlotId];
      if (!activeWorkspace) {
        return { compareWorkspace: normalizedWorkspace };
      }
      return {
        compareWorkspace: normalizedWorkspace,
        ...snapshotFieldsFromWorkspace(cloneWorkspace(activeWorkspace)),
      };
    }),
  upsertActualOverride: (monthIndex, patch) =>
    set((state) => {
      if (monthIndex <= 0) {
        return state;
      }
      if (state.mode === AppMode.Tracking && !isEditableTrackingMonthForState(state, monthIndex)) {
        return state;
      }
      const compareActive = isTrackingCompareActive(state);
      const activeSlotId = state.compareWorkspace.activeSlotId;
      if (compareActive && activeSlotId !== 'A') {
        return state;
      }
      const sanitizedPatch = sanitizeTrackingActualOverrides({
        [monthIndex]: patch as ActualMonthOverride,
      })[monthIndex];
      if (!sanitizedPatch) {
        return state;
      }
      const existing = state.actualOverridesByMonth[monthIndex] ?? {};
      const next: ActualMonthOverride = {
        startBalances:
          sanitizedPatch.startBalances || existing.startBalances
            ? {
                ...(existing.startBalances ?? {}),
                ...(sanitizedPatch.startBalances ?? {}),
              }
            : undefined,
        withdrawalsByAsset:
          sanitizedPatch.withdrawalsByAsset || existing.withdrawalsByAsset
            ? {
                ...(existing.withdrawalsByAsset ?? {}),
                ...(sanitizedPatch.withdrawalsByAsset ?? {}),
              }
            : undefined,
        incomeTotal: existing.incomeTotal,
        expenseTotal: existing.expenseTotal,
      };
      const nextActualOverridesByMonth: ActualOverridesByMonth = {
        ...state.actualOverridesByMonth,
        [monthIndex]: next,
      };
      const nextLastEditedMonthIndex = Math.max(state.lastEditedMonthIndex ?? 0, monthIndex);
      const nextCompareWorkspace = (() => {
        if (!(state.mode === AppMode.Tracking && compareActive)) {
          return state.compareWorkspace;
        }
        const workspace = cloneCompareWorkspace(state.compareWorkspace);
        const activeWorkspace =
          workspace.slots[activeSlotId] ?? cloneWorkspace(workspaceFromState(state));
        activeWorkspace.actualOverridesByMonth = nextActualOverridesByMonth;
        activeWorkspace.lastEditedMonthIndex = nextLastEditedMonthIndex;
        workspace.slots[activeSlotId] = activeWorkspace;
        return normalizeTrackingCompareCanonicalFloor(workspace);
      })();
      const staleState = markTrackingOutputStateStale(state, nextCompareWorkspace);
      return {
        actualOverridesByMonth: nextActualOverridesByMonth,
        lastEditedMonthIndex: nextLastEditedMonthIndex,
        compareWorkspace: staleState.compareWorkspace,
        simulationResults: staleState.simulationResults,
      };
    }),
  clearActualRowOverrides: (monthIndex) =>
    set((state) => {
      if (state.mode === AppMode.Tracking && !isEditableTrackingMonthForState(state, monthIndex)) {
        return state;
      }
      const compareActive = isTrackingCompareActive(state);
      const activeSlotId = state.compareWorkspace.activeSlotId;
      if (compareActive && activeSlotId !== 'A') {
        return state;
      }
      const next = { ...state.actualOverridesByMonth };
      delete next[monthIndex];
      const editedMonths = Object.keys(next)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
      const hasAnyOverrides = editedMonths.length > 0;
      const nextLastEditedMonthIndex = hasAnyOverrides ? Math.max(...editedMonths) : null;
      const nextCompareWorkspace = (() => {
        if (!compareActive) {
          return state.compareWorkspace;
        }
        const workspace = cloneCompareWorkspace(state.compareWorkspace);
        const activeWorkspace =
          workspace.slots[activeSlotId] ?? cloneWorkspace(workspaceFromState(state));
        activeWorkspace.actualOverridesByMonth = next;
        activeWorkspace.lastEditedMonthIndex = nextLastEditedMonthIndex;
        workspace.slots[activeSlotId] = activeWorkspace;
        return normalizeTrackingCompareCanonicalFloor(workspace);
      })();
      const staleState = markTrackingOutputStateStale(state, nextCompareWorkspace);
      return {
        actualOverridesByMonth: next,
        lastEditedMonthIndex: nextLastEditedMonthIndex,
        compareWorkspace: staleState.compareWorkspace,
        simulationResults: staleState.simulationResults,
      };
    }),
  clearAllActualOverrides: () =>
    set((state) => {
      const compareActive = isTrackingCompareActive(state);
      const activeSlotId = state.compareWorkspace.activeSlotId;
      if (compareActive && activeSlotId !== 'A') {
        return state;
      }
      const nextOverrides = {};
      const nextLastEditedMonthIndex = null;
      const nextCompareWorkspace = (() => {
        if (!compareActive) {
          return state.compareWorkspace;
        }
        const workspace = cloneCompareWorkspace(state.compareWorkspace);
        const activeWorkspace =
          workspace.slots[activeSlotId] ?? cloneWorkspace(workspaceFromState(state));
        activeWorkspace.actualOverridesByMonth = nextOverrides;
        activeWorkspace.lastEditedMonthIndex = nextLastEditedMonthIndex;
        workspace.slots[activeSlotId] = activeWorkspace;
        return normalizeTrackingCompareCanonicalFloor(workspace);
      })();
      const staleState = markTrackingOutputStateStale(state, nextCompareWorkspace);

      return {
        actualOverridesByMonth: nextOverrides,
        lastEditedMonthIndex: nextLastEditedMonthIndex,
        compareWorkspace: staleState.compareWorkspace,
        simulationResults: staleState.simulationResults,
      };
    }),
  setSimulationMode: (simulationMode) => set({ simulationMode }),
  setSelectedHistoricalEra: (selectedHistoricalEra) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'historicalEra')) {
        return state;
      }

      const staleState = markTrackingOutputStateStale(state);

      if (!isCompareActiveFromWorkspace(state.compareWorkspace)) {
        return { selectedHistoricalEra, ...staleState };
      }

      const nextCompare = cloneCompareWorkspace(staleState.compareWorkspace);
      const activeSlotId = nextCompare.activeSlotId;
      const workspace = nextCompare.slots[activeSlotId];
      if (workspace) {
        workspace.selectedHistoricalEra = selectedHistoricalEra;
      }

      if (activeSlotId === 'A') {
        nextCompare.slotOrder.forEach((slotId) => {
          if (slotId === 'A') {
            return;
          }
          if (isSlotFamilySynced(nextCompare.compareSync, slotId, 'historicalEra')) {
            const slotWorkspace = nextCompare.slots[slotId];
            if (slotWorkspace) {
              slotWorkspace.selectedHistoricalEra = selectedHistoricalEra;
            }
          }
        });
      }

      return {
        selectedHistoricalEra,
        compareWorkspace: nextCompare,
        simulationResults: staleState.simulationResults,
      };
    }),
  setHistoricalSummaryStatus: (status, errorMessage = null) =>
    set((state) => ({
      historicalData: { ...state.historicalData, status, errorMessage },
    })),
  setHistoricalSummary: (summary) =>
    set({
      historicalData: { summary, status: 'ready', errorMessage: null },
    }),
  setCoreParam: (key, value) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'coreParams')) {
        return state;
      }
      const nextCore = { ...state.coreParams, [key]: value };
      if (key === 'startingAge') {
        const startingAge = Number(value);
        nextCore.startingAge = startingAge;
        nextCore.withdrawalsStartAt = Math.max(nextCore.withdrawalsStartAt, startingAge);
      }
      if (key === 'withdrawalsStartAt') {
        nextCore.withdrawalsStartAt = Math.max(Number(value), nextCore.startingAge);
      }
      if (key === 'retirementDuration') {
        nextCore.retirementDuration = Number(value);
      }
      if (key === 'retirementDuration' || key === 'startingAge' || key === 'withdrawalsStartAt') {
        const firstPhaseStartYear = resolveFirstPhaseStartYear(
          Number(nextCore.startingAge),
          Number(nextCore.withdrawalsStartAt),
        );
        const nextRetirementDuration = Number(nextCore.retirementDuration);
        const staleState = markTrackingOutputStateStale(state);
        const nextGlidePath = state.drawdownStrategy.rebalancing.glidePath.map(
          (waypoint, index, all) => {
            if (index === 0) {
              return { ...waypoint, year: 1 };
            }
            if (index === all.length - 1) {
              return { ...waypoint, year: nextRetirementDuration };
            }
            return {
              ...waypoint,
              year: Math.max(2, Math.min(nextRetirementDuration - 1, waypoint.year)),
            };
          },
        );
        return {
          coreParams: nextCore,
          spendingPhases: recalculatePhaseBoundaries(
            state.spendingPhases,
            nextRetirementDuration,
            firstPhaseStartYear,
          ),
          drawdownStrategy: {
            ...state.drawdownStrategy,
            rebalancing: {
              ...state.drawdownStrategy.rebalancing,
              glidePath: nextGlidePath.sort((a, b) => a.year - b.year),
            },
          },
          ...staleState,
        };
      }
      const staleState = markTrackingOutputStateStale(state);
      return { coreParams: nextCore, ...staleState };
    }),
  setPortfolioValue: (asset, value) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'startingPortfolio')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        portfolio: { ...state.portfolio, [asset]: Math.max(0, Math.round(value)) },
        ...staleState,
      };
    }),
  setReturnAssumption: (asset, key, value) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'returnAssumptions')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        returnAssumptions: {
          ...state.returnAssumptions,
          [asset]: { ...state.returnAssumptions[asset], [key]: value },
        },
        ...staleState,
      };
    }),
  addSpendingPhase: () =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'spendingPhases')) {
        return state;
      }
      if (state.spendingPhases.length >= 4) {
        return state;
      }
      const retirementYears = state.coreParams.retirementDuration;
      const firstPhaseStartYear = resolveFirstPhaseStartYear(
        state.coreParams.startingAge,
        state.coreParams.withdrawalsStartAt,
      );
      const availableYears = Math.max(1, retirementYears - firstPhaseStartYear + 1);
      if (state.spendingPhases.length >= availableYears) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      const next = [
        ...state.spendingPhases,
        {
          ...defaultPhase(),
          name: `Phase ${state.spendingPhases.length + 1}`,
          startYear: retirementYears,
          endYear: retirementYears,
        },
      ];
      return {
        spendingPhases: recalculatePhaseBoundaries(next, retirementYears, firstPhaseStartYear),
        ...staleState,
      };
    }),
  removeSpendingPhase: (id) =>
    set((state) => {
      if (
        isCompareFamilyLockedAndSyncedForActiveSlot(state, 'spendingPhases') ||
        isCompareInstanceLockedAndSyncedForActiveSlot(state, 'spendingPhases', id)
      ) {
        return state;
      }
      if (state.spendingPhases.length <= 0) {
        return state;
      }
      const next = state.spendingPhases.filter((phase) => phase.id !== id);
      if (next.length === state.spendingPhases.length) {
        return state;
      }
      const firstPhaseStartYear = resolveFirstPhaseStartYear(
        state.coreParams.startingAge,
        state.coreParams.withdrawalsStartAt,
      );
      const staleState = markTrackingOutputStateStale(state);
      return {
        spendingPhases: recalculatePhaseBoundaries(
          next,
          state.coreParams.retirementDuration,
          firstPhaseStartYear,
        ),
        ...staleState,
      };
    }),
  updateSpendingPhase: (id, patch) =>
    set((state) => {
      if (
        isCompareFamilyLockedAndSyncedForActiveSlot(state, 'spendingPhases') ||
        isCompareInstanceLockedAndSyncedForActiveSlot(state, 'spendingPhases', id)
      ) {
        return state;
      }
      const ordered = [...state.spendingPhases].sort((a, b) => a.startYear - b.startYear);
      const firstPhaseId = ordered[0]?.id;
      const lastPhaseId = ordered[ordered.length - 1]?.id;
      const sanitizedPatch = { ...patch };
      if (id === firstPhaseId) {
        delete sanitizedPatch.startYear;
      }
      if (id === lastPhaseId) {
        delete sanitizedPatch.endYear;
      }
      const next = state.spendingPhases.map((phase) =>
        phase.id === id ? { ...phase, ...sanitizedPatch } : phase,
      );
      const firstPhaseStartYear = resolveFirstPhaseStartYear(
        state.coreParams.startingAge,
        state.coreParams.withdrawalsStartAt,
      );
      const staleState = markTrackingOutputStateStale(state);
      return {
        spendingPhases: recalculatePhaseBoundaries(
          next,
          state.coreParams.retirementDuration,
          firstPhaseStartYear,
        ),
        ...staleState,
      };
    }),
  setWithdrawalStrategyType: (type) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'withdrawalStrategy')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        withdrawalStrategy: { ...state.withdrawalStrategy, type },
        ...staleState,
      };
    }),
  setWithdrawalParam: (key, value) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'withdrawalStrategy')) {
        return state;
      }
      const normalizedValue =
        key === 'smoothingEnabled'
          ? Boolean(value)
          : key === 'lookbackMonths'
            ? Math.round(Number(value))
            : key === 'guardrailsSunset'
              ? Math.round(Number(value))
              : key === 'smoothingBlend'
                ? Math.max(0, Math.min(0.95, Number(value)))
                : Number(value);
      const staleState = markTrackingOutputStateStale(state);
      return {
        withdrawalStrategy: {
          ...state.withdrawalStrategy,
          params: {
            ...state.withdrawalStrategy.params,
            [key]: normalizedValue,
          },
        },
        ...staleState,
      };
    }),
  setDrawdownType: (type) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: { ...state.drawdownStrategy, type },
        ...staleState,
      };
    }),
  moveBucketAsset: (asset, direction) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const order = [...state.drawdownStrategy.bucketOrder];
      const index = order.indexOf(asset);
      if (index < 0) {
        return state;
      }
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= order.length) {
        return state;
      }
      const current = order[index];
      const next = order[swapWith];
      if (current === undefined || next === undefined) {
        return state;
      }
      order[index] = next;
      order[swapWith] = current;
      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: { ...state.drawdownStrategy, bucketOrder: order },
        ...staleState,
      };
    }),
  setRebalancingTargetAllocation: (asset, value) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: {
            ...state.drawdownStrategy.rebalancing,
            targetAllocation: {
              ...state.drawdownStrategy.rebalancing.targetAllocation,
              [asset]: Math.max(0, Math.min(1, value)),
            },
          },
        },
        ...staleState,
      };
    }),
  setGlidePathEnabled: (enabled) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: {
            ...state.drawdownStrategy.rebalancing,
            glidePathEnabled: enabled,
            glidePath:
              enabled && state.drawdownStrategy.rebalancing.glidePath.length < 2
                ? createDefaultGlidePath(
                    state.coreParams.retirementDuration,
                    state.drawdownStrategy.rebalancing.targetAllocation,
                  )
                : state.drawdownStrategy.rebalancing.glidePath,
          },
        },
        ...staleState,
      };
    }),
  addGlidePathWaypoint: () =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const existing = [...state.drawdownStrategy.rebalancing.glidePath].sort(
        (a, b) => a.year - b.year,
      );
      if (existing.length < 2) {
        const staleState = markTrackingOutputStateStale(state);
        return {
          drawdownStrategy: {
            ...state.drawdownStrategy,
            rebalancing: {
              ...state.drawdownStrategy.rebalancing,
              glidePath: createDefaultGlidePath(
                state.coreParams.retirementDuration,
                state.drawdownStrategy.rebalancing.targetAllocation,
              ),
            },
          },
          ...staleState,
        };
      }
      const last = existing[existing.length - 1];
      const prev = existing[existing.length - 2];
      if (!last || !prev) {
        return state;
      }
      const nextYear = Math.round((prev.year + last.year) / 2);
      if (existing.some((waypoint) => waypoint.year === nextYear)) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: {
            ...state.drawdownStrategy.rebalancing,
            glidePath: [
              ...existing,
              { year: nextYear, allocation: normalizeAllocation(last.allocation) },
            ].sort((a, b) => a.year - b.year),
          },
        },
        ...staleState,
      };
    }),
  removeGlidePathWaypoint: (year) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const next = state.drawdownStrategy.rebalancing.glidePath.filter(
        (waypoint) => waypoint.year !== year,
      );
      if (next.length < 2) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: { ...state.drawdownStrategy.rebalancing, glidePath: next },
        },
        ...staleState,
      };
    }),
  updateGlidePathWaypoint: (year, patch) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'drawdownStrategy')) {
        return state;
      }
      const waypoints = state.drawdownStrategy.rebalancing.glidePath.map((waypoint) => {
        if (waypoint.year !== year) {
          return waypoint;
        }
        return {
          year: patch.year ?? waypoint.year,
          allocation: patch.allocation
            ? normalizeAllocation(patch.allocation)
            : waypoint.allocation,
        };
      });

      const staleState = markTrackingOutputStateStale(state);
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: {
            ...state.drawdownStrategy.rebalancing,
            glidePath: waypoints.sort((a, b) => a.year - b.year),
          },
        },
        ...staleState,
      };
    }),
  addIncomeEvent: (preset) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'incomeEvents')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        incomeEvents: [
          ...state.incomeEvents,
          preset
            ? { ...defaultIncomeEvent(), ...incomeEventPreset(preset), id: createId('income') }
            : defaultIncomeEvent(),
        ],
        ...staleState,
      };
    }),
  removeIncomeEvent: (id) =>
    set((state) => {
      if (
        isCompareFamilyLockedAndSyncedForActiveSlot(state, 'incomeEvents') ||
        isCompareInstanceLockedAndSyncedForActiveSlot(state, 'incomeEvents', id)
      ) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        incomeEvents: state.incomeEvents.filter((event) => event.id !== id),
        ...staleState,
      };
    }),
  updateIncomeEvent: (id, patch) =>
    set((state) => {
      if (
        isCompareFamilyLockedAndSyncedForActiveSlot(state, 'incomeEvents') ||
        isCompareInstanceLockedAndSyncedForActiveSlot(state, 'incomeEvents', id)
      ) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        incomeEvents: state.incomeEvents.map((event) =>
          event.id === id ? { ...event, ...patch } : event,
        ),
        ...staleState,
      };
    }),
  addExpenseEvent: (preset) =>
    set((state) => {
      if (isCompareFamilyLockedAndSyncedForActiveSlot(state, 'expenseEvents')) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        expenseEvents: [
          ...state.expenseEvents,
          preset
            ? { ...defaultExpenseEvent(), ...expenseEventPreset(preset), id: createId('expense') }
            : defaultExpenseEvent(),
        ],
        ...staleState,
      };
    }),
  removeExpenseEvent: (id) =>
    set((state) => {
      if (
        isCompareFamilyLockedAndSyncedForActiveSlot(state, 'expenseEvents') ||
        isCompareInstanceLockedAndSyncedForActiveSlot(state, 'expenseEvents', id)
      ) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        expenseEvents: state.expenseEvents.filter((event) => event.id !== id),
        ...staleState,
      };
    }),
  updateExpenseEvent: (id, patch) =>
    set((state) => {
      if (
        isCompareFamilyLockedAndSyncedForActiveSlot(state, 'expenseEvents') ||
        isCompareInstanceLockedAndSyncedForActiveSlot(state, 'expenseEvents', id)
      ) {
        return state;
      }
      const staleState = markTrackingOutputStateStale(state);
      return {
        expenseEvents: state.expenseEvents.map((event) =>
          event.id === id ? { ...event, ...patch } : event,
        ),
        ...staleState,
      };
    }),
  setSimulationStatus: (status, errorMessage = null) =>
    set((state) => ({
      simulationResults: { ...state.simulationResults, status, errorMessage },
    })),
  setSimulationResult: (mode, result) =>
    set((state) => ({
      simulationResults: {
        ...state.simulationResults,
        manual: mode === SimulationMode.Manual ? result : state.simulationResults.manual,
        monteCarlo:
          mode === SimulationMode.MonteCarlo ? result : state.simulationResults.monteCarlo,
        reforecast:
          state.mode === AppMode.Tracking && mode === SimulationMode.Manual
            ? result
            : state.simulationResults.reforecast,
        status: 'complete',
        mcStale: state.mode === AppMode.Tracking ? false : state.simulationResults.mcStale,
        errorMessage: null,
      },
    })),
  setCompareSlotSimulationStatus: (slot, status, errorMessage = null) =>
    set((state) => {
      const compareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      const workspace = compareWorkspace.slots[slot];
      if (!workspace) {
        return state;
      }
      workspace.simulationResults = {
        ...workspace.simulationResults,
        status,
        errorMessage,
      };

      const activeWorkspace = compareWorkspace.activeSlotId === slot;
      return activeWorkspace
        ? {
            compareWorkspace,
            simulationResults: workspace.simulationResults,
          }
        : { compareWorkspace };
    }),
  setCompareSlotSimulationResult: (slot, mode, result) =>
    set((state) => {
      const compareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      const workspace = compareWorkspace.slots[slot];
      if (!workspace) {
        return state;
      }
      workspace.simulationResults = {
        ...workspace.simulationResults,
        manual: mode === SimulationMode.Manual ? result : workspace.simulationResults.manual,
        monteCarlo:
          mode === SimulationMode.MonteCarlo ? result : workspace.simulationResults.monteCarlo,
        status: 'complete',
        mcStale: false,
        errorMessage: null,
      };
      workspace.simulationMode = mode;
      const compareHasStale = compareWorkspace.slotOrder.some(
        (slotId) => compareWorkspace.slots[slotId]?.simulationResults.mcStale,
      );

      const activeWorkspace = compareWorkspace.activeSlotId === slot;
      return activeWorkspace
        ? {
            compareWorkspace,
            simulationResults: {
              ...workspace.simulationResults,
              mcStale: compareHasStale,
            },
          }
        : { compareWorkspace };
    }),
  setCompareSlotStressStatus: (slot, status, errorMessage = null) =>
    set((state) => {
      const compareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      const workspace = compareWorkspace.slots[slot];
      if (!workspace) {
        return state;
      }
      workspace.stress = {
        ...workspace.stress,
        status,
        errorMessage,
      };

      const activeWorkspace = compareWorkspace.activeSlotId === slot;
      return activeWorkspace
        ? {
            compareWorkspace,
            stress: {
              ...state.stress,
              status,
              errorMessage,
              result: workspace.stress.result,
            },
          }
        : { compareWorkspace };
    }),
  setCompareSlotStressResult: (slot, result) =>
    set((state) => {
      const compareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      const workspace = compareWorkspace.slots[slot];
      if (!workspace) {
        return state;
      }
      workspace.stress = {
        ...workspace.stress,
        result,
        status: 'complete',
        errorMessage: null,
      };

      const activeWorkspace = compareWorkspace.activeSlotId === slot;
      return activeWorkspace
        ? {
            compareWorkspace,
            stress: {
              ...state.stress,
              result,
              status: 'complete',
              errorMessage: null,
            },
          }
        : { compareWorkspace };
    }),
  clearCompareSlotStressResult: (slot) =>
    set((state) => {
      const compareWorkspace = cloneCompareWorkspace(state.compareWorkspace);
      const workspace = compareWorkspace.slots[slot];
      if (!workspace) {
        return state;
      }
      workspace.stress = {
        ...workspace.stress,
        result: null,
        status: 'idle',
        errorMessage: null,
      };

      const activeWorkspace = compareWorkspace.activeSlotId === slot;
      return activeWorkspace
        ? {
            compareWorkspace,
            stress: {
              ...state.stress,
              result: null,
              status: 'idle',
              errorMessage: null,
            },
          }
        : { compareWorkspace };
    }),
  setReforecastResult: (result) =>
    set((state) => ({
      simulationResults: {
        ...state.simulationResults,
        reforecast: result,
        status: 'complete',
        errorMessage: null,
      },
    })),
  toggleStressPanel: () =>
    set((state) => ({
      stress: { ...state.stress, isExpanded: !state.stress.isExpanded },
    })),
  addStressScenario: () =>
    set((state) => {
      if (state.stress.scenarios.length >= 4) {
        return state;
      }
      return {
        stress: {
          ...state.stress,
          scenarios: [
            ...state.stress.scenarios,
            defaultStressScenario(state.stress.scenarios.length),
          ],
        },
      };
    }),
  removeStressScenario: (id) =>
    set((state) => ({
      stress: {
        ...state.stress,
        scenarios: state.stress.scenarios.filter((scenario) => scenario.id !== id),
      },
    })),
  updateStressScenario: (id, scenario) =>
    set((state) => ({
      stress: {
        ...state.stress,
        scenarios: state.stress.scenarios.map((entry) => (entry.id === id ? scenario : entry)),
      },
    })),
  setStressStatus: (status, errorMessage = null) =>
    set((state) => ({
      stress: {
        ...state.stress,
        status,
        errorMessage,
      },
    })),
  setStressResult: (result) =>
    set((state) => ({
      stress: {
        ...state.stress,
        result,
        status: 'complete',
        errorMessage: null,
      },
    })),
  clearStressResult: () =>
    set((state) => ({
      stress: {
        ...state.stress,
        result: null,
        status: 'idle',
        errorMessage: null,
      },
    })),
  setChartDisplayMode: (chartDisplayMode) =>
    set((state) => ({
      ui: { ...state.ui, chartDisplayMode },
    })),
  setChartBreakdownEnabled: (chartBreakdownEnabled) =>
    set((state) => ({
      ui: { ...state.ui, chartBreakdownEnabled },
    })),
  setChartZoom: (chartZoom) =>
    set((state) => ({
      ui: { ...state.ui, chartZoom },
    })),
  setTableGranularity: (tableGranularity) =>
    set((state) => ({
      ui: { ...state.ui, tableGranularity },
    })),
  setTableAssetColumnsEnabled: (tableAssetColumnsEnabled) =>
    set((state) => ({
      ui: { ...state.ui, tableAssetColumnsEnabled },
    })),
  setTableSpreadsheetMode: (tableSpreadsheetMode) =>
    set((state) => ({
      ui: { ...state.ui, tableSpreadsheetMode },
    })),
  setTableSort: (tableSort) =>
    set((state) => ({
      ui: { ...state.ui, tableSort },
    })),
  toggleSection: (id) =>
    set((state) => ({
      ui: {
        ...state.ui,
        collapsedSections: {
          ...state.ui.collapsedSections,
          [id]: !state.ui.collapsedSections[id],
        },
      },
    })),
  toggleSidebar: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        isSidebarCollapsed: !state.ui.isSidebarCollapsed,
      },
    })),
  setThemeState: (payload) =>
    set((state) => ({
      theme: {
        selectedThemeFamilyId: payload.selectedThemeFamilyId ?? state.theme.selectedThemeFamilyId,
        selectedAppearanceByFamily:
          payload.selectedAppearanceByFamily ?? state.theme.selectedAppearanceByFamily,
        defaultThemeFamilyId: payload.defaultThemeFamilyId ?? state.theme.defaultThemeFamilyId,
        defaultAppearance: payload.defaultAppearance ?? state.theme.defaultAppearance,
        activeVariantId:
          payload.activeVariantId === undefined
            ? state.theme.activeVariantId
            : payload.activeVariantId,
        variants: payload.variants ?? state.theme.variants,
        families: payload.families ?? state.theme.families,
        legacyDefaultThemeId: payload.legacyDefaultThemeId ?? state.theme.legacyDefaultThemeId,
        legacyThemes: payload.legacyThemes ?? state.theme.legacyThemes,
        legacyCatalog: payload.legacyCatalog ?? state.theme.legacyCatalog,
        slotCatalog: payload.slotCatalog ?? state.theme.slotCatalog,
        validationIssues: payload.validationIssues ?? state.theme.validationIssues,
        status: payload.status ?? state.theme.status,
        errorMessage:
          payload.errorMessage === undefined ? state.theme.errorMessage : payload.errorMessage,
      },
    })),
  setSelectedThemeFamilyId: (familyId) =>
    set((state) => ({
      theme: {
        ...state.theme,
        selectedThemeFamilyId: familyId,
      },
    })),
  setThemeAppearanceForFamily: (familyId, appearance) =>
    set((state) => ({
      theme: {
        ...state.theme,
        selectedAppearanceByFamily: {
          ...state.theme.selectedAppearanceByFamily,
          [familyId]: appearance,
        },
      },
    })),
  setStateFromSnapshot: (snapshotState) =>
    set((state) => ({
      ...state,
      ...cloneSnapshotState(snapshotState),
    })),
}));

export const useSimulationConfig = () =>
  useAppStore((state) => ({
    mode: state.mode,
    simulationMode: state.simulationMode,
    selectedHistoricalEra: state.selectedHistoricalEra,
    coreParams: state.coreParams,
    portfolio: state.portfolio,
    returnAssumptions: state.returnAssumptions,
    spendingPhases: state.spendingPhases,
    withdrawalStrategy: state.withdrawalStrategy,
    drawdownStrategy: state.drawdownStrategy,
    incomeEvents: state.incomeEvents,
    expenseEvents: state.expenseEvents,
  }));

export const usePortfolioTotal = () =>
  useAppStore((state) => state.portfolio.stocks + state.portfolio.bonds + state.portfolio.cash);

export const useCanAddPhase = () => useAppStore((state) => state.spendingPhases.length < 4);

export const useRunSimulation = () =>
  useAppStore((state) => ({
    mode: state.mode,
    setSimulationStatus: state.setSimulationStatus,
    setSimulationResult: state.setSimulationResult,
  }));

export const useActiveSimulationResult = () =>
  useAppStore((state) => {
    if (state.mode === AppMode.Tracking && state.simulationMode === SimulationMode.Manual) {
      return state.simulationResults.manual ?? state.simulationResults.reforecast;
    }
    if (state.mode === AppMode.Tracking && state.simulationMode === SimulationMode.MonteCarlo) {
      return (
        state.simulationResults.monteCarlo ??
        state.simulationResults.reforecast ??
        state.simulationResults.manual
      );
    }
    if (state.simulationMode === SimulationMode.Manual) {
      return state.simulationResults.manual;
    }
    return state.simulationResults.monteCarlo ?? state.simulationResults.manual;
  });

export const useTrackingActuals = () =>
  useAppStore((state) => ({
    actualOverridesByMonth: state.actualOverridesByMonth,
    lastEditedMonthIndex: state.lastEditedMonthIndex,
  }));

export const useTrackingOutputsStale = () =>
  useAppStore((state) => {
    if (state.mode !== AppMode.Tracking) {
      return false;
    }
    if (!isCompareActiveFromWorkspace(state.compareWorkspace)) {
      return state.simulationResults.mcStale;
    }
    return state.compareWorkspace.slotOrder.some(
      (slotId) => state.compareWorkspace.slots[slotId]?.simulationResults.mcStale,
    );
  });

export const useCompareSimulationResults = () => useAppStore((state) => state.compareWorkspace);

export const useIsCompareActive = () =>
  useAppStore((state) => state.compareWorkspace.slotOrder.length > 1);

export const useCompareSyncState = () => useAppStore((state) => state.compareWorkspace.compareSync);

export const useIsCompareMasterSlotActive = () =>
  useAppStore((state) => state.compareWorkspace.activeSlotId === 'A');

export const useCompareFamilyLockUiState = (family: CompareSyncFamilyKey) => {
  const slotId = useAppStore((state) => state.compareWorkspace.activeSlotId);
  const locked = useAppStore((state) => state.compareWorkspace.compareSync.familyLocks[family]);
  const synced = useAppStore((state) =>
    isSlotFamilySynced(
      state.compareWorkspace.compareSync,
      state.compareWorkspace.activeSlotId,
      family,
    ),
  );
  const readOnly = slotId !== 'A' && locked && synced;
  return { slotId, locked, synced, readOnly };
};

export const useCompareInstanceLockUiState = (
  family: CompareSyncListFamilyKey,
  instanceId: string,
) => {
  const slotId = useAppStore((state) => state.compareWorkspace.activeSlotId);
  const familyLocked = useAppStore(
    (state) => state.compareWorkspace.compareSync.familyLocks[family],
  );
  const familySynced = useAppStore((state) =>
    isSlotFamilySynced(
      state.compareWorkspace.compareSync,
      state.compareWorkspace.activeSlotId,
      family,
    ),
  );
  const instanceLocked = useAppStore(
    (state) => state.compareWorkspace.compareSync.instanceLocks[family][instanceId] === true,
  );
  const spendingLockEligible = useAppStore((state) => {
    if (family !== 'spendingPhases') {
      return true;
    }
    if (state.compareWorkspace.activeSlotId !== 'A') {
      return true;
    }
    if (state.compareWorkspace.compareSync.instanceLocks.spendingPhases[instanceId] === true) {
      return true;
    }
    const masterPhases = state.spendingPhases;
    return isSpendingPhaseLockEligible(
      instanceId,
      masterPhases,
      state.compareWorkspace.compareSync.instanceLocks.spendingPhases,
    );
  });
  const instanceSynced = useAppStore((state) =>
    isSlotInstanceSynced(
      state.compareWorkspace.compareSync,
      state.compareWorkspace.activeSlotId,
      family,
      instanceId,
    ),
  );
  const readOnly =
    slotId !== 'A' && ((familyLocked && familySynced) || (instanceLocked && instanceSynced));
  return {
    slotId,
    familyLocked,
    familySynced,
    instanceLocked,
    canToggleLock: spendingLockEligible,
    lockDisabledReason:
      family === 'spendingPhases' && slotId === 'A' && !spendingLockEligible
        ? 'Lock prior phase first'
        : null,
    instanceSynced,
    readOnly,
  };
};

export const useCompareStressResults = () =>
  useAppStore((state) => ({
    bySlot: Object.fromEntries(
      state.compareWorkspace.slotOrder.map((slotId) => [
        slotId,
        state.compareWorkspace.slots[slotId]?.stress ?? null,
      ]),
    ) as Partial<Record<CompareSlotId, WorkspaceSnapshot['stress'] | null>>,
    activeSlotId: state.compareWorkspace.activeSlotId,
  }));

export const getTrackingActualOverridesForRun = (): ActualOverridesByMonth | undefined => {
  const state = useAppStore.getState();
  if (state.mode !== AppMode.Tracking) {
    return undefined;
  }
  if (isCompareActiveFromWorkspace(state.compareWorkspace)) {
    return sanitizeTrackingActualOverrides(
      state.compareWorkspace.slots.A?.actualOverridesByMonth ?? {},
    );
  }
  return sanitizeTrackingActualOverrides(state.actualOverridesByMonth);
};

const snapshotStateFromStore = (state: AppStore): SnapshotState => {
  const compareWorkspace = compareWorkspaceWithCurrentState(state);

  return {
    mode: state.mode,
    trackingInitialized: state.trackingInitialized,
    planningWorkspace: state.planningWorkspace ? cloneWorkspace(state.planningWorkspace) : null,
    trackingWorkspace: state.trackingWorkspace ? cloneWorkspace(state.trackingWorkspace) : null,
    compareWorkspace,
    simulationMode: state.simulationMode,
    selectedHistoricalEra: state.selectedHistoricalEra,
    coreParams: {
      ...state.coreParams,
      retirementStartDate: { ...state.coreParams.retirementStartDate },
    },
    portfolio: { ...state.portfolio },
    returnAssumptions: {
      stocks: { ...state.returnAssumptions.stocks },
      bonds: { ...state.returnAssumptions.bonds },
      cash: { ...state.returnAssumptions.cash },
    },
    spendingPhases: state.spendingPhases.map((phase) => ({ ...phase })),
    withdrawalStrategy: {
      type: state.withdrawalStrategy.type,
      params: { ...state.withdrawalStrategy.params },
    },
    drawdownStrategy: {
      type: state.drawdownStrategy.type,
      bucketOrder: [...state.drawdownStrategy.bucketOrder],
      rebalancing: {
        targetAllocation: { ...state.drawdownStrategy.rebalancing.targetAllocation },
        glidePathEnabled: state.drawdownStrategy.rebalancing.glidePathEnabled,
        glidePath: state.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
          year: waypoint.year,
          allocation: { ...waypoint.allocation },
        })),
      },
    },
    historicalData: {
      ...state.historicalData,
      summary: state.historicalData.summary
        ? {
            ...state.historicalData.summary,
            selectedEra: { ...state.historicalData.summary.selectedEra },
            eras: state.historicalData.summary.eras.map((era) => ({ ...era })),
            byAsset: {
              stocks: { ...state.historicalData.summary.byAsset.stocks },
              bonds: { ...state.historicalData.summary.byAsset.bonds },
              cash: { ...state.historicalData.summary.byAsset.cash },
            },
          }
        : null,
    },
    incomeEvents: state.incomeEvents.map((event) => ({
      ...event,
      start: { ...event.start },
      end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
    })),
    expenseEvents: state.expenseEvents.map((event) => ({
      ...event,
      start: { ...event.start },
      end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
    })),
    actualOverridesByMonth: Object.fromEntries(
      Object.entries(state.actualOverridesByMonth).map(([month, value]) => [
        month,
        {
          startBalances: value.startBalances ? { ...value.startBalances } : undefined,
          withdrawalsByAsset: value.withdrawalsByAsset
            ? { ...value.withdrawalsByAsset }
            : undefined,
          incomeTotal: value.incomeTotal,
          expenseTotal: value.expenseTotal,
        },
      ]),
    ),
    lastEditedMonthIndex: state.lastEditedMonthIndex,
    simulationResults: cloneWorkspace(workspaceFromState(state)).simulationResults,
    stress: cloneWorkspace(workspaceFromState(state)).stress,
    theme: {
      selectedThemeFamilyId: state.theme.selectedThemeFamilyId,
      selectedAppearanceByFamily: { ...state.theme.selectedAppearanceByFamily },
      defaultThemeFamilyId: state.theme.defaultThemeFamilyId,
      defaultAppearance: state.theme.defaultAppearance,
      activeVariantId: state.theme.activeVariantId,
      variants: state.theme.variants.map((theme) => ({ ...theme })),
      families: state.theme.families.map((item) => ({ ...item })),
      legacyDefaultThemeId: state.theme.legacyDefaultThemeId,
      legacyThemes: state.theme.legacyThemes.map((theme) => ({ ...theme })),
      legacyCatalog: state.theme.legacyCatalog.map((item) => ({ ...item })),
      slotCatalog: state.theme.slotCatalog.map((item) => ({ ...item })),
      validationIssues: state.theme.validationIssues.map((issue) => ({ ...issue })),
      status: state.theme.status,
      errorMessage: state.theme.errorMessage,
    },
    ui: {
      ...state.ui,
      chartZoom: state.ui.chartZoom ? { ...state.ui.chartZoom } : null,
      tableSort: state.ui.tableSort ? { ...state.ui.tableSort } : null,
      collapsedSections: { ...state.ui.collapsedSections },
    },
  };
};

export const getSnapshotState = (): SnapshotState => snapshotStateFromStore(useAppStore.getState());

export const getCompareWorkspaceState = (): SnapshotState['compareWorkspace'] => {
  const state = useAppStore.getState();
  return compareWorkspaceWithCurrentState(state);
};

const configFromWorkspace = (workspace: WorkspaceSnapshot, mode: AppMode): SimulationConfig => {
  const effectiveWithdrawalStrategy = resolveWithdrawalStrategyConfig(
    workspace.withdrawalStrategy.type,
    workspace.withdrawalStrategy.params,
  );
  const effectiveDrawdownStrategy: DrawdownStrategy =
    workspace.drawdownStrategy.type === DrawdownStrategyType.Bucket
      ? {
          type: DrawdownStrategyType.Bucket,
          bucketOrder: workspace.drawdownStrategy.bucketOrder,
        }
      : {
          type: DrawdownStrategyType.Rebalancing,
          rebalancing: {
            targetAllocation: normalizeAllocation(
              workspace.drawdownStrategy.rebalancing.targetAllocation,
            ),
            glidePathEnabled: workspace.drawdownStrategy.rebalancing.glidePathEnabled,
            glidePath: workspace.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
              year: waypoint.year,
              allocation: normalizeAllocation(waypoint.allocation),
            })),
          },
        };

  return {
    mode,
    simulationMode: workspace.simulationMode,
    selectedHistoricalEra: workspace.selectedHistoricalEra,
    coreParams: workspace.coreParams,
    portfolio: workspace.portfolio,
    returnAssumptions: workspace.returnAssumptions,
    spendingPhases: workspace.spendingPhases,
    withdrawalStrategy: effectiveWithdrawalStrategy,
    drawdownStrategy: effectiveDrawdownStrategy,
    incomeEvents: workspace.incomeEvents,
    expenseEvents: workspace.expenseEvents,
  };
};

export const getCompareConfigForSlot = (slot: CompareSlotId): SimulationConfig | null => {
  const state = useAppStore.getState();
  const compareWorkspace = getCompareWorkspaceState();
  const workspace = compareWorkspace.slots[slot];
  if (!workspace) {
    return null;
  }
  return configFromWorkspace(workspace, state.mode);
};

export const getCompareConfigs = (): Array<{ slotId: CompareSlotId; config: SimulationConfig }> => {
  const state = useAppStore.getState();
  const compareWorkspace = getCompareWorkspaceState();
  return compareWorkspace.slotOrder
    .map((slotId) => {
      const workspace = compareWorkspace.slots[slotId];
      if (!workspace) {
        return null;
      }
      return {
        slotId,
        config: configFromWorkspace(workspace, state.mode),
      };
    })
    .filter(
      (entry): entry is { slotId: CompareSlotId; config: SimulationConfig } => entry !== null,
    );
};

export const getCurrentConfig = (): SimulationConfig => {
  const state = useAppStore.getState();
  return configFromWorkspace(cloneWorkspace(workspaceFromState(state)), state.mode);
};

export const isRebalancingAllocationValid = () => {
  const state = useAppStore.getState();
  if (state.drawdownStrategy.type !== DrawdownStrategyType.Rebalancing) {
    return true;
  }
  const allocation = state.drawdownStrategy.rebalancing.targetAllocation;
  const sum = allocation.stocks + allocation.bonds + allocation.cash;
  return Math.abs(sum - 1) < 0.000001;
};
