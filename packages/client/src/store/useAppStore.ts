import { create } from 'zustand';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  SimulationMode,
  WithdrawalStrategyType,
  type DrawdownStrategy,
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
    tableSpreadsheetMode: boolean;
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
  setChartDisplayMode: (mode: ChartDisplayMode) => void;
  setChartBreakdownEnabled: (enabled: boolean) => void;
  setChartZoom: (zoom: { start: number; end: number } | null) => void;
  setTableGranularity: (granularity: TableGranularity) => void;
  setTableAssetColumnsEnabled: (enabled: boolean) => void;
  setTableSpreadsheetMode: (enabled: boolean) => void;
  setTableSort: (sort: { column: string; direction: 'asc' | 'desc' } | null) => void;
  toggleSection: (id: string) => void;
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
    tableSpreadsheetMode: false,
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
