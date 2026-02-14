import type { HebelerAutopilotParams } from '@finapp/shared';

import { pmt } from '../helpers/pmt';
import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateHebelerAutopilotWithdrawal = (
  context: StrategyContext,
  params: HebelerAutopilotParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  if (context.year <= 1) {
    return Math.max(0, roundToCents(context.initialPortfolioValue * params.initialWithdrawalRate));
  }

  const pmtReal = pmt(params.pmtExpectedReturn, context.remainingYears, context.portfolioValue, 0);
  const pmtNominal = pmtReal * (1 + context.inflationRate) ** (context.year - 1);
  const priorComponent = context.previousWithdrawal * (1 + context.inflationRate);
  const blended = params.priorYearWeight * priorComponent + (1 - params.priorYearWeight) * pmtNominal;

  return Math.max(0, roundToCents(blended));
};
