import { describe, expect, it } from 'vitest';

import { calculateOneOverNWithdrawal } from '../../../src/engine/strategies/oneOverN';
import { createStrategyContext } from './context';

describe('OneOverN', () => {
  it('should divide portfolio by remaining years', () => {
    const annual = calculateOneOverNWithdrawal(createStrategyContext(), {});

    expect(annual).toBe(3_333_333);
  });

  it('should spend the full portfolio in the final year', () => {
    const annual = calculateOneOverNWithdrawal(
      createStrategyContext({ year: 30, remainingYears: 1, portfolioValue: 12_345_678 }),
      {},
    );

    expect(annual).toBe(12_345_678);
  });

  it('should return 0 when remaining years is invalid', () => {
    const annual = calculateOneOverNWithdrawal(
      createStrategyContext({ remainingYears: 0 }),
      {},
    );

    expect(annual).toBe(0);
  });
});
