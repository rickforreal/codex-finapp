import { AssetClass, type AssetBalances } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';

export interface BucketDrawdownResult {
  balances: AssetBalances;
  withdrawnByAsset: AssetBalances;
  totalWithdrawn: number;
  shortfall: number;
}

export const applyBucketDrawdown = (
  balances: AssetBalances,
  requestedWithdrawal: number,
  bucketOrder: AssetClass[],
): BucketDrawdownResult => {
  const nextBalances: AssetBalances = { ...balances };
  const withdrawnByAsset: AssetBalances = {
    [AssetClass.Stocks]: 0,
    [AssetClass.Bonds]: 0,
    [AssetClass.Cash]: 0,
  };

  let remaining = roundToCents(requestedWithdrawal);

  for (const asset of bucketOrder) {
    if (remaining <= 0) {
      break;
    }

    const available = nextBalances[asset];
    const deduction = Math.min(remaining, available);

    nextBalances[asset] = roundToCents(available - deduction);
    withdrawnByAsset[asset] = roundToCents(withdrawnByAsset[asset] + deduction);
    remaining = roundToCents(remaining - deduction);
  }

  const totalWithdrawn = roundToCents(requestedWithdrawal - remaining);

  return {
    balances: nextBalances,
    withdrawnByAsset,
    totalWithdrawn,
    shortfall: remaining,
  };
};
