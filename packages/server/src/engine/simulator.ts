import {
  AssetClass,
  type AssetBalances,
  type MonthlyReturns,
  type SpendingPhase,
  type SimulationConfig,
  type SinglePathResult,
} from '@finapp/shared';

import { applyBucketDrawdown } from './drawdown/bucket';
import { inflateAnnualAmount } from './helpers/inflation';
import { createSeededRandom, generateRandomMonthlyReturn } from './helpers/returns';
import { roundToCents } from './helpers/rounding';
import { calculateAnnualWithdrawal } from './strategies';

const assetOrder: AssetClass[] = [AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash];

const totalPortfolio = (balances: AssetBalances): number =>
  roundToCents(balances.stocks + balances.bonds + balances.cash);

const findSpendingPhaseForYear = (config: SimulationConfig, year: number): SpendingPhase => {
  const match = config.spendingPhases.find((phase) => year >= phase.startYear && year <= phase.endYear);
  const fallback = config.spendingPhases[config.spendingPhases.length - 1];

  if (fallback === undefined) {
    throw new Error('At least one spending phase is required');
  }

  return match ?? fallback;
};

const applyMarketReturns = (balances: AssetBalances, monthlyReturns: MonthlyReturns): AssetBalances => ({
  [AssetClass.Stocks]: roundToCents(balances.stocks * (1 + monthlyReturns.stocks)),
  [AssetClass.Bonds]: roundToCents(balances.bonds * (1 + monthlyReturns.bonds)),
  [AssetClass.Cash]: roundToCents(balances.cash * (1 + monthlyReturns.cash)),
});

const diffBalances = (after: AssetBalances, before: AssetBalances): AssetBalances => ({
  [AssetClass.Stocks]: roundToCents(after.stocks - before.stocks),
  [AssetClass.Bonds]: roundToCents(after.bonds - before.bonds),
  [AssetClass.Cash]: roundToCents(after.cash - before.cash),
});

