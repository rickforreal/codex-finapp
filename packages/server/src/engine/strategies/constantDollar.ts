import type { ConstantDollarParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';

export interface ConstantDollarContext {
  year: number;
  initialPortfolioValue: number;
  previousWithdrawal: number;
  inflationRate: number;
  params: ConstantDollarParams;
}

export const calculateConstantDollarWithdrawal = (context: ConstantDollarContext): number => {
  if (context.year <= 1) {
    if (context.initialPortfolioValue <= 0) {
      return 0;
    }

    return roundToCents(context.initialPortfolioValue * context.params.initialWithdrawalRate);
  }

  if (context.previousWithdrawal <= 0) {
    return 0;
  }

  return roundToCents(context.previousWithdrawal * (1 + context.inflationRate));
};
