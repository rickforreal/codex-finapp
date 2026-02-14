import { describe, expect, it } from 'vitest';

import { AssetClass } from '@finapp/shared';

import { applyBucketDrawdown } from '../../../src/engine/drawdown/bucket';

describe('Bucket drawdown', () => {
  it('should deplete sequentially across cash, bonds, stocks', () => {
    const result = applyBucketDrawdown(
      { stocks: 80_000, bonds: 50_000, cash: 20_000 },
      90_000,
      [AssetClass.Cash, AssetClass.Bonds, AssetClass.Stocks],
    );

    expect(result.withdrawnByAsset).toEqual({ stocks: 20_000, bonds: 50_000, cash: 20_000 });
    expect(result.balances).toEqual({ stocks: 60_000, bonds: 0, cash: 0 });
    expect(result.shortfall).toBe(0);
  });

  it('should return partial fulfillment and shortfall when insufficient', () => {
    const result = applyBucketDrawdown(
      { stocks: 30_000, bonds: 20_000, cash: 10_000 },
      100_000,
      [AssetClass.Cash, AssetClass.Bonds, AssetClass.Stocks],
    );

    expect(result.totalWithdrawn).toBe(60_000);
    expect(result.shortfall).toBe(40_000);
    expect(result.balances).toEqual({ stocks: 0, bonds: 0, cash: 0 });
  });

  it('should draw from single class when enough in first bucket', () => {
    const result = applyBucketDrawdown(
      { stocks: 200_000, bonds: 50_000, cash: 25_000 },
      40_000,
      [AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash],
    );

    expect(result.withdrawnByAsset).toEqual({ stocks: 40_000, bonds: 0, cash: 0 });
    expect(result.balances).toEqual({ stocks: 160_000, bonds: 50_000, cash: 25_000 });
  });
});
