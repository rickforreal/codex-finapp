import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
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

export interface DynamicSwrAdaptiveParams {
  fallbackExpectedRateOfReturn: number;
  lookbackMonths: number;
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
  | { type: WithdrawalStrategyType.DynamicSwrAdaptive; params: DynamicSwrAdaptiveParams }
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
  selectedHistoricalEra: HistoricalEra;
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

export interface ActualMonthOverride {
  startBalances?: Partial<AssetBalances>;
  withdrawalsByAsset?: Partial<AssetBalances>;
  incomeTotal?: MoneyCents;
  expenseTotal?: MoneyCents;
}

export type ActualOverridesByMonth = Record<number, ActualMonthOverride>;

export interface SinglePathResult {
  rows: MonthlySimulationRow[];
  summary: {
    totalWithdrawn: MoneyCents;
    totalShortfall: MoneyCents;
    terminalPortfolioValue: MoneyCents;
  };
}

export interface HistoricalEraOption {
  key: HistoricalEra;
  label: string;
  startYear: number;
  endYear: number;
}

export interface HistoricalAssetSummary {
  meanReturn: number;
  stdDev: number;
  sampleSizeMonths: number;
}

export interface HistoricalDataSummary {
  selectedEra: HistoricalEraOption;
  eras: HistoricalEraOption[];
  byAsset: Record<AssetClass, HistoricalAssetSummary>;
}

export interface MonteCarloPercentileCurves {
  p05: number[];
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
  p95: number[];
}

export interface MonteCarloResult {
  simulationCount: number;
  successCount: number;
  probabilityOfSuccess: number;
  terminalValues: number[];
  percentileCurves: {
    total: MonteCarloPercentileCurves;
    stocks: MonteCarloPercentileCurves;
    bonds: MonteCarloPercentileCurves;
    cash: MonteCarloPercentileCurves;
  };
  historicalSummary: HistoricalDataSummary;
}

export type StressScenarioType =
  | 'stockCrash'
  | 'bondCrash'
  | 'broadMarketCrash'
  | 'prolongedBear'
  | 'highInflationSpike'
  | 'custom';

interface StressScenarioBase {
  id: string;
  label: string;
  startYear: number;
}

export interface StockCrashStressScenario extends StressScenarioBase {
  type: 'stockCrash';
  params: {
    dropPct: number;
  };
}

export interface BondCrashStressScenario extends StressScenarioBase {
  type: 'bondCrash';
  params: {
    dropPct: number;
  };
}

export interface BroadMarketCrashStressScenario extends StressScenarioBase {
  type: 'broadMarketCrash';
  params: {
    stockDropPct: number;
    bondDropPct: number;
  };
}

export interface ProlongedBearStressScenario extends StressScenarioBase {
  type: 'prolongedBear';
  params: {
    durationYears: number;
    stockAnnualReturn: number;
    bondAnnualReturn: number;
  };
}

export interface HighInflationSpikeStressScenario extends StressScenarioBase {
  type: 'highInflationSpike';
  params: {
    durationYears: number;
    inflationRate: number;
  };
}

export interface CustomStressScenarioYear {
  yearOffset: number;
  stocksAnnualReturn: number;
  bondsAnnualReturn: number;
  cashAnnualReturn: number;
}

export interface CustomStressScenario extends StressScenarioBase {
  type: 'custom';
  params: {
    years: CustomStressScenarioYear[];
  };
}

export type StressScenario =
  | StockCrashStressScenario
  | BondCrashStressScenario
  | BroadMarketCrashStressScenario
  | ProlongedBearStressScenario
  | HighInflationSpikeStressScenario
  | CustomStressScenario;

export interface StressTimingPoint {
  startYear: number;
  terminalPortfolioValue: number;
}

export interface StressTimingSensitivitySeries {
  scenarioId: string;
  scenarioLabel: string;
  points: StressTimingPoint[];
}

export interface StressComparisonMetrics {
  terminalValue: number;
  terminalDeltaVsBase: number;
  totalDrawdownReal: number;
  drawdownDeltaVsBase: number;
  depletionMonth: number | null;
  firstYearReducedWithdrawal: number | null;
  probabilityOfSuccess?: number;
  successDeltaPpVsBase?: number;
}

export interface StressScenarioResult {
  scenarioId: string;
  scenarioLabel: string;
  simulationMode: SimulationMode;
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;
  metrics: StressComparisonMetrics;
}

export interface StressTestResult {
  simulationMode: SimulationMode;
  base: {
    result: SinglePathResult;
    monteCarlo?: MonteCarloResult;
    metrics: StressComparisonMetrics;
  };
  scenarios: StressScenarioResult[];
  timingSensitivity?: StressTimingSensitivitySeries[];
}

export interface SimulationResult {
  status: 'ok';
  message: string;
}
