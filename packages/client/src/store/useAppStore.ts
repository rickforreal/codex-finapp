import { create } from 'zustand';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
  SimulationMode,
  WithdrawalStrategyType,
  type DrawdownStrategy,
  type ActualMonthOverride,
  type ActualOverridesByMonth,
  type HistoricalDataSummary,
  type StressScenario,
  type StressTestResult,
  type SimulationConfig,
  type SimulateResponse,
  type WithdrawalStrategyConfig,
} from '@finapp/shared';

import { createId } from '../lib/id';

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

type WithdrawalParamKey =
  | 'initialWithdrawalRate'
  | 'annualWithdrawalRate'
  | 'expectedRealReturn'
  | 'drawdownTarget'
  | 'expectedRateOfReturn'
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

type WithdrawalStrategyParamsForm = Record<WithdrawalParamKey, number>;

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
      glidePath: Array<{ year: number; allocation: { stocks: number; bonds: number; cash: number } }>;
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
      glidePath: Array<{ year: number; allocation: { stocks: number; bonds: number; cash: number } }>;
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
  };
};

export type AppStore = SnapshotState & {
  setMode: (mode: AppMode) => void;
  upsertActualOverride: (monthIndex: number, patch: Partial<ActualMonthOverride>) => void;
  clearActualRowOverrides: (monthIndex: number) => void;
  clearAllActualOverrides: () => void;
  setSimulationMode: (mode: SimulationMode) => void;
  setSelectedHistoricalEra: (era: HistoricalEra) => void;
  setHistoricalSummaryStatus: (status: 'idle' | 'loading' | 'ready' | 'error', errorMessage?: string | null) => void;
  setHistoricalSummary: (summary: HistoricalDataSummary) => void;
  setCoreParam: (key: keyof AppStore['coreParams'], value: number | { month: number; year: number }) => void;
  setPortfolioValue: (asset: AssetClass, value: number) => void;
  setReturnAssumption: (
    asset: AssetClass,
    key: 'expectedReturn' | 'stdDev',
    value: number,
  ) => void;
  addSpendingPhase: () => void;
  removeSpendingPhase: (id: string) => void;
  updateSpendingPhase: (id: string, patch: Partial<SpendingPhaseForm>) => void;
  setWithdrawalStrategyType: (type: WithdrawalStrategyType) => void;
  setWithdrawalParam: (key: WithdrawalParamKey, value: number) => void;
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
  setStateFromSnapshot: (snapshotState: SnapshotState) => void;
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
  const ending = normalizeAllocation({ stocks: endingStocks, bonds: endingBonds, cash: endingCash });
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
    const startYear = index === 0 ? clampedFirstStartYear : (previousEndYear ?? clampedFirstStartYear) + 1;
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
  coreParams: { ...workspace.coreParams, retirementStartDate: { ...workspace.coreParams.retirementStartDate } },
  portfolio: { ...workspace.portfolio },
  returnAssumptions: {
    stocks: { ...workspace.returnAssumptions.stocks },
    bonds: { ...workspace.returnAssumptions.bonds },
    cash: { ...workspace.returnAssumptions.cash },
  },
  spendingPhases: workspace.spendingPhases.map((phase) => ({ ...phase })),
  withdrawalStrategy: {
    ...workspace.withdrawalStrategy,
    params: { ...workspace.withdrawalStrategy.params },
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
  incomeEvents: workspace.incomeEvents.map((event) => ({ ...event, start: { ...event.start }, end: event.end === 'endOfRetirement' ? event.end : { ...event.end } })),
  expenseEvents: workspace.expenseEvents.map((event) => ({ ...event, start: { ...event.start }, end: event.end === 'endOfRetirement' ? event.end : { ...event.end } })),
  actualOverridesByMonth: Object.fromEntries(
    Object.entries(workspace.actualOverridesByMonth).map(([month, value]) => [month, {
      startBalances: value.startBalances ? { ...value.startBalances } : undefined,
      withdrawalsByAsset: value.withdrawalsByAsset ? { ...value.withdrawalsByAsset } : undefined,
      incomeTotal: value.incomeTotal,
      expenseTotal: value.expenseTotal,
    }]),
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

const workspaceFromState = (state: AppStore): WorkspaceSnapshot => ({
  simulationMode: state.simulationMode,
  selectedHistoricalEra: state.selectedHistoricalEra,
  coreParams: { ...state.coreParams, retirementStartDate: { ...state.coreParams.retirementStartDate } },
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
  historicalData: state.historicalData,
  incomeEvents: state.incomeEvents.map((event) => ({ ...event, start: { ...event.start }, end: event.end === 'endOfRetirement' ? event.end : { ...event.end } })),
  expenseEvents: state.expenseEvents.map((event) => ({ ...event, start: { ...event.start }, end: event.end === 'endOfRetirement' ? event.end : { ...event.end } })),
  actualOverridesByMonth: state.actualOverridesByMonth,
  lastEditedMonthIndex: state.lastEditedMonthIndex,
  simulationResults: { ...state.simulationResults },
  stress: {
    ...state.stress,
    scenarios: state.stress.scenarios.map((scenario) => ({ ...scenario })) as StressScenario[],
    result: state.stress.result,
  },
});

const trackingSimulationResultsCleared = (results: WorkspaceSnapshot['simulationResults']): WorkspaceSnapshot['simulationResults'] => ({
  ...results,
  manual: null,
  monteCarlo: null,
  reforecast: null,
  mcStale: false,
  status: 'idle',
  errorMessage: null,
});

const cloneSnapshotState = (snapshot: SnapshotState): SnapshotState => ({
  mode: snapshot.mode,
  trackingInitialized: snapshot.trackingInitialized,
  planningWorkspace: snapshot.planningWorkspace ? cloneWorkspace(snapshot.planningWorkspace) : null,
  trackingWorkspace: snapshot.trackingWorkspace ? cloneWorkspace(snapshot.trackingWorkspace) : null,
  simulationMode: snapshot.simulationMode,
  selectedHistoricalEra: snapshot.selectedHistoricalEra,
  coreParams: {
    ...snapshot.coreParams,
    retirementStartDate: { ...snapshot.coreParams.retirementStartDate },
  },
  portfolio: { ...snapshot.portfolio },
  returnAssumptions: {
    stocks: { ...snapshot.returnAssumptions.stocks },
    bonds: { ...snapshot.returnAssumptions.bonds },
    cash: { ...snapshot.returnAssumptions.cash },
  },
  spendingPhases: snapshot.spendingPhases.map((phase) => ({ ...phase })),
  withdrawalStrategy: {
    type: snapshot.withdrawalStrategy.type,
    params: { ...snapshot.withdrawalStrategy.params },
  },
  drawdownStrategy: {
    type: snapshot.drawdownStrategy.type,
    bucketOrder: [...snapshot.drawdownStrategy.bucketOrder],
    rebalancing: {
      targetAllocation: { ...snapshot.drawdownStrategy.rebalancing.targetAllocation },
      glidePathEnabled: snapshot.drawdownStrategy.rebalancing.glidePathEnabled,
      glidePath: snapshot.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
        year: waypoint.year,
        allocation: { ...waypoint.allocation },
      })),
    },
  },
  historicalData: {
    ...snapshot.historicalData,
    summary: snapshot.historicalData.summary
      ? {
          ...snapshot.historicalData.summary,
          selectedEra: { ...snapshot.historicalData.summary.selectedEra },
          eras: snapshot.historicalData.summary.eras.map((era) => ({ ...era })),
          byAsset: {
            stocks: { ...snapshot.historicalData.summary.byAsset.stocks },
            bonds: { ...snapshot.historicalData.summary.byAsset.bonds },
            cash: { ...snapshot.historicalData.summary.byAsset.cash },
          },
        }
      : null,
  },
  incomeEvents: snapshot.incomeEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  expenseEvents: snapshot.expenseEvents.map((event) => ({
    ...event,
    start: { ...event.start },
    end: event.end === 'endOfRetirement' ? event.end : { ...event.end },
  })),
  actualOverridesByMonth: Object.fromEntries(
    Object.entries(snapshot.actualOverridesByMonth).map(([month, value]) => [month, {
      startBalances: value.startBalances ? { ...value.startBalances } : undefined,
      withdrawalsByAsset: value.withdrawalsByAsset ? { ...value.withdrawalsByAsset } : undefined,
      incomeTotal: value.incomeTotal,
      expenseTotal: value.expenseTotal,
    }]),
  ),
  lastEditedMonthIndex: snapshot.lastEditedMonthIndex,
  simulationResults: {
    ...snapshot.simulationResults,
    manual: snapshot.simulationResults.manual
      ? {
          ...snapshot.simulationResults.manual,
          result: {
            ...snapshot.simulationResults.manual.result,
            rows: snapshot.simulationResults.manual.result.rows.map((row) => ({
              ...row,
              startBalances: { ...row.startBalances },
              marketChange: { ...row.marketChange },
              withdrawals: {
                ...row.withdrawals,
                byAsset: { ...row.withdrawals.byAsset },
              },
              endBalances: { ...row.endBalances },
            })),
            summary: { ...snapshot.simulationResults.manual.result.summary },
          },
          monteCarlo: snapshot.simulationResults.manual.monteCarlo
            ? {
                ...snapshot.simulationResults.manual.monteCarlo,
                terminalValues: [...snapshot.simulationResults.manual.monteCarlo.terminalValues],
                percentileCurves: {
                  total: { ...snapshot.simulationResults.manual.monteCarlo.percentileCurves.total },
                  stocks: { ...snapshot.simulationResults.manual.monteCarlo.percentileCurves.stocks },
                  bonds: { ...snapshot.simulationResults.manual.monteCarlo.percentileCurves.bonds },
                  cash: { ...snapshot.simulationResults.manual.monteCarlo.percentileCurves.cash },
                },
              }
            : undefined,
        }
      : null,
    monteCarlo: snapshot.simulationResults.monteCarlo
      ? {
          ...snapshot.simulationResults.monteCarlo,
          result: {
            ...snapshot.simulationResults.monteCarlo.result,
            rows: snapshot.simulationResults.monteCarlo.result.rows.map((row) => ({
              ...row,
              startBalances: { ...row.startBalances },
              marketChange: { ...row.marketChange },
              withdrawals: {
                ...row.withdrawals,
                byAsset: { ...row.withdrawals.byAsset },
              },
              endBalances: { ...row.endBalances },
            })),
            summary: { ...snapshot.simulationResults.monteCarlo.result.summary },
          },
          monteCarlo: snapshot.simulationResults.monteCarlo.monteCarlo
            ? {
                ...snapshot.simulationResults.monteCarlo.monteCarlo,
                terminalValues: [...snapshot.simulationResults.monteCarlo.monteCarlo.terminalValues],
                percentileCurves: {
                  total: { ...snapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves.total },
                  stocks: { ...snapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves.stocks },
                  bonds: { ...snapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves.bonds },
                  cash: { ...snapshot.simulationResults.monteCarlo.monteCarlo.percentileCurves.cash },
                },
              }
            : undefined,
        }
      : null,
    reforecast: snapshot.simulationResults.reforecast
      ? {
          ...snapshot.simulationResults.reforecast,
          result: {
            ...snapshot.simulationResults.reforecast.result,
            rows: snapshot.simulationResults.reforecast.result.rows.map((row) => ({
              ...row,
              startBalances: { ...row.startBalances },
              marketChange: { ...row.marketChange },
              withdrawals: {
                ...row.withdrawals,
                byAsset: { ...row.withdrawals.byAsset },
              },
              endBalances: { ...row.endBalances },
            })),
            summary: { ...snapshot.simulationResults.reforecast.result.summary },
          },
          monteCarlo: snapshot.simulationResults.reforecast.monteCarlo
            ? {
                ...snapshot.simulationResults.reforecast.monteCarlo,
                terminalValues: [...snapshot.simulationResults.reforecast.monteCarlo.terminalValues],
                percentileCurves: {
                  total: { ...snapshot.simulationResults.reforecast.monteCarlo.percentileCurves.total },
                  stocks: { ...snapshot.simulationResults.reforecast.monteCarlo.percentileCurves.stocks },
                  bonds: { ...snapshot.simulationResults.reforecast.monteCarlo.percentileCurves.bonds },
                  cash: { ...snapshot.simulationResults.reforecast.monteCarlo.percentileCurves.cash },
                },
              }
            : undefined,
        }
      : null,
  },
  stress: {
    ...snapshot.stress,
    scenarios: snapshot.stress.scenarios.map((scenario) => ({ ...scenario })),
    result: snapshot.stress.result
      ? {
          ...snapshot.stress.result,
          base: { ...snapshot.stress.result.base },
          scenarios: snapshot.stress.result.scenarios.map((scenario) => ({ ...scenario })),
          timingSensitivity: snapshot.stress.result.timingSensitivity?.map((series) => ({
            ...series,
            points: series.points.map((point) => ({ ...point })),
          })),
        }
      : null,
  },
  ui: {
    ...snapshot.ui,
    chartZoom: snapshot.ui.chartZoom ? { ...snapshot.ui.chartZoom } : null,
    tableSort: snapshot.ui.tableSort ? { ...snapshot.ui.tableSort } : null,
    collapsedSections: { ...snapshot.ui.collapsedSections },
  },
});

