import type { SensibleWithdrawalsParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateSensibleWithdrawals = (
  context: StrategyContext,
  params: SensibleWithdrawalsParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  const base = context.portfolioValue * params.baseWithdrawalRate;

  if (context.year <= 1) {
    return Math.max(0, roundToCents(base));
  }

  const realGain = context.previousYearStartPortfolio * (context.previousYearReturn - context.inflationRate);
  const extras = realGain > 0 ? realGain * params.extrasWithdrawalRate : 0;

  return Math.max(0, roundToCents(base + extras));
};
