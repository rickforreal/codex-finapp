import type { NinetyFivePercentParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateNinetyFivePercentWithdrawal = (
  context: StrategyContext,
  params: NinetyFivePercentParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  const target = context.portfolioValue * params.annualWithdrawalRate;

  if (context.year <= 1) {
    return Math.max(0, roundToCents(target));
  }

  const floor = context.previousWithdrawal * params.minimumFloor;
  return Math.max(0, roundToCents(Math.max(target, floor)));
};