export const useAppStore = create<AppStore>((set) => ({
  mode: AppMode.Planning,
  trackingInitialized: false,
  planningWorkspace: null,
  trackingWorkspace: null,
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
  spendingPhases: [defaultPhase()],
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
    isExpanded: false,
    scenarios: [],
    result: null,
    status: 'idle',
    errorMessage: null,
  },
  ui: {
    chartDisplayMode: 'nominal',
    chartBreakdownEnabled: false,
    tableGranularity: 'annual',
    tableAssetColumnsEnabled: false,
    tableSpreadsheetMode: false,
    tableSort: null,
    chartZoom: null,
    reforecastStatus: 'idle',
    collapsedSections: {},
  },
  setMode: (mode) =>
    set((state) => {
      if (mode === state.mode) {
        return state;
      }

      const currentWorkspace = cloneWorkspace(workspaceFromState(state));
      const planningWorkspace =
        state.mode === AppMode.Planning ? currentWorkspace : state.planningWorkspace ?? currentWorkspace;
      const trackingWorkspace =
        state.mode === AppMode.Tracking ? currentWorkspace : state.trackingWorkspace;

      if (mode === AppMode.Tracking) {
        if (!state.trackingInitialized) {
          const seededTracking = cloneWorkspace(currentWorkspace);
          seededTracking.simulationResults = trackingSimulationResultsCleared(seededTracking.simulationResults);
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
            simulationMode: seededTracking.simulationMode,
            selectedHistoricalEra: seededTracking.selectedHistoricalEra,
            coreParams: seededTracking.coreParams,
            portfolio: seededTracking.portfolio,
            returnAssumptions: seededTracking.returnAssumptions,
            spendingPhases: seededTracking.spendingPhases,
            withdrawalStrategy: seededTracking.withdrawalStrategy,
            drawdownStrategy: seededTracking.drawdownStrategy,
            historicalData: seededTracking.historicalData,
            incomeEvents: seededTracking.incomeEvents,
            expenseEvents: seededTracking.expenseEvents,
            actualOverridesByMonth: seededTracking.actualOverridesByMonth,
            lastEditedMonthIndex: seededTracking.lastEditedMonthIndex,
            simulationResults: seededTracking.simulationResults,
            stress: seededTracking.stress,
          };
        }

        const nextTracking = state.trackingWorkspace
          ? cloneWorkspace(state.trackingWorkspace)
          : cloneWorkspace(currentWorkspace);
        return {
          mode,
          planningWorkspace,
          trackingWorkspace: nextTracking,
          simulationMode: nextTracking.simulationMode,
          selectedHistoricalEra: nextTracking.selectedHistoricalEra,
          coreParams: nextTracking.coreParams,
          portfolio: nextTracking.portfolio,
          returnAssumptions: nextTracking.returnAssumptions,
          spendingPhases: nextTracking.spendingPhases,
          withdrawalStrategy: nextTracking.withdrawalStrategy,
          drawdownStrategy: nextTracking.drawdownStrategy,
          historicalData: nextTracking.historicalData,
          incomeEvents: nextTracking.incomeEvents,
          expenseEvents: nextTracking.expenseEvents,
          actualOverridesByMonth: nextTracking.actualOverridesByMonth,
          lastEditedMonthIndex: nextTracking.lastEditedMonthIndex,
          simulationResults: nextTracking.simulationResults,
          stress: nextTracking.stress,
        };
      }

      const nextPlanning = state.planningWorkspace
        ? cloneWorkspace(state.planningWorkspace)
        : cloneWorkspace(currentWorkspace);
      return {
        mode,
        planningWorkspace: nextPlanning,
        trackingWorkspace,
        simulationMode: nextPlanning.simulationMode,
        selectedHistoricalEra: nextPlanning.selectedHistoricalEra,
        coreParams: nextPlanning.coreParams,
        portfolio: nextPlanning.portfolio,
        returnAssumptions: nextPlanning.returnAssumptions,
        spendingPhases: nextPlanning.spendingPhases,
        withdrawalStrategy: nextPlanning.withdrawalStrategy,
        drawdownStrategy: nextPlanning.drawdownStrategy,
        historicalData: nextPlanning.historicalData,
        incomeEvents: nextPlanning.incomeEvents,
        expenseEvents: nextPlanning.expenseEvents,
        actualOverridesByMonth: nextPlanning.actualOverridesByMonth,
        lastEditedMonthIndex: nextPlanning.lastEditedMonthIndex,
        simulationResults: nextPlanning.simulationResults,
        stress: nextPlanning.stress,
      };
    }),
  upsertActualOverride: (monthIndex, patch) =>
    set((state) => {
      if (monthIndex <= 0) {
        return state;
      }
      const existing = state.actualOverridesByMonth[monthIndex] ?? {};
      const next: ActualMonthOverride = {
        ...existing,
        ...patch,
      };
      return {
        actualOverridesByMonth: {
          ...state.actualOverridesByMonth,
          [monthIndex]: next,
        },
        lastEditedMonthIndex: Math.max(state.lastEditedMonthIndex ?? 0, monthIndex),
        simulationResults:
          state.mode === AppMode.Tracking && state.simulationMode === SimulationMode.MonteCarlo
            ? { ...state.simulationResults, mcStale: true }
            : state.simulationResults,
      };
    }),
  clearActualRowOverrides: (monthIndex) =>
    set((state) => {
      const next = { ...state.actualOverridesByMonth };
      delete next[monthIndex];
      const editedMonths = Object.keys(next)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0);
      return {
        actualOverridesByMonth: next,
        lastEditedMonthIndex: editedMonths.length > 0 ? Math.max(...editedMonths) : null,
        simulationResults:
          state.mode === AppMode.Tracking && state.simulationMode === SimulationMode.MonteCarlo
            ? { ...state.simulationResults, mcStale: true }
            : state.simulationResults,
      };
    }),
  clearAllActualOverrides: () =>
    set((state) => ({
      actualOverridesByMonth: {},
      lastEditedMonthIndex: null,
      simulationResults:
        state.mode === AppMode.Tracking && state.simulationMode === SimulationMode.MonteCarlo
          ? { ...state.simulationResults, mcStale: true }
          : state.simulationResults,
    })),
  setSimulationMode: (simulationMode) => set({ simulationMode }),
  setSelectedHistoricalEra: (selectedHistoricalEra) => set({ selectedHistoricalEra }),
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
        const nextGlidePath = state.drawdownStrategy.rebalancing.glidePath.map((waypoint, index, all) => {
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
        });
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
        };
      }
      return { coreParams: nextCore };
    }),
  setPortfolioValue: (asset, value) =>
    set((state) => ({
      portfolio: { ...state.portfolio, [asset]: Math.max(0, Math.round(value)) },
    })),
  setReturnAssumption: (asset, key, value) =>
    set((state) => ({
      returnAssumptions: {
        ...state.returnAssumptions,
        [asset]: { ...state.returnAssumptions[asset], [key]: value },
      },
    })),
  addSpendingPhase: () =>
    set((state) => {
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
      const next = [...state.spendingPhases, {
        ...defaultPhase(),
        name: `Phase ${state.spendingPhases.length + 1}`,
        startYear: retirementYears,
        endYear: retirementYears,
      }];
      return { spendingPhases: recalculatePhaseBoundaries(next, retirementYears, firstPhaseStartYear) };
    }),
  removeSpendingPhase: (id) =>
    set((state) => {
      if (state.spendingPhases.length <= 1) {
        return state;
      }
      const next = state.spendingPhases.filter((phase) => phase.id !== id);
      const firstPhaseStartYear = resolveFirstPhaseStartYear(
        state.coreParams.startingAge,
        state.coreParams.withdrawalsStartAt,
      );
      return {
        spendingPhases: recalculatePhaseBoundaries(next, state.coreParams.retirementDuration, firstPhaseStartYear),
      };
    }),
  updateSpendingPhase: (id, patch) =>
    set((state) => {
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
      return {
        spendingPhases: recalculatePhaseBoundaries(next, state.coreParams.retirementDuration, firstPhaseStartYear),
      };
    }),
  setWithdrawalStrategyType: (type) =>
    set((state) => ({
      withdrawalStrategy: { ...state.withdrawalStrategy, type },
    })),
  setWithdrawalParam: (key, value) =>
    set((state) => ({
      withdrawalStrategy: {
        ...state.withdrawalStrategy,
        params: {
          ...state.withdrawalStrategy.params,
          [key]: value,
        },
      },
    })),
  setDrawdownType: (type) =>
    set((state) => ({
      drawdownStrategy: { ...state.drawdownStrategy, type },
    })),
  moveBucketAsset: (asset, direction) =>
    set((state) => {
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
      return {
        drawdownStrategy: { ...state.drawdownStrategy, bucketOrder: order },
      };
    }),
  setRebalancingTargetAllocation: (asset, value) =>
    set((state) => ({
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
    })),
  setGlidePathEnabled: (enabled) =>
    set((state) => ({
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
    })),
  addGlidePathWaypoint: () =>
    set((state) => {
      const existing = [...state.drawdownStrategy.rebalancing.glidePath].sort((a, b) => a.year - b.year);
      if (existing.length < 2) {
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
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: {
            ...state.drawdownStrategy.rebalancing,
            glidePath: [...existing, { year: nextYear, allocation: normalizeAllocation(last.allocation) }].sort(
              (a, b) => a.year - b.year,
            ),
          },
        },
      };
    }),
  removeGlidePathWaypoint: (year) =>
    set((state) => {
      const next = state.drawdownStrategy.rebalancing.glidePath.filter((waypoint) => waypoint.year !== year);
      if (next.length < 2) {
        return state;
      }
      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: { ...state.drawdownStrategy.rebalancing, glidePath: next },
        },
      };
    }),
  updateGlidePathWaypoint: (year, patch) =>
    set((state) => {
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

      return {
        drawdownStrategy: {
          ...state.drawdownStrategy,
          rebalancing: {
            ...state.drawdownStrategy.rebalancing,
            glidePath: waypoints.sort((a, b) => a.year - b.year),
          },
        },
      };
    }),
  addIncomeEvent: (preset) =>
    set((state) => ({
      incomeEvents: [
        ...state.incomeEvents,
        preset ? { ...defaultIncomeEvent(), ...incomeEventPreset(preset), id: createId('income') } : defaultIncomeEvent(),
      ],
    })),
  removeIncomeEvent: (id) =>
    set((state) => ({
      incomeEvents: state.incomeEvents.filter((event) => event.id !== id),
    })),
  updateIncomeEvent: (id, patch) =>
    set((state) => ({
      incomeEvents: state.incomeEvents.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    })),
  addExpenseEvent: (preset) =>
    set((state) => ({
      expenseEvents: [
        ...state.expenseEvents,
        preset
          ? { ...defaultExpenseEvent(), ...expenseEventPreset(preset), id: createId('expense') }
          : defaultExpenseEvent(),
      ],
    })),
  removeExpenseEvent: (id) =>
    set((state) => ({
      expenseEvents: state.expenseEvents.filter((event) => event.id !== id),
    })),
  updateExpenseEvent: (id, patch) =>
    set((state) => ({
      expenseEvents: state.expenseEvents.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    })),
  setSimulationStatus: (status, errorMessage = null) =>
    set((state) => ({
      simulationResults: { ...state.simulationResults, status, errorMessage },
    })),
  setSimulationResult: (mode, result) =>
    set((state) => ({
      simulationResults: {
        ...state.simulationResults,
        manual: mode === SimulationMode.Manual ? result : state.simulationResults.manual,
        monteCarlo: mode === SimulationMode.MonteCarlo ? result : state.simulationResults.monteCarlo,
        reforecast:
          state.mode === AppMode.Tracking && mode === SimulationMode.Manual
            ? result
            : state.simulationResults.reforecast,
        status: 'complete',
        mcStale:
          state.mode === AppMode.Tracking && mode === SimulationMode.MonteCarlo
            ? false
            : state.simulationResults.mcStale,
        errorMessage: null,
      },
    })),
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
          scenarios: [...state.stress.scenarios, defaultStressScenario(state.stress.scenarios.length)],
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
        scenarios: state.stress.scenarios.map((entry) =>
          entry.id === id ? scenario : entry,
        ),
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
      if (state.lastEditedMonthIndex !== null) {
        return state.simulationResults.reforecast ?? state.simulationResults.manual;
      }
      return state.simulationResults.manual;
    }
    return state.simulationMode === SimulationMode.Manual
      ? state.simulationResults.manual
      : state.simulationResults.monteCarlo;
  });

