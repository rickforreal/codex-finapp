import { describe, expect, it } from 'vitest';

import { calculatePercentOfPortfolioWithdrawal } from '../../../src/engine/strategies/percentOfPortfolio';
import { createStrategyContext } from './context';

describe('PercentOfPortfolio', () => {
  it('should return portfolio × annual rate in Year 1', () => {
    const annual = calculatePercentOfPortfolioWithdrawal(createStrategyContext(), {
      annualWithdrawalRate: 0.04,
    });

    expect(annual).toBe(4_000_000);
  });

  it('should respond to portfolio changes across years', () => {
    const year5 = calculatePercentOfPortfolioWithdrawal(
      createStrategyContext({ year: 5, portfolioValue: 80_000_000 }),
      { annualWithdrawalRate: 0.04 },
    );

    expect(year5).toBe(3_200_000);
  });

  it('should return 0 for a depleted portfolio', () => {
    const annual = calculatePercentOfPortfolioWithdrawal(
      createStrategyContext({ portfolioValue: 0 }),
      { annualWithdrawalRate: 0.04 },
    );

    expect(annual).toBe(0);
  });
});
