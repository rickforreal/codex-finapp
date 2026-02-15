import { AssetClass, type AssetBalances, type GlidePathWaypoint } from '@finapp/shared';

import { roundToCents } from '../helpers/rounding';

export interface RebalancingDrawdownResult {
  balances: AssetBalances;
  withdrawnByAsset: AssetBalances;
  totalWithdrawn: number;
  shortfall: number;
}

const assetOrder: AssetClass[] = [AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash];

const emptyWithdrawnByAsset = (): AssetBalances => ({
  [AssetClass.Stocks]: 0,
  [AssetClass.Bonds]: 0,
  [AssetClass.Cash]: 0,
});

const totalPortfolio = (balances: AssetBalances): number =>
  roundToCents(balances.stocks + balances.bonds + balances.cash);

const deduct = (
  balances: AssetBalances,
  withdrawnByAsset: AssetBalances,
  asset: AssetClass,
  amount: number,
): number => {
  if (amount <= 0) {
    return 0;
  }

  const available = balances[asset];
  const deduction = Math.min(available, roundToCents(amount));
  balances[asset] = roundToCents(available - deduction);
  withdrawnByAsset[asset] = roundToCents(withdrawnByAsset[asset] + deduction);
  return deduction;
};

const normalizeWeights = (weights: Record<AssetClass, number>): Record<AssetClass, number> => {
  const total = weights.stocks + weights.bonds + weights.cash;
  if (total <= 0) {
    return { stocks: 0, bonds: 0, cash: 0 };
  }
  return {
    stocks: weights.stocks / total,
    bonds: weights.bonds / total,
    cash: weights.cash / total,
  };
};

const interpolate = (a: number, b: number, weight: number): number => a + (b - a) * weight;

export const resolveTargetAllocationForYear = (
  targetAllocation: Record<AssetClass, number>,
  glidePathEnabled: boolean,
  glidePath: GlidePathWaypoint[],
  year: number,
): Record<AssetClass, number> => {
  if (!glidePathEnabled || glidePath.length < 2) {
    return normalizeWeights(targetAllocation);
  }

  const sorted = [...glidePath].sort((a, b) => a.year - b.year);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (first === undefined || last === undefined) {
    return normalizeWeights(targetAllocation);
  }

  if (year <= first.year) {
    return normalizeWeights(first.allocation);
  }
  if (year >= last.year) {
    return normalizeWeights(last.allocation);
  }

  for (let idx = 0; idx < sorted.length - 1; idx += 1) {
    const left = sorted[idx];
    const right = sorted[idx + 1];
    if (!left || !right) {
      continue;
    }
    if (year < left.year || year > right.year) {
      continue;
    }

    const span = right.year - left.year;
    const weight = span === 0 ? 0 : (year - left.year) / span;
    return normalizeWeights({
      stocks: interpolate(left.allocation.stocks, right.allocation.stocks, weight),
      bonds: interpolate(left.allocation.bonds, right.allocation.bonds, weight),
      cash: interpolate(left.allocation.cash, right.allocation.cash, weight),
    });
  }

  return normalizeWeights(targetAllocation);
};

export const applyRebalancingDrawdown = (
  balances: AssetBalances,
  requestedWithdrawal: number,
  targetAllocation: Record<AssetClass, number>,
): RebalancingDrawdownResult => {
  const nextBalances = { ...balances };
  const withdrawnByAsset = emptyWithdrawnByAsset();
  let remaining = roundToCents(requestedWithdrawal);

  if (remaining <= 0) {
    return {
      balances: nextBalances,
      withdrawnByAsset,
      totalWithdrawn: 0,
      shortfall: 0,
    };
  }

  const startingTotal = totalPortfolio(nextBalances);
  if (startingTotal <= 0) {
    return {
      balances: nextBalances,
      withdrawnByAsset,
      totalWithdrawn: 0,
      shortfall: remaining,
    };
  }

  const normalizedTarget = normalizeWeights(targetAllocation);
  const overweight = assetOrder
    .map((asset) => ({
      asset,
      overweight: Math.max(0, roundToCents(nextBalances[asset] - roundToCents(startingTotal * normalizedTarget[asset]))),
    }))
    .sort((a, b) => b.overweight - a.overweight);

  for (const { asset, overweight: overweightAmount } of overweight) {
    if (remaining <= 0) {
      break;
    }
    const used = deduct(nextBalances, withdrawnByAsset, asset, Math.min(remaining, overweightAmount));
    remaining = roundToCents(remaining - used);
  }

  if (remaining > 0) {
    while (remaining > 0) {
      const availableAssets = assetOrder.filter((asset) => nextBalances[asset] > 0);
      if (availableAssets.length === 0) {
        break;
      }

      const availableTotal = availableAssets.reduce((sum, asset) => sum + nextBalances[asset], 0);
      let deductedThisPass = 0;

      for (const asset of availableAssets) {
        if (remaining <= 0) {
          break;
        }
        const share = availableTotal <= 0 ? 0 : remaining * (nextBalances[asset] / availableTotal);
        const used = deduct(nextBalances, withdrawnByAsset, asset, share);
        deductedThisPass = roundToCents(deductedThisPass + used);
      }

      if (deductedThisPass <= 0) {
        // Guard against rounding stalemates; take from the largest remaining balance.
        const fallback = availableAssets.sort((a, b) => nextBalances[b] - nextBalances[a])[0];
        if (fallback === undefined) {
          break;
        }
        const used = deduct(nextBalances, withdrawnByAsset, fallback, remaining);
        deductedThisPass = roundToCents(deductedThisPass + used);
      }

      remaining = roundToCents(remaining - deductedThisPass);
    }
  }

  return {
    balances: nextBalances,
    withdrawnByAsset,
    totalWithdrawn: roundToCents(requestedWithdrawal - remaining),
    shortfall: remaining,
  };
};
