import { describe, expect, it } from 'vitest';

import { calculateNinetyFivePercentWithdrawal } from '../../../src/engine/strategies/ninetyFivePercent';
import { createStrategyContext } from './context';

describe('NinetyFivePercent', () => {
  it('should calculate Year 1 using portfolio × rate', () => {
    const annual = calculateNinetyFivePercentWithdrawal(createStrategyContext(), {
      annualWithdrawalRate: 0.04,
      minimumFloor: 0.95,
    });

    expect(annual).toBe(4_000_000);
  });

  it('should enforce floor when target is below prior-year floor', () => {
    const annual = calculateNinetyFivePercentWithdrawal(
      createStrategyContext({ year: 2, portfolioValue: 80_000_000, previousWithdrawal: 4_000_000 }),
      {
        annualWithdrawalRate: 0.04,
        minimumFloor: 0.95,
      },
    );

    expect(annual).toBe(3_800_000);
  });

  it('should follow target when target exceeds floor', () => {
    const annual = calculateNinetyFivePercentWithdrawal(
      createStrategyContext({ year: 2, portfolioValue: 120_000_000, previousWithdrawal: 4_000_000 }),
      {
        annualWithdrawalRate: 0.04,
        minimumFloor: 0.95,
      },
    );

    expect(annual).toBe(4_800_000);
  });
});
