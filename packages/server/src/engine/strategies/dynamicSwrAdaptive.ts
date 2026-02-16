import type { DynamicSwrAdaptiveParams } from '@finapp/shared';

import { annualToMonthlyRate } from '../helpers/inflation';
import { roundToCents } from '../helpers/rounding';
import { calculateDynamicSwrWithdrawal } from './dynamicSwr';
import type { StrategyContext } from './types';

const annualizeRealReturn = (series: number[], lookbackMonths: number): number => {
  if (series.length < lookbackMonths) {
    return NaN;
  }

  const trailing = series.slice(series.length - lookbackMonths);
  const growth = trailing.reduce((acc, value) => acc * (1 + value), 1);
  return growth ** (12 / lookbackMonths) - 1;
};

export const calculateDynamicSwrAdaptiveMonthlyWithdrawal = (
  context: StrategyContext,
  params: DynamicSwrAdaptiveParams,
): number => {
  if (context.portfolioValue <= 0 || context.remainingMonths <= 0) {
    return 0;
  }

  const realReturns = context.trailingRealReturnsByAsset;
  const annualizedRealReturns = context.annualizedRealReturnsByAsset;
  const weights = context.startOfMonthWeights;

  let nominalRoi = params.fallbackExpectedRateOfReturn;
  if (realReturns && weights) {
    const stocksAnnualized =
      annualizedRealReturns?.stocks ?? annualizeRealReturn(realReturns.stocks, params.lookbackMonths);
    const bondsAnnualized =
      annualizedRealReturns?.bonds ?? annualizeRealReturn(realReturns.bonds, params.lookbackMonths);
    const cashAnnualized =
      annualizedRealReturns?.cash ?? annualizeRealReturn(realReturns.cash, params.lookbackMonths);
    const hasEnoughHistory =
      Number.isFinite(stocksAnnualized) &&
      Number.isFinite(bondsAnnualized) &&
      Number.isFinite(cashAnnualized);

    if (hasEnoughHistory) {
      const realRoi =
        weights.stocks * stocksAnnualized +
        weights.bonds * bondsAnnualized +
        weights.cash * cashAnnualized;
      nominalRoi = (1 + realRoi) * (1 + context.inflationRate) - 1;
    }
  } else if (annualizedRealReturns && weights) {
    const realRoi =
      weights.stocks * annualizedRealReturns.stocks +
      weights.bonds * annualizedRealReturns.bonds +
      weights.cash * annualizedRealReturns.cash;
    nominalRoi = (1 + realRoi) * (1 + context.inflationRate) - 1;
  }

  const annualWithdrawal = calculateDynamicSwrWithdrawal(
    {
      ...context,
      remainingYears: context.remainingMonths / 12,
    },
    { expectedRateOfReturn: nominalRoi },
  );
  return Math.max(0, roundToCents(annualWithdrawal / 12));
};

export const toRealMonthlyReturn = (nominalMonthlyReturn: number, annualInflationRate: number): number => {
  const monthlyInflation = annualToMonthlyRate(annualInflationRate);
  return (1 + nominalMonthlyReturn) / (1 + monthlyInflation) - 1;
};
