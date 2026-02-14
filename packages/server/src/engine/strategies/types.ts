import type { WithdrawalStrategyConfig } from '@finapp/shared';

export interface StrategyContext {
  year: number;
  retirementYears: number;
  portfolioValue: number;
  initialPortfolioValue: number;
  previousWithdrawal: number;
  previousYearReturn: number;
  previousYearStartPortfolio: number;
  remainingYears: number;
  inflationRate: number;
  capeRatio?: number;
}

export type StrategyFunction<T extends WithdrawalStrategyConfig['params']> = (
  context: StrategyContext,
  params: T,
) => number;
