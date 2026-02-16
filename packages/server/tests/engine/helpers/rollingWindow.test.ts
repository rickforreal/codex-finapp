import { describe, expect, it } from 'vitest';

import { createRollingAnnualizedRealReturns } from '../../../src/engine/helpers/rollingWindow';

describe('rolling window helpers', () => {
  it('returns null before lookback is filled', () => {
    const rolling = createRollingAnnualizedRealReturns(3);
    rolling.push({ stocks: 0.01, bonds: 0.01, cash: 0.01 });
    rolling.push({ stocks: 0.01, bonds: 0.01, cash: 0.01 });

    expect(rolling.annualized()).toBeNull();
  });

  it('annualizes using only the trailing lookback window', () => {
    const rolling = createRollingAnnualizedRealReturns(3);
    rolling.push({ stocks: 0.01, bonds: 0.005, cash: 0.002 });
    rolling.push({ stocks: 0.01, bonds: 0.005, cash: 0.002 });
    rolling.push({ stocks: 0.01, bonds: 0.005, cash: 0.002 });
    const first = rolling.annualized();
    expect(first).not.toBeNull();

    rolling.push({ stocks: 0.02, bonds: 0.01, cash: 0.003 });
    const second = rolling.annualized();
    expect(second).not.toBeNull();

    const expectedStocksFirst = (1.01 ** 3) ** (12 / 3) - 1;
    const expectedStocksSecond = ((1.01 * 1.01 * 1.02) ** (12 / 3)) - 1;
    expect(first?.stocks ?? 0).toBeCloseTo(expectedStocksFirst, 12);
    expect(second?.stocks ?? 0).toBeCloseTo(expectedStocksSecond, 12);
  });
});

