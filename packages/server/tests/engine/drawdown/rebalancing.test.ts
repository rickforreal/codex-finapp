import { describe, expect, it } from 'vitest';

import { AssetClass } from '@finapp/shared';

import {
  applyRebalancingDrawdown,
  resolveTargetAllocationForYear,
} from '../../../src/engine/drawdown/rebalancing';

describe('Rebalancing drawdown', () => {
  it('sources withdrawals from overweight assets first', () => {
    const result = applyRebalancingDrawdown(
      { stocks: 700_000, bonds: 200_000, cash: 100_000 },
      200_000,
      { stocks: 0.5, bonds: 0.3, cash: 0.2 },
    );

    expect(result.withdrawnByAsset).toEqual({ stocks: 200_000, bonds: 0, cash: 0 });
    expect(result.balances).toEqual({ stocks: 500_000, bonds: 200_000, cash: 100_000 });
  });

  it('falls back to proportional drawdown when no overweight exists', () => {
    const result = applyRebalancingDrawdown(
      { stocks: 500_000, bonds: 300_000, cash: 200_000 },
      100_000,
      { stocks: 0.5, bonds: 0.3, cash: 0.2 },
    );

    expect(result.withdrawnByAsset.stocks).toBe(50_000);
    expect(result.withdrawnByAsset.bonds).toBe(30_000);
    expect(result.withdrawnByAsset.cash).toBe(20_000);
    expect(result.shortfall).toBe(0);
  });

  it('interpolates glide-path target allocations between waypoints', () => {
    const allocation = resolveTargetAllocationForYear(
      { stocks: 0.6, bonds: 0.3, cash: 0.1 },
      true,
      [
        { year: 1, allocation: { [AssetClass.Stocks]: 0.6, [AssetClass.Bonds]: 0.3, [AssetClass.Cash]: 0.1 } },
        { year: 11, allocation: { [AssetClass.Stocks]: 0.4, [AssetClass.Bonds]: 0.4, [AssetClass.Cash]: 0.2 } },
      ],
      6,
    );

    expect(allocation.stocks).toBeCloseTo(0.5, 6);
    expect(allocation.bonds).toBeCloseTo(0.35, 6);
    expect(allocation.cash).toBeCloseTo(0.15, 6);
  });

  it('reports shortfall when withdrawal exceeds total assets', () => {
    const result = applyRebalancingDrawdown(
      { stocks: 10_000, bonds: 0, cash: 0 },
      15_000,
      { stocks: 0.6, bonds: 0.3, cash: 0.1 },
    );

    expect(result.totalWithdrawn).toBe(10_000);
    expect(result.shortfall).toBe(5_000);
    expect(result.balances).toEqual({ stocks: 0, bonds: 0, cash: 0 });
  });
});
