import { describe, expect, it } from 'vitest';

import { calculateSensibleWithdrawals } from '../../../src/engine/strategies/sensibleWithdrawals';
import { createStrategyContext } from './context';

describe('SensibleWithdrawals', () => {
  it('should calculate Year 1 withdrawal from base rate only', () => {
    const annual = calculateSensibleWithdrawals(createStrategyContext(), {
      baseWithdrawalRate: 0.03,
      extrasWithdrawalRate: 0.1,
    });

    expect(annual).toBe(3_000_000);
  });

  it('should add extras on positive prior-year real gain', () => {
    const annual = calculateSensibleWithdrawals(
      createStrategyContext({ year: 2, previousYearReturn: 0.08, inflationRate: 0.03 }),
      {
        baseWithdrawalRate: 0.03,
        extrasWithdrawalRate: 0.1,
      },
    );

    expect(annual).toBe(3_500_000);
  });

  it('should not add extras on negative prior-year real gain', () => {
    const annual = calculateSensibleWithdrawals(
      createStrategyContext({ year: 2, previousYearReturn: 0.01, inflationRate: 0.03 }),
      {
        baseWithdrawalRate: 0.03,
        extrasWithdrawalRate: 0.1,
      },
    );

    expect(annual).toBe(3_000_000);
  });
});
