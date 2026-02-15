import {
  DrawdownStrategyType,
  type AssetBalances,
  type DrawdownStrategy,
  type RebalancingDrawdownStrategyConfig,
} from '@finapp/shared';

import { applyBucketDrawdown, type BucketDrawdownResult } from './bucket';
import { applyRebalancingDrawdown, resolveTargetAllocationForYear } from './rebalancing';

export type DrawdownResult = BucketDrawdownResult;

const isRebalancing = (strategy: DrawdownStrategy): strategy is RebalancingDrawdownStrategyConfig =>
  strategy.type === DrawdownStrategyType.Rebalancing;

export const applyConfiguredDrawdown = (
  balances: AssetBalances,
  requestedWithdrawal: number,
  drawdownStrategy: DrawdownStrategy,
  year: number,
): DrawdownResult => {
  if (!isRebalancing(drawdownStrategy)) {
    return applyBucketDrawdown(balances, requestedWithdrawal, drawdownStrategy.bucketOrder);
  }

  const targetAllocation = resolveTargetAllocationForYear(
    drawdownStrategy.rebalancing.targetAllocation,
    drawdownStrategy.rebalancing.glidePathEnabled,
    drawdownStrategy.rebalancing.glidePath,
    year,
  );

  return applyRebalancingDrawdown(balances, requestedWithdrawal, targetAllocation);
};
