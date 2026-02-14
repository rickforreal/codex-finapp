import {
  AssetClass,
  type AssetBalances,
  type MonthlyReturns,
  type SpendingPhase,
  type SimulationConfig,
  type SinglePathResult,
  WithdrawalStrategyType,
} from '@finapp/shared';

import { applyBucketDrawdown } from './drawdown/bucket';
import { inflateAnnualAmount } from './helpers/inflation';
import { roundToCents } from './helpers/rounding';
import { calculateConstantDollarWithdrawal } from './strategies/constantDollar';

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
  const initialBalances: AssetBalances = {
    stocks: config.portfolio.stocks,
    bonds: config.portfolio.bonds,
    cash: config.portfolio.cash,
  };

  let balances = { ...initialBalances };
  let previousAnnualWithdrawal = 0;
  let currentMonthlyWithdrawal = 0;
  let totalWithdrawn = 0;
  let totalShortfall = 0;

  const rows: SinglePathResult['rows'] = [];

  for (let monthIndex = 0; monthIndex < durationMonths; monthIndex += 1) {
    const year = Math.floor(monthIndex / 12) + 1;
    const monthInYear = (monthIndex % 12) + 1;
    const startBalances = { ...balances };

    const returns = monthlyReturnsSeries[monthIndex] ?? { stocks: 0, bonds: 0, cash: 0 };
    const afterMarket = applyMarketReturns(startBalances, returns);
    const marketChange = diffBalances(afterMarket, startBalances);
    balances = afterMarket;

    if (monthInYear === 1) {
      let annualWithdrawal = 0;

      if (config.withdrawalStrategy.type === WithdrawalStrategyType.ConstantDollar) {
        annualWithdrawal = calculateConstantDollarWithdrawal({
          year,
          initialPortfolioValue: totalPortfolio(initialBalances),
          previousWithdrawal: previousAnnualWithdrawal,
          inflationRate: config.coreParams.inflationRate,
          params: config.withdrawalStrategy.params,
        });
      }

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

    const drawdown = applyBucketDrawdown(
      balances,
      currentMonthlyWithdrawal,
      config.drawdownStrategy.bucketOrder,
    );

    balances = drawdown.balances;
    totalWithdrawn = roundToCents(totalWithdrawn + drawdown.totalWithdrawn);
    totalShortfall = roundToCents(totalShortfall + drawdown.shortfall);

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

export const generateMonthlyReturnsFromAssumptions = (config: SimulationConfig): MonthlyReturns[] => {
  const durationMonths = config.coreParams.retirementDuration * 12;

  return Array.from({ length: durationMonths }, () => ({
    stocks: config.returnAssumptions.stocks.expectedReturn / 12,
    bonds: config.returnAssumptions.bonds.expectedReturn / 12,
    cash: config.returnAssumptions.cash.expectedReturn / 12,
  }));
};

export const emptyAssetBalances = (): AssetBalances => ({
  stocks: 0,
  bonds: 0,
  cash: 0,
});

export const allAssets = () => assetOrder;