export const useTrackingActuals = () =>
  useAppStore((state) => ({
    actualOverridesByMonth: state.actualOverridesByMonth,
    lastEditedMonthIndex: state.lastEditedMonthIndex,
  }));

const snapshotStateFromStore = (state: AppStore): SnapshotState => ({
  mode: state.mode,
  trackingInitialized: state.trackingInitialized,
  planningWorkspace: state.planningWorkspace ? cloneWorkspace(state.planningWorkspace) : null,
  trackingWorkspace: state.trackingWorkspace ? cloneWorkspace(state.trackingWorkspace) : null,
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
    Object.entries(state.actualOverridesByMonth).map(([month, value]) => [month, {
      startBalances: value.startBalances ? { ...value.startBalances } : undefined,
      withdrawalsByAsset: value.withdrawalsByAsset ? { ...value.withdrawalsByAsset } : undefined,
      incomeTotal: value.incomeTotal,
      expenseTotal: value.expenseTotal,
    }]),
  ),
  lastEditedMonthIndex: state.lastEditedMonthIndex,
  simulationResults: cloneWorkspace(workspaceFromState(state)).simulationResults,
  stress: cloneWorkspace(workspaceFromState(state)).stress,
  ui: {
    ...state.ui,
    chartZoom: state.ui.chartZoom ? { ...state.ui.chartZoom } : null,
    tableSort: state.ui.tableSort ? { ...state.ui.tableSort } : null,
    collapsedSections: { ...state.ui.collapsedSections },
  },
});

