import { WithdrawalStrategyType } from '@finapp/shared';

import { useAppStore } from '../../../store/useAppStore';

const TOOLTIP_BY_STRATEGY: Record<WithdrawalStrategyType, string> = {
  [WithdrawalStrategyType.ConstantDollar]:
    'Year 1 uses initial portfolio × withdrawal rate. Later years inflate prior clamped withdrawal only.',
  [WithdrawalStrategyType.PercentOfPortfolio]:
    'Each year withdraw a fixed percentage of the current portfolio value.',
  [WithdrawalStrategyType.OneOverN]:
    'Each year withdraw current portfolio divided by remaining years, so rate rises over time.',
  [WithdrawalStrategyType.Vpw]:
    'PMT-based approach using expected real return and drawdown target to spend down by horizon.',
  [WithdrawalStrategyType.DynamicSwr]:
    'Annuity-style formula using expected nominal return and inflation with full horizon recalculation each year.',
  [WithdrawalStrategyType.SensibleWithdrawals]:
    'Base withdrawal plus extras when prior-year real portfolio gains are positive.',
  [WithdrawalStrategyType.NinetyFivePercent]:
    'Withdraw max(current target, prior year withdrawal × floor) to limit downside cuts.',
  [WithdrawalStrategyType.GuytonKlinger]:
    'Inflation baseline with withdrawal freeze and guardrails (capital preservation/prosperity) until sunset.',
  [WithdrawalStrategyType.VanguardDynamic]:
    'Targets portfolio-rate spending but caps annual real spending increases and decreases with a corridor.',
  [WithdrawalStrategyType.Endowment]:
    'Blends inflated prior withdrawal and current portfolio-rate calculation using smoothing weight.',
  [WithdrawalStrategyType.HebelerAutopilot]:
    'Blends inflated prior withdrawal with PMT-based spend-down calculation.',
  [WithdrawalStrategyType.CapeBased]:
    'Uses withdrawal rate = base rate + capeWeight / CAPE; higher CAPE reduces withdrawal rate.',
};

export const StrategyTooltip = () => {
  const strategyType = useAppStore((state) => state.withdrawalStrategy.type);
  return (
    <p className="rounded border border-brand-border bg-brand-surface p-2 text-xs text-slate-600">
      {TOOLTIP_BY_STRATEGY[strategyType]}
    </p>
  );
};
