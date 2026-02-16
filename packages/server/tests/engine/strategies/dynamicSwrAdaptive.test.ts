import { describe, expect, it } from 'vitest';

import { calculateDynamicSwrWithdrawal } from '../../../src/engine/strategies/dynamicSwr';
import { calculateDynamicSwrAdaptiveMonthlyWithdrawal } from '../../../src/engine/strategies/dynamicSwrAdaptive';
import { createStrategyContext } from './context';

describe('DynamicSWR Adaptive', () => {
  it('uses fallback expected ROI when lookback history is not yet available', () => {
    const context = createStrategyContext({
      remainingMonths: 240,
      trailingRealReturnsByAsset: { stocks: [], bonds: [], cash: [] },
    });

    const monthly = calculateDynamicSwrAdaptiveMonthlyWithdrawal(context, {
      fallbackExpectedRateOfReturn: 0.06,
      lookbackMonths: 12,
    });

    const fallbackAnnual = calculateDynamicSwrWithdrawal(
      { ...context, remainingYears: context.remainingMonths / 12 },
      { expectedRateOfReturn: 0.06 },
    );

    expect(monthly).toBe(Math.round(fallbackAnnual / 12));
  });

  it('switches to realized trailing real TWR after enough history exists', () => {
    const trailing = {
      stocks: Array.from({ length: 12 }, () => 0.01),
      bonds: Array.from({ length: 12 }, () => 0.005),
      cash: Array.from({ length: 12 }, () => 0.002),
    };
    const context = createStrategyContext({
      remainingMonths: 240,
      inflationRate: 0.03,
      trailingRealReturnsByAsset: trailing,
      startOfMonthWeights: { stocks: 0.6, bonds: 0.3, cash: 0.1 },
    });

    const monthly = calculateDynamicSwrAdaptiveMonthlyWithdrawal(context, {
      fallbackExpectedRateOfReturn: 0.02,
      lookbackMonths: 12,
    });

    const annualizedStocks = (1.01 ** 12) - 1;
    const annualizedBonds = (1.005 ** 12) - 1;
    const annualizedCash = (1.002 ** 12) - 1;
    const realRoi =
      annualizedStocks * 0.6 +
      annualizedBonds * 0.3 +
      annualizedCash * 0.1;
    const nominalRoi = (1 + realRoi) * (1 + 0.03) - 1;

    const expectedAnnual = calculateDynamicSwrWithdrawal(
      { ...context, remainingYears: context.remainingMonths / 12 },
      { expectedRateOfReturn: nominalRoi },
    );
    expect(monthly).toBe(Math.round(expectedAnnual / 12));
  });

  it('returns 0 when portfolio is depleted', () => {
    const context = createStrategyContext({ portfolioValue: 0 });
    const monthly = calculateDynamicSwrAdaptiveMonthlyWithdrawal(context, {
      fallbackExpectedRateOfReturn: 0.06,
      lookbackMonths: 12,
    });

    expect(monthly).toBe(0);
  });
});

