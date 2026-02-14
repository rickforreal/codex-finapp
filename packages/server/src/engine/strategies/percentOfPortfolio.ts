import type { PercentOfPortfolioParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculatePercentOfPortfolioWithdrawal = (
  context: StrategyContext,
  params: PercentOfPortfolioParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  return Math.max(0, roundToCents(context.portfolioValue * params.annualWithdrawalRate));
};
