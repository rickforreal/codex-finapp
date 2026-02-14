import { create } from 'zustand';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  SimulationMode,
  WithdrawalStrategyType,
  type SimulateResponse,
} from '@finapp/shared';

import { createId } from '../lib/id';

export type IncomeEventForm = {
  id: string;
  name: string;
  amount: number;
  depositTo: AssetClass | 'follow-drawdown';
  start: { month: number; year: number };
  end: { month: number; year: number } | 'endOfRetirement';
  frequency: 'monthly' | 'annual' | 'oneTime';
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

type AppStore = {
  mode: AppMode;
  simulationMode: SimulationMode;
  selectedHistoricalEra: string;
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
    params: {
      initialWithdrawalRate: number;
    };
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
  incomeEvents: IncomeEventForm[];
  expenseEvents: ExpenseEventForm[];
  simulationResults: {
    manual: SimulateResponse | null;
    monteCarlo: SimulateResponse | null;
    status: RunStatus;
    mcStale: boolean;
    reforecast: SimulateResponse | null;
    errorMessage: string | null;
  };
  ui: {
    chartDisplayMode: ChartDisplayMode;
    chartBreakdownEnabled: boolean;
    tableGranularity: TableGranularity;
    tableAssetColumnsEnabled: boolean;
    tableSort: { column: string; direction: 'asc' | 'desc' } | null;
    chartZoom: { start: number; end: number } | null;
    reforecastStatus: ReforecastStatus;
    collapsedSections: Record<string, boolean>;
  };
  setMode: (mode: AppMode) => void;
  setSimulationMode: (mode: SimulationMode) => void;
  setSelectedHistoricalEra: (era: string) => void;
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
  setInitialWithdrawalRate: (rate: number) => void;
  setDrawdownType: (type: DrawdownStrategyType) => void;
  moveBucketAsset: (asset: AssetClass, direction: 'up' | 'down') => void;
  addIncomeEvent: () => void;
  removeIncomeEvent: (id: string) => void;
  updateIncomeEvent: (id: string, patch: Partial<IncomeEventForm>) => void;
  addExpenseEvent: () => void;
  removeExpenseEvent: (id: string) => void;
  updateExpenseEvent: (id: string, patch: Partial<ExpenseEventForm>) => void;
  setSimulationStatus: (status: RunStatus, errorMessage?: string | null) => void;
  setSimulationResult: (mode: SimulationMode, result: SimulateResponse) => void;
  setChartDisplayMode: (mode: ChartDisplayMode) => void;
  setChartBreakdownEnabled: (enabled: boolean) => void;
  setChartZoom: (zoom: { start: number; end: number } | null) => void;
  toggleSection: (id: string) => void;
};

const defaultPhase = (): SpendingPhaseForm => ({
  id: createId('phase'),
  name: 'Phase 1',
  startYear: 1,
  endYear: 30,
  minMonthlySpend: 400_000,
  maxMonthlySpend: 800_000,
});

const defaultIncomeEvent = (): IncomeEventForm => ({
  id: createId('income'),
  name: 'Income',
  amount: 250_000,
  depositTo: AssetClass.Cash,
  start: { month: 1, year: 2030 },
  end: 'endOfRetirement',
  frequency: 'monthly',
  inflationAdjusted: true,
});

const defaultExpenseEvent = (): ExpenseEventForm => ({
  id: createId('expense'),
  name: 'Expense',
  amount: 100_000,
  sourceFrom: 'follow-drawdown',
  start: { month: 1, year: 2030 },
  end: 'endOfRetirement',
  frequency: 'oneTime',
  inflationAdjusted: true,
});

const recalculatePhaseBoundaries = (phases: SpendingPhaseForm[], retirementYears: number): SpendingPhaseForm[] => {
  const sorted = [...phases].sort((a, b) => a.startYear - b.startYear);
  return sorted.map((phase, index) => {
    const prev = sorted[index - 1];
    const next = sorted[index + 1];
    const startYear = index === 0 ? 1 : (prev?.endYear ?? 1) + 1;
    const maxEnd = next ? Math.max(startYear, next.endYear - 1) : retirementYears;
    const endYear = Math.min(Math.max(phase.endYear, startYear), maxEnd);
    return { ...phase, startYear, endYear };
  });
};

export const useAppStore = create<AppStore>((set) => ({
  mode: AppMode.Planning,
  simulationMode: SimulationMode.Manual,
  selectedHistoricalEra: 'all',
  coreParams: {
    startingAge: 60,
    withdrawalsStartAt: 60,
    retirementStartDate: { month: 1, year: 2030 },
    retirementDuration: 30,
    inflationRate: 0.03,
  },
  portfolio: {
    stocks: 60_000_000,
    bonds: 30_000_000,
    cash: 10_000_000,
  },
  returnAssumptions: {
    stocks: { expectedReturn: 0.08, stdDev: 0.15 },
    bonds: { expectedReturn: 0.04, stdDev: 0.07 },
    cash: { expectedReturn: 0.02, stdDev: 0.01 },
  },
  spendingPhases: [defaultPhase()],
  withdrawalStrategy: {
    type: WithdrawalStrategyType.ConstantDollar,
    params: { initialWithdrawalRate: 0.04 },
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
  incomeEvents: [],
  expenseEvents: [],
  simulationResults: {
    manual: null,
    monteCarlo: null,
    status: 'idle',
    mcStale: false,
    reforecast: null,
    errorMessage: null,
  },
  ui: {
    chartDisplayMode: 'nominal',
    chartBreakdownEnabled: false,
    tableGranularity: 'annual',
    tableAssetColumnsEnabled: false,
    tableSort: null,
    chartZoom: null,
    reforecastStatus: 'idle',
    collapsedSections: {},
  },
  setMode: (mode) => set({ mode }),
  setSimulationMode: (simulationMode) => set({ simulationMode }),
  setSelectedHistoricalEra: (selectedHistoricalEra) => set({ selectedHistoricalEra }),
  setCoreParam: (key, value) =>
    set((state) => {
      const nextCore = { ...state.coreParams, [key]: value };
      if (key === 'retirementDuration') {
        return {
          coreParams: nextCore,
          spendingPhases: recalculatePhaseBoundaries(state.spendingPhases, Number(value)),
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
      const next = [...state.spendingPhases, {
        ...defaultPhase(),
        name: `Phase ${state.spendingPhases.length + 1}`,
        startYear: retirementYears,
        endYear: retirementYears,
      }];
      return { spendingPhases: recalculatePhaseBoundaries(next, retirementYears) };
    }),
  removeSpendingPhase: (id) =>
    set((state) => {
      if (state.spendingPhases.length <= 1) {
        return state;
      }
      const next = state.spendingPhases.filter((phase) => phase.id !== id);
      return {
        spendingPhases: recalculatePhaseBoundaries(next, state.coreParams.retirementDuration),
      };
    }),
  updateSpendingPhase: (id, patch) =>
    set((state) => {
      const next = state.spendingPhases.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase));
      return {
        spendingPhases: recalculatePhaseBoundaries(next, state.coreParams.retirementDuration),
      };
    }),
  setWithdrawalStrategyType: (type) =>
    set((state) => ({
      withdrawalStrategy: { ...state.withdrawalStrategy, type },
    })),
  setInitialWithdrawalRate: (rate) =>
    set((state) => ({
      withdrawalStrategy: {
        ...state.withdrawalStrategy,
        params: { initialWithdrawalRate: rate },
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
  addIncomeEvent: () =>
    set((state) => ({
      incomeEvents: [...state.incomeEvents, defaultIncomeEvent()],
    })),
  removeIncomeEvent: (id) =>
    set((state) => ({
      incomeEvents: state.incomeEvents.filter((event) => event.id !== id),
    })),
  updateIncomeEvent: (id, patch) =>
    set((state) => ({
      incomeEvents: state.incomeEvents.map((event) => (event.id === id ? { ...event, ...patch } : event)),
    })),
  addExpenseEvent: () =>
    set((state) => ({
      expenseEvents: [...state.expenseEvents, defaultExpenseEvent()],
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
        status: 'complete',
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
  useAppStore((state) =>
    state.simulationMode === SimulationMode.Manual ? state.simulationResults.manual : state.simulationResults.monteCarlo,
  );

export const getCurrentConfig = () => {
  const state = useAppStore.getState();
  const effectiveWithdrawalStrategy =
    state.withdrawalStrategy.type === WithdrawalStrategyType.ConstantDollar
      ? state.withdrawalStrategy
      : {
          type: WithdrawalStrategyType.ConstantDollar,
          params: { initialWithdrawalRate: state.withdrawalStrategy.params.initialWithdrawalRate ?? 0.04 },
        };

  const effectiveDrawdownStrategy =
    state.drawdownStrategy.type === DrawdownStrategyType.Bucket
      ? state.drawdownStrategy
      : {
          ...state.drawdownStrategy,
          type: DrawdownStrategyType.Bucket,
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
    incomeEvents: state.incomeEvents.map((event) => ({ id: event.id, name: event.name, amount: event.amount })),
    expenseEvents: state.expenseEvents.map((event) => ({ id: event.id, name: event.name, amount: event.amount })),
  };
};
