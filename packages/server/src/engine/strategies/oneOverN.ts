import type { OneOverNParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateOneOverNWithdrawal = (context: StrategyContext, params: OneOverNParams): number => {
  void params;
  if (context.portfolioValue <= 0 || context.remainingYears <= 0) {
    return 0;
  }

  return Math.max(0, roundToCents(context.portfolioValue / context.remainingYears));
};
