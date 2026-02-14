import type { StrategyContext } from '../../../src/engine/strategies/types';

export const createStrategyContext = (overrides: Partial<StrategyContext> = {}): StrategyContext => ({
  year: 1,
  retirementYears: 30,
  portfolioValue: 100_000_000,
  initialPortfolioValue: 100_000_000,
  previousWithdrawal: 4_000_000,
  previousYearReturn: 0.05,
  previousYearStartPortfolio: 100_000_000,
  remainingYears: 30,
  inflationRate: 0.03,
  capeRatio: 20,
  ...overrides,
});
