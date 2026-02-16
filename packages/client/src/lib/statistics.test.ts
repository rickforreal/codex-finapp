import { describe, expect, it } from 'vitest';

import { AssetClass, type MonthlySimulationRow } from '@finapp/shared';

import { buildSummaryStats } from './statistics';

const row = (
  monthIndex: number,
  requested: number,
  actual: number,
): MonthlySimulationRow => ({
  monthIndex,
  year: Math.floor((monthIndex - 1) / 12) + 1,
  monthInYear: ((monthIndex - 1) % 12) + 1,
  startBalances: {
    [AssetClass.Stocks]: 100_000,
    [AssetClass.Bonds]: 50_000,
    [AssetClass.Cash]: 10_000,
  },
  marketChange: {
    [AssetClass.Stocks]: 0,
    [AssetClass.Bonds]: 0,
    [AssetClass.Cash]: 0,
  },
  withdrawals: {
    byAsset: {
      [AssetClass.Stocks]: actual,
      [AssetClass.Bonds]: 0,
      [AssetClass.Cash]: 0,
    },
    requested,
    actual,
    shortfall: Math.max(0, requested - actual),
  },
  incomeTotal: 0,
  expenseTotal: 0,
  endBalances: {
    [AssetClass.Stocks]: 100_000 - actual,
    [AssetClass.Bonds]: 50_000,
    [AssetClass.Cash]: 10_000,
  },
});

describe('buildSummaryStats', () => {
  it('uses requested withdrawals (strategy output) instead of funded actuals', () => {
    const rows = [row(1, 2_000, 500), row(2, 4_000, 500), row(3, 6_000, 500)];

    const stats = buildSummaryStats(rows, 0);

    expect(stats.totalDrawdownNominal).toBe(12_000);
    expect(Math.round(stats.medianMonthlyReal)).toBe(4_000);
    expect(Math.round(stats.meanMonthlyReal)).toBe(4_000);
  });

  it('excludes pre-withdrawal months from withdrawal distribution stats', () => {
    const rows = [row(1, 0, 0), row(2, 0, 0), row(3, 3_000, 3_000), row(4, 3_000, 3_000)];

    const stats = buildSummaryStats(rows, 0);

    expect(stats.totalDrawdownNominal).toBe(6_000);
    expect(Math.round(stats.medianMonthlyReal)).toBe(3_000);
    expect(Math.round(stats.meanMonthlyReal)).toBe(3_000);
  });
});
