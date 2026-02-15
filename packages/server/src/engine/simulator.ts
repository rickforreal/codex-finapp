import {
  AssetClass,
  type AssetBalances,
  type EventDate,
  type EventFrequency,
  type ExpenseEvent,
  type IncomeEvent,
  type MonthlyReturns,
  type SpendingPhase,
  type SimulationConfig,
  type SinglePathResult,
} from '@finapp/shared';

import { applyConfiguredDrawdown } from './drawdown';
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

const monthKeyToIndex = (retirementStart: EventDate, date: EventDate): number =>
  (date.year - retirementStart.year) * 12 + (date.month - retirementStart.month) + 1;

const resolveEventEndMonth = (
  retirementStart: EventDate,
  end: EventDate | 'endOfRetirement',
  retirementMonths: number,
): number => {
  if (end === 'endOfRetirement') {
    return retirementMonths;
  }
  return monthKeyToIndex(retirementStart, end);
};

const eventMatchesFrequency = (offsetFromStart: number, frequency: EventFrequency): boolean => {
  if (offsetFromStart < 0) {
    return false;
  }
  if (frequency === 'oneTime') {
    return offsetFromStart === 0;
  }
  if (frequency === 'monthly') {
    return true;
  }
  if (frequency === 'quarterly') {
    return offsetFromStart % 3 === 0;
  }
  return offsetFromStart % 12 === 0;
};

const eventAmountForMonth = (
  baseAmount: number,
  inflationAdjusted: boolean,
  inflationRate: number,
  monthIndex: number,
): number => {
  if (!inflationAdjusted) {
    return baseAmount;
  }
  const yearOffset = Math.floor((monthIndex - 1) / 12);
  return roundToCents(inflateAnnualAmount(baseAmount, inflationRate, yearOffset));
};

const sumEventIncome = (
  balances: AssetBalances,
  incomeEvents: IncomeEvent[],
  config: SimulationConfig,
  monthIndex: number,
): number => {
  let incomeTotal = 0;
  for (const event of incomeEvents) {
    const startMonth = monthKeyToIndex(config.coreParams.retirementStartDate, event.start);
    const endMonth = resolveEventEndMonth(
      config.coreParams.retirementStartDate,
      event.end,
      config.coreParams.retirementDuration * 12,
    );
    if (monthIndex < startMonth || monthIndex > endMonth) {
      continue;
    }
    const offset = monthIndex - startMonth;
    if (!eventMatchesFrequency(offset, event.frequency)) {
      continue;
    }

    const amount = eventAmountForMonth(
      event.amount,
      event.inflationAdjusted,
      config.coreParams.inflationRate,
      monthIndex,
    );
    balances[event.depositTo] = roundToCents(balances[event.depositTo] + amount);
    incomeTotal = roundToCents(incomeTotal + amount);
  }
  return incomeTotal;
};

const applyExpenseFromSingleAsset = (
  balances: AssetBalances,
  asset: AssetClass,
  amount: number,
): { actual: number; shortfall: number } => {
  const available = balances[asset];
  const actual = Math.min(available, amount);
  balances[asset] = roundToCents(available - actual);
  return { actual: roundToCents(actual), shortfall: roundToCents(amount - actual) };
};

const sumEventExpenses = (
  balances: AssetBalances,
  expenseEvents: ExpenseEvent[],
  config: SimulationConfig,
  monthIndex: number,
  year: number,
): { actualTotal: number; shortfallTotal: number } => {
  let actualTotal = 0;
  let shortfallTotal = 0;

  for (const event of expenseEvents) {
    const startMonth = monthKeyToIndex(config.coreParams.retirementStartDate, event.start);
    const endMonth = resolveEventEndMonth(
      config.coreParams.retirementStartDate,
      event.end,
      config.coreParams.retirementDuration * 12,
    );
    if (monthIndex < startMonth || monthIndex > endMonth) {
      continue;
    }
    const offset = monthIndex - startMonth;
    if (!eventMatchesFrequency(offset, event.frequency)) {
      continue;
    }

    const amount = eventAmountForMonth(
      event.amount,
      event.inflationAdjusted,
      config.coreParams.inflationRate,
      monthIndex,
    );

    if (event.sourceFrom === 'follow-drawdown') {
      const result = applyConfiguredDrawdown(balances, amount, config.drawdownStrategy, year);
      balances.stocks = result.balances.stocks;
      balances.bonds = result.balances.bonds;
      balances.cash = result.balances.cash;
      actualTotal = roundToCents(actualTotal + result.totalWithdrawn);
      shortfallTotal = roundToCents(shortfallTotal + result.shortfall);
    } else {
      const result = applyExpenseFromSingleAsset(balances, event.sourceFrom, amount);
      actualTotal = roundToCents(actualTotal + result.actual);
      shortfallTotal = roundToCents(shortfallTotal + result.shortfall);
    }
  }

  return { actualTotal, shortfallTotal };
};

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

    const incomeTotal = sumEventIncome(balances, config.incomeEvents, config, monthIndex + 1);

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

    const drawdown = applyConfiguredDrawdown(
      balances,
      currentMonthlyWithdrawal,
      config.drawdownStrategy,
      year,
    );

    balances = drawdown.balances;
    totalWithdrawn = roundToCents(totalWithdrawn + drawdown.totalWithdrawn);
    totalShortfall = roundToCents(totalShortfall + drawdown.shortfall);

    const expenseResult = sumEventExpenses(balances, config.expenseEvents, config, monthIndex + 1, year);
    totalShortfall = roundToCents(totalShortfall + expenseResult.shortfallTotal);

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
      incomeTotal,
      expenseTotal: expenseResult.actualTotal,
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
