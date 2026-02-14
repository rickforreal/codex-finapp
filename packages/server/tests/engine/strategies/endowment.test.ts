import { describe, expect, it } from 'vitest';

import { calculateEndowmentWithdrawal } from '../../../src/engine/strategies/endowment';
import { createStrategyContext } from './context';

describe('Endowment', () => {
  const params = {
    spendingRate: 0.05,
    smoothingWeight: 0.7,
  };

  it('should calculate Year 1 from spending rate', () => {
    const annual = calculateEndowmentWithdrawal(createStrategyContext(), params);

    expect(annual).toBe(5_000_000);
  });

  it('should blend inflated prior withdrawal with current portfolio target', () => {
    const annual = calculateEndowmentWithdrawal(
      createStrategyContext({ year: 2, portfolioValue: 90_000_000, previousWithdrawal: 5_000_000 }),
      params,
    );

    expect(annual).toBe(4_955_000);
  });

  it('should behave like percent-of-portfolio when smoothing weight is zero', () => {
    const annual = calculateEndowmentWithdrawal(
      createStrategyContext({ year: 6, portfolioValue: 88_000_000, previousWithdrawal: 10_000_000 }),
      { ...params, smoothingWeight: 0 },
    );

    expect(annual).toBe(4_400_000);
  });
});
