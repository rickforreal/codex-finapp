import { describe, expect, it } from 'vitest';

import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from '../../src/engine/simulator';
import { createBaseConfig, createZeroReturns } from '../fixtures';

describe('simulateRetirement', () => {
  it('should run a full 10-year simulation with deterministic withdrawals', () => {
    const config = createBaseConfig();
    const returns = createZeroReturns(config.coreParams.retirementDuration * 12);

    const result = simulateRetirement(config, returns);

    expect(result.rows).toHaveLength(120);

    const firstMonth = result.rows[0];
    const firstMonthY2 = result.rows[12];

    expect(firstMonth.withdrawals.requested).toBe(333_333);
    expect(firstMonthY2.withdrawals.requested).toBe(343_333);

    const expectedAnnualWithdrawals = Array.from({ length: 10 }, (_, idx) =>
      Math.round((4_000_000 * (1 + config.coreParams.inflationRate) ** idx) / 12) * 12,
    );

    const totalExpected = expectedAnnualWithdrawals.reduce((sum, yearly) => sum + yearly, 0);
    expect(result.summary.totalWithdrawn).toBe(totalExpected);

    const terminalExpected = 100_000_000 - totalExpected;
    expect(result.summary.terminalPortfolioValue).toBe(terminalExpected);
  });

  it('should deplete cash first, then bonds, then stocks using default bucket order', () => {
    const config = createBaseConfig();
    const returns = createZeroReturns(config.coreParams.retirementDuration * 12);
    const result = simulateRetirement(config, returns);

    const firstStockDrawMonth = result.rows.find((row) => row.withdrawals.byAsset.stocks > 0);

    expect(firstStockDrawMonth).toBeDefined();

    const cashBeforeStockDraw = result.rows[firstStockDrawMonth!.monthIndex - 2];
    expect(cashBeforeStockDraw.endBalances.cash).toBe(0);
    expect(cashBeforeStockDraw.endBalances.bonds).toBeGreaterThanOrEqual(0);
  });

  it('should generate stochastic returns and honor seed reproducibility', () => {
    const config = createBaseConfig();

    const seededA = generateMonthlyReturnsFromAssumptions(config, 77);
    const seededB = generateMonthlyReturnsFromAssumptions(config, 77);
    const unseededA = generateMonthlyReturnsFromAssumptions(config);
    const unseededB = generateMonthlyReturnsFromAssumptions(config);

    expect(seededA).toEqual(seededB);
    expect(unseededA).not.toEqual(unseededB);
  });
});
