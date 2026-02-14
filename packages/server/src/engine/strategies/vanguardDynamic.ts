import type { VanguardDynamicParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateVanguardDynamicWithdrawal = (
  context: StrategyContext,
  params: VanguardDynamicParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  const target = context.portfolioValue * params.annualWithdrawalRate;

  if (context.year <= 1) {
    return Math.max(0, roundToCents(target));
  }

  const priorInflated = context.previousWithdrawal * (1 + context.inflationRate);
  const ceilingAmount = priorInflated * (1 + params.ceiling);
  const floorAmount = priorInflated * (1 - params.floor);
  const clamped = Math.min(Math.max(target, floorAmount), ceilingAmount);

  return Math.max(0, roundToCents(clamped));
};