export const getSnapshotState = (): SnapshotState => snapshotStateFromStore(useAppStore.getState());

export const getCurrentConfig = (): SimulationConfig => {
  const state = useAppStore.getState();
  const effectiveWithdrawalStrategy = resolveWithdrawalStrategyConfig(
    state.withdrawalStrategy.type,
    state.withdrawalStrategy.params,
  );

  const effectiveDrawdownStrategy: DrawdownStrategy =
    state.drawdownStrategy.type === DrawdownStrategyType.Bucket
      ? {
          type: DrawdownStrategyType.Bucket,
          bucketOrder: state.drawdownStrategy.bucketOrder,
        }
      : {
          type: DrawdownStrategyType.Rebalancing,
          rebalancing: {
            targetAllocation: normalizeAllocation(state.drawdownStrategy.rebalancing.targetAllocation),
            glidePathEnabled: state.drawdownStrategy.rebalancing.glidePathEnabled,
            glidePath: state.drawdownStrategy.rebalancing.glidePath.map((waypoint) => ({
              year: waypoint.year,
              allocation: normalizeAllocation(waypoint.allocation),
            })),
          },
        };

  return {
    mode: state.mode,
    simulationMode: state.simulationMode,
    selectedHistoricalEra: state.selectedHistoricalEra,
    coreParams: state.coreParams,
    portfolio: state.portfolio,
    returnAssumptions: state.returnAssumptions,
    spendingPhases: state.spendingPhases,
    withdrawalStrategy: effectiveWithdrawalStrategy,
    drawdownStrategy: effectiveDrawdownStrategy,
    incomeEvents: state.incomeEvents,
    expenseEvents: state.expenseEvents,
  };
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
