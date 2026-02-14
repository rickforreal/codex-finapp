import {
  WithdrawalStrategyType,
  type WithdrawalStrategyConfig,
  type WithdrawalStrategyType as WithdrawalStrategyTypeValue,
} from '@finapp/shared';

import { calculateCapeBasedWithdrawal } from './capeBased';
import { calculateConstantDollarWithdrawal } from './constantDollar';
import { calculateDynamicSwrWithdrawal } from './dynamicSwr';
import { calculateEndowmentWithdrawal } from './endowment';
import { calculateGuytonKlingerWithdrawal } from './guytonKlinger';
import { calculateHebelerAutopilotWithdrawal } from './hebelerAutopilot';
import { calculateNinetyFivePercentWithdrawal } from './ninetyFivePercent';
import { calculateOneOverNWithdrawal } from './oneOverN';
import { calculatePercentOfPortfolioWithdrawal } from './percentOfPortfolio';
import { calculateSensibleWithdrawals } from './sensibleWithdrawals';
import type { StrategyContext, StrategyFunction } from './types';
import { calculateVanguardDynamicWithdrawal } from './vanguardDynamic';
import { calculateVpwWithdrawal } from './vpw';

const strategyRegistry: {
  [K in WithdrawalStrategyTypeValue]: StrategyFunction<Extract<WithdrawalStrategyConfig, { type: K }>['params']>;
} = {
  [WithdrawalStrategyType.ConstantDollar]: (context, params) =>
    calculateConstantDollarWithdrawal({
      year: context.year,
      initialPortfolioValue: context.initialPortfolioValue,
      previousWithdrawal: context.previousWithdrawal,
      inflationRate: context.inflationRate,
      params,
    }),
  [WithdrawalStrategyType.PercentOfPortfolio]: calculatePercentOfPortfolioWithdrawal,
  [WithdrawalStrategyType.OneOverN]: calculateOneOverNWithdrawal,
  [WithdrawalStrategyType.Vpw]: calculateVpwWithdrawal,
  [WithdrawalStrategyType.DynamicSwr]: calculateDynamicSwrWithdrawal,
  [WithdrawalStrategyType.SensibleWithdrawals]: calculateSensibleWithdrawals,
  [WithdrawalStrategyType.NinetyFivePercent]: calculateNinetyFivePercentWithdrawal,
  [WithdrawalStrategyType.GuytonKlinger]: calculateGuytonKlingerWithdrawal,
  [WithdrawalStrategyType.VanguardDynamic]: calculateVanguardDynamicWithdrawal,
  [WithdrawalStrategyType.Endowment]: calculateEndowmentWithdrawal,
  [WithdrawalStrategyType.HebelerAutopilot]: calculateHebelerAutopilotWithdrawal,
  [WithdrawalStrategyType.CapeBased]: calculateCapeBasedWithdrawal,
};

export const calculateAnnualWithdrawal = (
  context: StrategyContext,
  strategy: WithdrawalStrategyConfig,
): number => {
  const calculator = strategyRegistry[strategy.type] as StrategyFunction<typeof strategy.params>;
  return calculator(context, strategy.params);
};
