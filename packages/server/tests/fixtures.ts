import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
  ReturnSource,
  SimulationMode,
  WithdrawalStrategyType,
  type MonthlyReturns,
  type SimulateRequest,
  type SimulationConfig,
} from '@finapp/shared';

export const createBaseConfig = (): SimulationConfig => ({
  mode: AppMode.Planning,
  simulationMode: SimulationMode.Manual,
  returnsSource: ReturnSource.Historical,
  simulationRuns: 1000,
  selectedHistoricalEra: HistoricalEra.FullHistory,
  customHistoricalRange: null,
  blockBootstrapEnabled: false,
  blockBootstrapLength: 12,
  coreParams: {
    birthDate: { month: 1, year: 1970 },
    portfolioStart: { month: 1, year: 2030 },
    portfolioEnd: { month: 1, year: 2040 },
    inflationRate: 0.03,
  },
  portfolio: {
    [AssetClass.Stocks]: 60_000_000,
    [AssetClass.Bonds]: 30_000_000,
    [AssetClass.Cash]: 10_000_000,
  },
  returnAssumptions: {
    [AssetClass.Stocks]: { expectedReturn: 0.08, stdDev: 0.15 },
    [AssetClass.Bonds]: { expectedReturn: 0.04, stdDev: 0.07 },
    [AssetClass.Cash]: { expectedReturn: 0.02, stdDev: 0.01 },
  },
  spendingPhases: [
    {
      id: 'phase-1',
      name: 'Base',
      start: { month: 1, year: 2030 },
      end: { month: 1, year: 2070 },
      minMonthlySpend: 2_000_00,
      maxMonthlySpend: 15_000_00,
    },
  ],
  withdrawalStrategy: {
    type: WithdrawalStrategyType.ConstantDollar,
    params: {
      initialWithdrawalRate: 0.04,
    },
  },
  drawdownStrategy: {
    type: DrawdownStrategyType.Bucket,
    bucketOrder: [AssetClass.Cash, AssetClass.Bonds, AssetClass.Stocks],
  },
  incomeEvents: [],
  expenseEvents: [],
});

export const createZeroReturns = (months: number): MonthlyReturns[] =>
  Array.from({ length: months }, () => ({ stocks: 0, bonds: 0, cash: 0 }));

export const createSimulateRequest = (): SimulateRequest => ({
  config: createBaseConfig(),
});