export const simulateRetirement = (
  config: SimulationConfig,
  monthlyReturnsSeries: MonthlyReturns[],
): SinglePathResult => {
  const durationMonths = config.coreParams.retirementDuration * 12;
  const withdrawalStartYear = Math.max(
    1,
    config.coreParams.withdrawalsStartAt - config.coreParams.startingAge,
  );
  const initialBalances: AssetBalances = {
    stocks: config.portfolio.stocks,
    bonds: config.portfolio.bonds,
    cash: config.portfolio.cash,
  };

  let balances = { ...initialBalances };
  let previousAnnualWithdrawal = 0;
  let previousYearReturn = 0;
  let previousYearStartPortfolio = totalPortfolio(initialBalances);
  let currentYearStartPortfolio = totalPortfolio(initialBalances);
  let currentYearReturnFactor = 1;
  let currentMonthlyWithdrawal = 0;
  let totalWithdrawn = 0;
  let totalShortfall = 0;

  const rows: SinglePathResult['rows'] = [];

  for (let monthIndex = 0; monthIndex < durationMonths; monthIndex += 1) {
    const year = Math.floor(monthIndex / 12) + 1;
    const monthInYear = (monthIndex % 12) + 1;
    const startBalances = { ...balances };
    const startPortfolioValue = totalPortfolio(startBalances);

    if (monthInYear === 1) {
      currentYearStartPortfolio = startPortfolioValue;
      currentYearReturnFactor = 1;
    }

    const returns = monthlyReturnsSeries[monthIndex] ?? { stocks: 0, bonds: 0, cash: 0 };
    const afterMarket = applyMarketReturns(startBalances, returns);
    const marketChange = diffBalances(afterMarket, startBalances);
    const afterMarketValue = totalPortfolio(afterMarket);
    if (startPortfolioValue > 0) {
      currentYearReturnFactor *= afterMarketValue / startPortfolioValue;
    }
    balances = afterMarket;

    if (monthInYear === 1) {
      if (year < withdrawalStartYear) {
        previousAnnualWithdrawal = 0;
        currentMonthlyWithdrawal = 0;
      } else {
        const annualWithdrawal = calculateAnnualWithdrawal(
          {
            year,
            retirementYears: config.coreParams.retirementDuration,
            portfolioValue: totalPortfolio(balances),
            initialPortfolioValue: totalPortfolio(initialBalances),
            previousWithdrawal: previousAnnualWithdrawal,
            previousYearReturn,
            previousYearStartPortfolio,
            remainingYears: config.coreParams.retirementDuration - year + 1,
            inflationRate: config.coreParams.inflationRate,
          },
          config.withdrawalStrategy,
        );

        const phase = findSpendingPhaseForYear(config, year);
        const annualMin = roundToCents(
          inflateAnnualAmount(phase.minMonthlySpend * 12, config.coreParams.inflationRate, year - 1),
        );
        const annualMax = roundToCents(
          inflateAnnualAmount(phase.maxMonthlySpend * 12, config.coreParams.inflationRate, year - 1),
        );

        const clampedAnnual = Math.max(annualMin, Math.min(annualWithdrawal, annualMax));

        previousAnnualWithdrawal = clampedAnnual;
        currentMonthlyWithdrawal = roundToCents(clampedAnnual / 12);
      }
    }

    const drawdown = applyBucketDrawdown(
      balances,
      currentMonthlyWithdrawal,
      config.drawdownStrategy.bucketOrder,
    );

    balances = drawdown.balances;
    totalWithdrawn = roundToCents(totalWithdrawn + drawdown.totalWithdrawn);
    totalShortfall = roundToCents(totalShortfall + drawdown.shortfall);

    if (monthInYear === 12) {
      previousYearReturn = currentYearReturnFactor - 1;
      previousYearStartPortfolio = currentYearStartPortfolio;
    }

    rows.push({
      monthIndex: monthIndex + 1,
      year,
      monthInYear,
      startBalances,
      marketChange,
      withdrawals: {
        byAsset: drawdown.withdrawnByAsset,
        requested: currentMonthlyWithdrawal,
        actual: drawdown.totalWithdrawn,
        shortfall: drawdown.shortfall,
      },
      incomeTotal: 0,
      expenseTotal: 0,
      endBalances: { ...balances },
    });
  }

  return {
    rows,
    summary: {
      totalWithdrawn,
      totalShortfall,
      terminalPortfolioValue: totalPortfolio(balances),
    },
  };
};

export const defaultMonthlyReturnsForConfig = (config: SimulationConfig): MonthlyReturns[] => {
  const durationMonths = config.coreParams.retirementDuration * 12;

  return Array.from({ length: durationMonths }, () => ({
    stocks: 0,
    bonds: 0,
    cash: 0,
  }));
};

export const generateMonthlyReturnsFromAssumptions = (
  config: SimulationConfig,
  seed?: number,
): MonthlyReturns[] => {
  const durationMonths = config.coreParams.retirementDuration * 12;
  const random = seed === undefined ? Math.random : createSeededRandom(seed);

  return Array.from({ length: durationMonths }, () => ({
    stocks: generateRandomMonthlyReturn(
      config.returnAssumptions.stocks.expectedReturn,
      config.returnAssumptions.stocks.stdDev,
      random,
    ),
    bonds: generateRandomMonthlyReturn(
      config.returnAssumptions.bonds.expectedReturn,
      config.returnAssumptions.bonds.stdDev,
      random,
    ),
    cash: generateRandomMonthlyReturn(
      config.returnAssumptions.cash.expectedReturn,
      config.returnAssumptions.cash.stdDev,
      random,
    ),
  }));
};

export const emptyAssetBalances = (): AssetBalances => ({
  stocks: 0,
  bonds: 0,
  cash: 0,
});

export const allAssets = () => assetOrder;
