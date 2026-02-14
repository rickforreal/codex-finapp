import type { CapeBasedParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateCapeBasedWithdrawal = (context: StrategyContext, params: CapeBasedParams): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  const cape = context.capeRatio ?? params.startingCape;
  const safeCape = cape <= 0 ? params.startingCape : cape;
  const rate = params.baseWithdrawalRate + params.capeWeight / safeCape;

  return Math.max(0, roundToCents(context.portfolioValue * rate));
};
