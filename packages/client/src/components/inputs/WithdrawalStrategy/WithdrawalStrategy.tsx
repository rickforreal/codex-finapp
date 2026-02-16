import { WithdrawalStrategyType } from '@finapp/shared';

import { Dropdown } from '../../shared/Dropdown';
import { useAppStore } from '../../../store/useAppStore';
import { StrategyParams } from './StrategyParams';
import { StrategyTooltip } from './StrategyTooltip';

const STRATEGY_OPTIONS: Array<{ value: WithdrawalStrategyType; label: string }> = [
  { value: WithdrawalStrategyType.ConstantDollar, label: 'Constant Dollar' },
  { value: WithdrawalStrategyType.PercentOfPortfolio, label: 'Percent of Portfolio' },
  { value: WithdrawalStrategyType.OneOverN, label: '1/N' },
  { value: WithdrawalStrategyType.Vpw, label: 'VPW' },
  { value: WithdrawalStrategyType.DynamicSwr, label: 'Dynamic SWR' },
  { value: WithdrawalStrategyType.DynamicSwrAdaptive, label: 'Dynamic SWR (Adaptive TWR)' },
  { value: WithdrawalStrategyType.SensibleWithdrawals, label: 'Sensible Withdrawals' },
  { value: WithdrawalStrategyType.NinetyFivePercent, label: '95% Rule' },
  { value: WithdrawalStrategyType.GuytonKlinger, label: 'Guyton-Klinger' },
  { value: WithdrawalStrategyType.VanguardDynamic, label: 'Vanguard Dynamic' },
  { value: WithdrawalStrategyType.Endowment, label: 'Endowment' },
  { value: WithdrawalStrategyType.HebelerAutopilot, label: 'Hebeler Autopilot II' },
  { value: WithdrawalStrategyType.CapeBased, label: 'CAPE-Based' },
];

export const WithdrawalStrategySection = () => {
  const strategy = useAppStore((state) => state.withdrawalStrategy);
  const setType = useAppStore((state) => state.setWithdrawalStrategyType);

  return (
    <div className="space-y-3">
      <Dropdown value={strategy.type} options={STRATEGY_OPTIONS} onChange={setType} />
      <StrategyParams />
      <StrategyTooltip />
    </div>
  );
};
