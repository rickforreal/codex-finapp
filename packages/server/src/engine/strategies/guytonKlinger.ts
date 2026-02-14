import type { GuytonKlingerParams } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';
import type { StrategyContext } from './types';

export const calculateGuytonKlingerWithdrawal = (
  context: StrategyContext,
  params: GuytonKlingerParams,
): number => {
  if (context.portfolioValue <= 0) {
    return 0;
  }

  if (context.year <= 1) {
    return Math.max(0, roundToCents(context.initialPortfolioValue * params.initialWithdrawalRate));
  }

  const initialRate = params.initialWithdrawalRate;
  const currentWithdrawalRate = context.previousWithdrawal / context.portfolioValue;
  const shouldFreeze = context.previousYearReturn < 0 && currentWithdrawalRate > initialRate;

  const base = shouldFreeze
    ? context.previousWithdrawal
    : context.previousWithdrawal * (1 + context.inflationRate);

  const sunsetYear = context.retirementYears - params.guardrailsSunset;
  if (context.year > sunsetYear) {
    return Math.max(0, roundToCents(base));
  }

  const capTriggerRate = initialRate * (1 + params.capitalPreservationTrigger);
  const prosperityTriggerRate = initialRate * (1 - params.prosperityTrigger);

  const rateAfterBase = base / context.portfolioValue;
  const adjusted = rateAfterBase > capTriggerRate ? base * (1 - params.capitalPreservationCut) : base;

  const rateAfterAdjustment = adjusted / context.portfolioValue;
  const withProsperity =
    rateAfterAdjustment < prosperityTriggerRate ? adjusted * (1 + params.prosperityRaise) : adjusted;

  return Math.max(0, roundToCents(withProsperity));
};
