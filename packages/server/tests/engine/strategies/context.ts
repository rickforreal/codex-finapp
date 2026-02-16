import type { StrategyContext } from '../../../src/engine/strategies/types';

export const createStrategyContext = (overrides: Partial<StrategyContext> = {}): StrategyContext => ({
  year: 1,
  monthIndex: 1,
  retirementYears: 30,
  portfolioValue: 100_000_000,
  initialPortfolioValue: 100_000_000,
  previousWithdrawal: 4_000_000,
  previousYearReturn: 0.05,
  previousYearStartPortfolio: 100_000_000,
  remainingYears: 30,
  remainingMonths: 360,
  inflationRate: 0.03,
  startOfMonthWeights: { stocks: 0.6, bonds: 0.3, cash: 0.1 },
  trailingRealReturnsByAsset: { stocks: [], bonds: [], cash: [] },
  capeRatio: 20,
  ...overrides,
});
