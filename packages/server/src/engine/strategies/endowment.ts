import type { EndowmentParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateEndowmentWithdrawal = (
  context: StrategyContext,
  params: EndowmentParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  const newCalculation = context.portfolioValue * params.spendingRate;
  if (context.year <= 1) {
    return Math.max(0, roundToCents(newCalculation));
  }

  const priorInflated = context.previousWithdrawal * (1 + context.inflationRate);
  const blended = params.smoothingWeight * priorInflated + (1 - params.smoothingWeight) * newCalculation;

  return Math.max(0, roundToCents(blended));
};
