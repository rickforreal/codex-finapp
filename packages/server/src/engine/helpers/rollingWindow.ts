import type { AnnualizedRealReturnsByAsset } from '../strategies/types';

type AssetKey = keyof AnnualizedRealReturnsByAsset;

type RollingProductWindow = {
  pushFactor: (factor: number) => void;
  annualizedReturn: () => number;
};

const createRollingProductWindow = (lookbackMonths: number): RollingProductWindow => {
  const window = new Array<number>(lookbackMonths).fill(1);
  let count = 0;
  let cursor = 0;
  let product = 1;

  return {
    pushFactor: (factor) => {
      const safeFactor = Math.max(0.0000001, factor);
      if (count < lookbackMonths) {
        window[count] = safeFactor;
        count += 1;
        product *= safeFactor;
        return;
      }

      const leaving = window[cursor] ?? 1;
      window[cursor] = safeFactor;
      cursor = (cursor + 1) % lookbackMonths;
      product = (product / leaving) * safeFactor;
    },
    annualizedReturn: () => {
      if (count < lookbackMonths) {
        return Number.NaN;
      }
      return product ** (12 / lookbackMonths) - 1;
    },
  };
};

export type RollingAnnualizedRealReturns = {
  push: (realReturns: AnnualizedRealReturnsByAsset) => void;
  annualized: () => AnnualizedRealReturnsByAsset | null;
};

export const createRollingAnnualizedRealReturns = (lookbackMonths: number): RollingAnnualizedRealReturns => {
  const windows: Record<AssetKey, RollingProductWindow> = {
    stocks: createRollingProductWindow(lookbackMonths),
    bonds: createRollingProductWindow(lookbackMonths),
    cash: createRollingProductWindow(lookbackMonths),
  };

  return {
    push: (realReturns) => {
      windows.stocks.pushFactor(1 + realReturns.stocks);
      windows.bonds.pushFactor(1 + realReturns.bonds);
      windows.cash.pushFactor(1 + realReturns.cash);
    },
    annualized: () => {
      const stocks = windows.stocks.annualizedReturn();
      const bonds = windows.bonds.annualizedReturn();
      const cash = windows.cash.annualizedReturn();
      if (!Number.isFinite(stocks) || !Number.isFinite(bonds) || !Number.isFinite(cash)) {
        return null;
      }
      return { stocks, bonds, cash };
    },
  };
};

