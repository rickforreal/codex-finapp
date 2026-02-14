import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  SimulationMode,
  WithdrawalStrategyType,
} from '../constants/enums';

export type MoneyCents = number;

export type AssetBalances = Record<AssetClass, MoneyCents>;

export interface ReturnAssumption {
  expectedReturn: number;
  stdDev: number;
}

export type ReturnAssumptions = Record<AssetClass, ReturnAssumption>;

export interface SpendingPhase {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  minMonthlySpend: MoneyCents;
  maxMonthlySpend: MoneyCents;
}

export interface ConstantDollarParams {
  initialWithdrawalRate: number;
}

export interface WithdrawalStrategyConfig {
  type: WithdrawalStrategyType;
  params: ConstantDollarParams & Record<string, number | string | boolean>;
}

export interface DrawdownStrategyConfig {
  type: DrawdownStrategyType;
  bucketOrder: AssetClass[];
  rebalancing: {
    targetAllocation: Record<AssetClass, number>;
    glidePathEnabled: boolean;
    glidePath: Array<{
      year: number;
      allocation: Record<AssetClass, number>;
    }>;
  };
}

export interface IncomeEvent {
  id: string;
  name: string;
  amount: MoneyCents;
}

export interface ExpenseEvent {
  id: string;
  name: string;
  amount: MoneyCents;
}

export interface SimulationConfig {
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
  portfolio: AssetBalances;
  returnAssumptions: ReturnAssumptions;
  spendingPhases: SpendingPhase[];
  withdrawalStrategy: WithdrawalStrategyConfig;
  drawdownStrategy: DrawdownStrategyConfig;
  incomeEvents: IncomeEvent[];
  expenseEvents: ExpenseEvent[];
}

export interface MonthlyReturns {
  stocks: number;
  bonds: number;
  cash: number;
}

export interface MonthlySimulationRow {
  monthIndex: number;
  year: number;
  monthInYear: number;
  startBalances: AssetBalances;
  marketChange: AssetBalances;
  withdrawals: {
    byAsset: AssetBalances;
    requested: MoneyCents;
    actual: MoneyCents;
    shortfall: MoneyCents;
  };
  incomeTotal: MoneyCents;
  expenseTotal: MoneyCents;
  endBalances: AssetBalances;
}

export interface SinglePathResult {
  rows: MonthlySimulationRow[];
  summary: {
    totalWithdrawn: MoneyCents;
    totalShortfall: MoneyCents;
    terminalPortfolioValue: MoneyCents;
  };
}

export interface SimulationResult {
  status: 'ok';
  message: string;
}
