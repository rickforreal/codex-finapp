import { AssetClass } from '@finapp/shared';
import { describe, expect, it } from 'vitest';

import { simulateRetirement } from '../../src/engine/simulator';
import { createBaseConfig, createZeroReturns } from '../fixtures';

describe('Event processing', () => {
  it('applies recurring income events on the correct frequency and month', () => {
    const config = createBaseConfig();
    config.coreParams.retirementDuration = 2;
    config.coreParams.withdrawalsStartAt = 120;
    config.incomeEvents = [
      {
        id: 'income-quarterly',
        name: 'Quarterly Income',
        amount: 1_000,
        depositTo: AssetClass.Cash,
        start: { month: 1, year: 2030 },
        end: { month: 12, year: 2030 },
        frequency: 'quarterly',
        inflationAdjusted: false,
      },
    ];

    const result = simulateRetirement(config, createZeroReturns(config.coreParams.retirementDuration * 12));
    expect(result.rows[0]?.incomeTotal).toBe(1_000);
    expect(result.rows[1]?.incomeTotal).toBe(0);
    expect(result.rows[3]?.incomeTotal).toBe(1_000);
    expect(result.rows[6]?.incomeTotal).toBe(1_000);
    expect(result.rows[9]?.incomeTotal).toBe(1_000);
  });

  it('inflates recurring annual income amounts each retirement year', () => {
    const config = createBaseConfig();
    config.coreParams.retirementDuration = 2;
    config.coreParams.withdrawalsStartAt = 120;
    config.coreParams.inflationRate = 0.03;
    config.incomeEvents = [
      {
        id: 'income-annual',
        name: 'Annual Income',
        amount: 12_000,
        depositTo: AssetClass.Cash,
        start: { month: 1, year: 2030 },
        end: 'endOfRetirement',
        frequency: 'annual',
        inflationAdjusted: true,
      },
    ];

    const result = simulateRetirement(config, createZeroReturns(config.coreParams.retirementDuration * 12));
    expect(result.rows[0]?.incomeTotal).toBe(12_000);
    expect(result.rows[12]?.incomeTotal).toBe(12_360);
  });

  it('applies expense events and tracks partial fulfillment shortfall', () => {
    const config = createBaseConfig();
    config.coreParams.retirementDuration = 1;
    config.coreParams.withdrawalsStartAt = 120;
    config.portfolio = { stocks: 2_000, bonds: 1_000, cash: 0 };
    config.expenseEvents = [
      {
        id: 'expense-follow',
        name: 'Large Expense',
        amount: 10_000,
        sourceFrom: 'follow-drawdown',
        start: { month: 1, year: 2030 },
        end: 'endOfRetirement',
        frequency: 'oneTime',
        inflationAdjusted: false,
      },
    ];

    const result = simulateRetirement(config, createZeroReturns(12));
    expect(result.rows[0]?.expenseTotal).toBe(3_000);
    expect(result.rows[0]?.endBalances).toEqual({ stocks: 0, bonds: 0, cash: 0 });
    expect(result.summary.totalShortfall).toBe(7_000);
  });
});
