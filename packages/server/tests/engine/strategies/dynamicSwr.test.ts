import { describe, expect, it } from 'vitest';

import { calculateDynamicSwrWithdrawal } from '../../../src/engine/strategies/dynamicSwr';
import { createStrategyContext } from './context';

describe('DynamicSWR', () => {
  it('should calculate Year 1 withdrawal from expected nominal return and inflation', () => {
    const annual = calculateDynamicSwrWithdrawal(createStrategyContext(), {
      expectedRateOfReturn: 0.06,
    });

    expect(annual).toBe(5_195_804);
  });

  it('should fall back to 1/N when return equals inflation', () => {
    const annual = calculateDynamicSwrWithdrawal(
      createStrategyContext({ inflationRate: 0.03, remainingYears: 25 }),
      { expectedRateOfReturn: 0.03 },
    );

    expect(annual).toBe(4_000_000);
  });

  it('should increase as remaining years decrease', () => {
    const year1 = calculateDynamicSwrWithdrawal(
      createStrategyContext({ remainingYears: 30 }),
      { expectedRateOfReturn: 0.06 },
    );
    const year10 = calculateDynamicSwrWithdrawal(
      createStrategyContext({ year: 10, remainingYears: 21 }),
      { expectedRateOfReturn: 0.06 },
    );

    expect(year10).toBeGreaterThan(year1);
  });
});
