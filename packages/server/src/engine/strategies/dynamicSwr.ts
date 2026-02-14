import type { DynamicSwrParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateDynamicSwrWithdrawal = (context: StrategyContext, params: DynamicSwrParams): number => {
  if (context.portfolioValue <= 0 || context.remainingYears <= 0) {
    return 0;
  }

  const roi = params.expectedRateOfReturn;
  const inflation = context.inflationRate;

  if (Math.abs(roi - inflation) < 1e-12) {
    return Math.max(0, roundToCents(context.portfolioValue / context.remainingYears));
  }

  const denominator = 1 - ((1 + inflation) / (1 + roi)) ** context.remainingYears;
  if (Math.abs(denominator) < 1e-12) {
    return 0;
  }

  const annual = (context.portfolioValue * (roi - inflation)) / denominator;
  return Math.max(0, roundToCents(annual));
};
