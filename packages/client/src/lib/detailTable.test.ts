import { describe, expect, it } from 'vitest';

import type { MonthlySimulationRow } from '@finapp/shared';

import { buildAnnualDetailRows, buildMonthlyDetailRows } from './detailTable';

const makeRow = (monthIndex: number, startTotal: number): MonthlySimulationRow => ({
  monthIndex,
  year: Math.floor((monthIndex - 1) / 12) + 1,
  monthInYear: ((monthIndex - 1) % 12) + 1,
  startBalances: {
    stocks: startTotal,
    bonds: 0,
    cash: 0,
  },
  marketChange: {
    stocks: 0,
    bonds: 0,
    cash: 0,
  },
  withdrawals: {
    byAsset: {
      stocks: 0,
      bonds: 0,
      cash: 0,
    },
    requested: 0,
    actual: 0,
    shortfall: 0,
  },
  incomeTotal: 0,
  expenseTotal: 0,
  endBalances: {
    stocks: startTotal,
    bonds: 0,
    cash: 0,
  },
});

describe('detail table Monte Carlo reference column mapping', () => {
  it('maps monthly Start Total (p50) as baseline for month 1 and prior-month p50 for month N', () => {
    const rows = Array.from({ length: 13 }, (_, index) => makeRow(index + 1, 100_000 + index * 1_000));
    const p50 = Array.from({ length: 13 }, (_, index) => 200_000 + index * 2_000);

    const monthly = buildMonthlyDetailRows(rows, 60, 0.03, { month: 1, year: 2030 }, p50);

    expect(monthly[0]?.startTotal).toBe(100_000);
    expect(monthly[0]?.startTotalP50).toBe(100_000);

    expect(monthly[4]?.monthIndex).toBe(5);
    expect(monthly[4]?.startTotalP50).toBe(p50[3]);

    expect(monthly[12]?.monthIndex).toBe(13);
    expect(monthly[12]?.startTotalP50).toBe(p50[11]);
  });

  it('maps annual Start Total (p50) from first month of each year', () => {
    const rows = Array.from({ length: 24 }, (_, index) => makeRow(index + 1, 300_000 + index * 1_000));
    const p50 = Array.from({ length: 24 }, (_, index) => 500_000 + index * 3_000);

    const annual = buildAnnualDetailRows(rows, 62, 0.02, { month: 1, year: 2035 }, p50);

    expect(annual).toHaveLength(2);
    expect(annual[0]?.startTotalP50).toBe(300_000);
    expect(annual[1]?.startTotalP50).toBe(p50[11]);
  });

  it('keeps Start Total (p50) null when Monte Carlo reference series is not provided', () => {
    const rows = [makeRow(1, 125_000), makeRow(2, 126_000)];

    const monthly = buildMonthlyDetailRows(rows, 61, 0.03, { month: 1, year: 2032 });

    expect(monthly[0]?.startTotalP50).toBeNull();
    expect(monthly[1]?.startTotalP50).toBeNull();
  });
});
