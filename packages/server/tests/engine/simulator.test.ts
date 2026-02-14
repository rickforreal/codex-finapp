import { WithdrawalStrategyType } from '@finapp/shared';
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

  it('should run successfully across all 12 withdrawal strategies with distinct withdrawal patterns', () => {
    const base = createBaseConfig();
    const returns = createZeroReturns(base.coreParams.retirementDuration * 12);
    const strategies = [
      { type: WithdrawalStrategyType.ConstantDollar, params: { initialWithdrawalRate: 0.04 } },
      { type: WithdrawalStrategyType.PercentOfPortfolio, params: { annualWithdrawalRate: 0.04 } },
      { type: WithdrawalStrategyType.OneOverN, params: {} },
      { type: WithdrawalStrategyType.Vpw, params: { expectedRealReturn: 0.03, drawdownTarget: 1 } },
      { type: WithdrawalStrategyType.DynamicSwr, params: { expectedRateOfReturn: 0.06 } },
      {
        type: WithdrawalStrategyType.SensibleWithdrawals,
        params: { baseWithdrawalRate: 0.03, extrasWithdrawalRate: 0.1 },
      },
      {
        type: WithdrawalStrategyType.NinetyFivePercent,
        params: { annualWithdrawalRate: 0.04, minimumFloor: 0.95 },
      },
      {
        type: WithdrawalStrategyType.GuytonKlinger,
        params: {
          initialWithdrawalRate: 0.052,
          capitalPreservationTrigger: 0.2,
          capitalPreservationCut: 0.1,
          prosperityTrigger: 0.2,
          prosperityRaise: 0.1,
          guardrailsSunset: 15,
        },
      },
      {
        type: WithdrawalStrategyType.VanguardDynamic,
        params: { annualWithdrawalRate: 0.04, ceiling: 0.05, floor: 0.025 },
      },
      { type: WithdrawalStrategyType.Endowment, params: { spendingRate: 0.05, smoothingWeight: 0.7 } },
      {
        type: WithdrawalStrategyType.HebelerAutopilot,
        params: { initialWithdrawalRate: 0.04, pmtExpectedReturn: 0.03, priorYearWeight: 0.6 },
      },
      {
        type: WithdrawalStrategyType.CapeBased,
        params: { baseWithdrawalRate: 0.015, capeWeight: 0.5, startingCape: 20 },
      },
    ] as const;

    const monthlyWithdrawals = strategies.map((withdrawalStrategy) => {
      const result = simulateRetirement({ ...base, withdrawalStrategy }, returns);
      expect(result.rows).toHaveLength(120);
      return result.rows[0]?.withdrawals.requested ?? 0;
    });

    expect(new Set(monthlyWithdrawals).size).toBeGreaterThanOrEqual(5);
  });
});
