import type { VpwParams } from '@finapp/shared';

import { pmt } from '../helpers/pmt';
import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateVpwWithdrawal = (context: StrategyContext, params: VpwParams): number => {
  if (context.portfolioValue <= 0 || context.remainingYears <= 0) {
    return 0;
  }

  const residual = (1 - params.drawdownTarget) * context.portfolioValue;
  const annualReal = pmt(params.expectedRealReturn, context.remainingYears, context.portfolioValue, -residual);
  const inflationFactor = (1 + context.inflationRate) ** (context.year - 1);
  return Math.max(0, roundToCents(annualReal * inflationFactor));
};
