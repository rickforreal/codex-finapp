import { describe, expect, it } from 'vitest';

import { calculateVanguardDynamicWithdrawal } from '../../../src/engine/strategies/vanguardDynamic';
import { createStrategyContext } from './context';

describe('VanguardDynamic', () => {
  const params = {
    annualWithdrawalRate: 0.04,
    ceiling: 0.05,
    floor: 0.025,
  };

  it('should calculate Year 1 from portfolio × rate', () => {
    const annual = calculateVanguardDynamicWithdrawal(createStrategyContext(), params);

    expect(annual).toBe(4_000_000);
  });

  it('should clamp target to real floor when portfolio drops', () => {
    const annual = calculateVanguardDynamicWithdrawal(
      createStrategyContext({ year: 2, portfolioValue: 80_000_000, previousWithdrawal: 4_000_000 }),
      params,
    );

    expect(annual).toBe(4_017_000);
  });

  it('should clamp target to real ceiling when portfolio rises sharply', () => {
    const annual = calculateVanguardDynamicWithdrawal(
      createStrategyContext({ year: 2, portfolioValue: 200_000_000, previousWithdrawal: 4_000_000 }),
      params,
    );

    expect(annual).toBe(4_326_000);
  });
});
