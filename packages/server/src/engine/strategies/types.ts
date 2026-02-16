import type { WithdrawalStrategyConfig } from '@finapp/shared';

export interface AssetWeights {
  stocks: number;
  bonds: number;
  cash: number;
}

export interface TrailingRealReturnsByAsset {
  stocks: number[];
  bonds: number[];
  cash: number[];
}

export interface AnnualizedRealReturnsByAsset {
  stocks: number;
  bonds: number;
  cash: number;
}

export interface StrategyContext {
  year: number;
  monthIndex: number;
  retirementYears: number;
  portfolioValue: number;
  initialPortfolioValue: number;
  previousWithdrawal: number;
  previousYearReturn: number;
  previousYearStartPortfolio: number;
  remainingYears: number;
  remainingMonths: number;
  inflationRate: number;
  startOfMonthWeights?: AssetWeights;
  annualizedRealReturnsByAsset?: AnnualizedRealReturnsByAsset;
  trailingRealReturnsByAsset?: TrailingRealReturnsByAsset;
  capeRatio?: number;
}

export type StrategyFunction<T extends WithdrawalStrategyConfig['params']> = (
  context: StrategyContext,
  params: T,
) => number;
