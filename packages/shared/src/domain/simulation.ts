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

export interface PercentOfPortfolioParams {
  annualWithdrawalRate: number;
}

export type OneOverNParams = Record<never, never>;

export interface VpwParams {
  expectedRealReturn: number;
  drawdownTarget: number;
}

export interface DynamicSwrParams {
  expectedRateOfReturn: number;
}

export interface SensibleWithdrawalsParams {
  baseWithdrawalRate: number;
  extrasWithdrawalRate: number;
}

export interface NinetyFivePercentParams {
  annualWithdrawalRate: number;
  minimumFloor: number;
}

export interface GuytonKlingerParams {
  initialWithdrawalRate: number;
  capitalPreservationTrigger: number;
  capitalPreservationCut: number;
  prosperityTrigger: number;
  prosperityRaise: number;
  guardrailsSunset: number;
}

export interface VanguardDynamicParams {
  annualWithdrawalRate: number;
  ceiling: number;
  floor: number;
}

export interface EndowmentParams {
  spendingRate: number;
  smoothingWeight: number;
}

export interface HebelerAutopilotParams {
  initialWithdrawalRate: number;
  pmtExpectedReturn: number;
  priorYearWeight: number;
}

export interface CapeBasedParams {
  baseWithdrawalRate: number;
  capeWeight: number;
  startingCape: number;
}

export type WithdrawalStrategyConfig =
  | { type: WithdrawalStrategyType.ConstantDollar; params: ConstantDollarParams }
  | { type: WithdrawalStrategyType.PercentOfPortfolio; params: PercentOfPortfolioParams }
  | { type: WithdrawalStrategyType.OneOverN; params: OneOverNParams }
  | { type: WithdrawalStrategyType.Vpw; params: VpwParams }
  | { type: WithdrawalStrategyType.DynamicSwr; params: DynamicSwrParams }
  | { type: WithdrawalStrategyType.SensibleWithdrawals; params: SensibleWithdrawalsParams }
  | { type: WithdrawalStrategyType.NinetyFivePercent; params: NinetyFivePercentParams }
  | { type: WithdrawalStrategyType.GuytonKlinger; params: GuytonKlingerParams }
  | { type: WithdrawalStrategyType.VanguardDynamic; params: VanguardDynamicParams }
  | { type: WithdrawalStrategyType.Endowment; params: EndowmentParams }
  | { type: WithdrawalStrategyType.HebelerAutopilot; params: HebelerAutopilotParams }
  | { type: WithdrawalStrategyType.CapeBased; params: CapeBasedParams };

export interface DrawdownStrategyConfig {
  type: DrawdownStrategyType.Bucket;
  bucketOrder: AssetClass[];
}

export interface GlidePathWaypoint {
  year: number;
  allocation: Record<AssetClass, number>;
}

export interface RebalancingDrawdownStrategyConfig {
  type: DrawdownStrategyType.Rebalancing;
  rebalancing: {
    targetAllocation: Record<AssetClass, number>;
    glidePathEnabled: boolean;
    glidePath: GlidePathWaypoint[];
  };
}

export type DrawdownStrategy =
  | DrawdownStrategyConfig
  | RebalancingDrawdownStrategyConfig;

export type EventFrequency = 'monthly' | 'quarterly' | 'annual' | 'oneTime';
export type EventDate = { month: number; year: number };
export type EventEndDate = EventDate | 'endOfRetirement';

export interface IncomeEvent {
  id: string;
  name: string;
  amount: MoneyCents;
  depositTo: AssetClass;
  start: EventDate;
  end: EventEndDate;
  frequency: EventFrequency;
  inflationAdjusted: boolean;
}

export interface ExpenseEvent {
  id: string;
  name: string;
  amount: MoneyCents;
  sourceFrom: AssetClass | 'follow-drawdown';
  start: EventDate;
  end: EventEndDate;
  frequency: EventFrequency;
  inflationAdjusted: boolean;
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
  drawdownStrategy: DrawdownStrategy;
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
