import { describe, expect, it } from 'vitest';

import { calculateVpwWithdrawal } from '../../../src/engine/strategies/vpw';
import { createStrategyContext } from './context';

describe('VPW', () => {
  it('should calculate Year 1 withdrawal from PMT with full drawdown target', () => {
    const annual = calculateVpwWithdrawal(createStrategyContext(), {
      expectedRealReturn: 0.03,
      drawdownTarget: 1,
    });

    expect(annual).toBe(5_101_926);
  });

  it('should reduce Year 1 withdrawal when a residual target is retained', () => {
    const full = calculateVpwWithdrawal(createStrategyContext(), {
      expectedRealReturn: 0.03,
      drawdownTarget: 1,
    });

    const residual = calculateVpwWithdrawal(createStrategyContext(), {
      expectedRealReturn: 0.03,
      drawdownTarget: 0.5,
    });

    expect(residual).toBeLessThan(full);
  });

  it('should grow nominal withdrawal in later years from inflation conversion', () => {
    const year1 = calculateVpwWithdrawal(createStrategyContext({ year: 1, remainingYears: 30 }), {
      expectedRealReturn: 0.03,
      drawdownTarget: 1,
    });

    const year5 = calculateVpwWithdrawal(createStrategyContext({ year: 5, remainingYears: 26 }), {
      expectedRealReturn: 0.03,
      drawdownTarget: 1,
    });

    expect(year5).toBeGreaterThan(year1);
  });
});
