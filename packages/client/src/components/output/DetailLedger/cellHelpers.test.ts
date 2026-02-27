import { describe, expect, it } from 'vitest';

import type { DetailRow } from '../../../lib/detailTable';
import { assetColumns, baseColumns, displayCellValue } from './cellHelpers';

const columnByKey = (key: keyof DetailRow) => {
  const column = [...baseColumns, ...assetColumns].find((entry) => entry.key === key);
  if (!column) {
    throw new Error(`Missing column for key ${String(key)}`);
  }
  return column;
};

const row: DetailRow = {
  id: 'm-2',
  monthIndex: 2,
  period: '2030-Feb',
  age: 60,
  startTotalP50: null,
  startTotal: 1_600_000,
  endTotal: 1_641_000,
  marketMovement: 56_000,
  returnPct: 56_000 / 1_600_000,
  income: 0,
  expenses: 0,
  withdrawalNominal: 15_000,
  withdrawalReal: 14_930,
  startStocks: 1_000_000,
  startBonds: 500_000,
  startCash: 100_000,
  moveStocks: 50_000,
  moveBonds: 5_000,
  moveCash: 1_000,
  withdrawalStocks: 10_000,
  withdrawalBonds: 5_000,
  withdrawalCash: 0,
  endStocks: 1_040_000,
  endBonds: 500_000,
  endCash: 101_000,
};

describe('detail ledger override derivation', () => {
  it('recomputes dependent columns when start balances are edited', () => {
    const overrides = {
      2: {
        startBalances: {
          stocks: 1_500_000,
        },
      },
    };

    expect(displayCellValue(row, columnByKey('startTotal'), overrides, 0.03)).toBe(2_100_000);
    expect(displayCellValue(row, columnByKey('moveStocks'), overrides, 0.03)).toBe(550_000);
    expect(displayCellValue(row, columnByKey('marketMovement'), overrides, 0.03)).toBe(556_000);
    expect(Number(displayCellValue(row, columnByKey('returnPct'), overrides, 0.03))).toBeCloseTo(556_000 / 2_100_000, 6);
    expect(displayCellValue(row, columnByKey('endStocks'), overrides, 0.03)).toBe(2_040_000);
    expect(displayCellValue(row, columnByKey('endTotal'), overrides, 0.03)).toBe(2_641_000);
  });

  it('recomputes withdrawal totals and ending balances when withdrawal-by-asset is edited', () => {
    const overrides = {
      2: {
        withdrawalsByAsset: {
          stocks: 20_000,
          bonds: 8_000,
          cash: 2_000,
        },
      },
    };

    expect(displayCellValue(row, columnByKey('withdrawalNominal'), overrides, 0.03)).toBe(30_000);
    expect(Number(displayCellValue(row, columnByKey('withdrawalReal'), overrides, 0.03))).toBeCloseTo(
      30_000 / ((1 + 0.03) ** (2 / 12)),
      4,
    );
    expect(displayCellValue(row, columnByKey('endStocks'), overrides, 0.03)).toBe(1_030_000);
    expect(displayCellValue(row, columnByKey('endBonds'), overrides, 0.03)).toBe(497_000);
    expect(displayCellValue(row, columnByKey('endCash'), overrides, 0.03)).toBe(99_000);
    expect(displayCellValue(row, columnByKey('endTotal'), overrides, 0.03)).toBe(1_626_000);
  });
});
