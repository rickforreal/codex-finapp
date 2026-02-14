import { WithdrawalStrategyType } from '@finapp/shared';

import { PercentInput } from '../../shared/PercentInput';
import { useAppStore } from '../../../store/useAppStore';

export const StrategyParams = () => {
  const strategy = useAppStore((state) => state.withdrawalStrategy);
  const setInitialWithdrawalRate = useAppStore((state) => state.setInitialWithdrawalRate);

  if (strategy.type !== WithdrawalStrategyType.ConstantDollar) {
    return <p className="text-xs text-slate-500">Parameters coming in Phase 6.</p>;
  }

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600">Initial Withdrawal Rate</p>
      <PercentInput value={strategy.params.initialWithdrawalRate} onChange={setInitialWithdrawalRate} />
    </div>
  );
};
