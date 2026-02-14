import { describe, expect, it } from 'vitest';

import { calculateCapeBasedWithdrawal } from '../../../src/engine/strategies/capeBased';
import { createStrategyContext } from './context';

describe('CapeBased', () => {
  const params = {
    baseWithdrawalRate: 0.015,
    capeWeight: 0.5,
    startingCape: 20,
  };

  it('should calculate rate using starting CAPE in manual mode', () => {
    const annual = calculateCapeBasedWithdrawal(createStrategyContext(), params);

    expect(annual).toBe(4_000_000);
  });

  it('should produce higher withdrawals at lower CAPE values', () => {
    const cheap = calculateCapeBasedWithdrawal(createStrategyContext({ capeRatio: 10 }), params);
    const expensive = calculateCapeBasedWithdrawal(createStrategyContext({ capeRatio: 40 }), params);

    expect(cheap).toBe(6_500_000);
    expect(expensive).toBe(2_750_000);
  });

  it('should clamp to zero for depleted portfolios', () => {
    const annual = calculateCapeBasedWithdrawal(createStrategyContext({ portfolioValue: 0 }), params);

    expect(annual).toBe(0);
  });
});
