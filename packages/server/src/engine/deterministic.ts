import {
  AssetClass,
  type ActualMonthOverride,
  type ActualOverridesByMonth,
  type AssetBalances,
  type EventDate,
  type EventFrequency,
  type ExpenseEvent,
  type IncomeEvent,
  type SimulationConfig,
  type SinglePathResult,
  type SpendingPhase,
} from '@finapp/shared';

import { applyConfiguredDrawdown } from './drawdown';
import { annualToMonthlyRate, buildMonthlyInflationFactors, inflateAnnualAmount } from './helpers/inflation';
import { createRollingAnnualizedRealReturns } from './helpers/rollingWindow';
import { roundToCents } from './helpers/rounding';
import { calculateAnnualWithdrawal, isMonthlyWithdrawalStrategy } from './strategies';
import { toRealMonthlyReturn } from './strategies/dynamicSwrAdaptive';

const totalPortfolio = (balances: AssetBalances): number =>
  roundToCents(balances.stocks + balances.bonds + balances.cash);
const resolveStartOfMonthWeights = (balances: AssetBalances): { stocks: number; bonds: number; cash: number } => {
  const total = totalPortfolio(balances);
  if (total <= 0) {
    return { stocks: 0, bonds: 0, cash: 0 };
  }

  return {
    stocks: balances.stocks / total,
    bonds: balances.bonds / total,
    cash: balances.cash / total,
  };
};

const findSpendingPhaseForYear = (config: SimulationConfig, year: number): SpendingPhase => {
  const match = config.spendingPhases.find((phase) => year >= phase.startYear && year <= phase.endYear);
  const fallback = config.spendingPhases[config.spendingPhases.length - 1];
  if (!fallback) {
    throw new Error('At least one spending phase is required');
  }
  return match ?? fallback;
};

const monthKeyToIndex = (retirementStart: EventDate, date: EventDate): number =>
  (date.year - retirementStart.year) * 12 + (date.month - retirementStart.month) + 1;

const resolveEventEndMonth = (
  retirementStart: EventDate,
  end: EventDate | 'endOfRetirement',
  retirementMonths: number,
): number => (end === 'endOfRetirement' ? retirementMonths : monthKeyToIndex(retirementStart, end));

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

const normalizeOverrides = (overrides: ActualOverridesByMonth): Record<number, ActualMonthOverride> =>
  Object.entries(overrides).reduce<Record<number, ActualMonthOverride>>((acc, [month, value]) => {
    const key = Number(month);
    if (Number.isInteger(key) && key > 0) {
      acc[key] = value;
    }
    return acc;
  }, {});

const applyEditedWithdrawals = (
  balances: AssetBalances,
  override: ActualMonthOverride,
): { byAsset: AssetBalances; requested: number; actual: number; shortfall: number } | null => {
  if (!override.withdrawalsByAsset) {
    return null;
  }

  const requestedByAsset: AssetBalances = {
    stocks: roundToCents(override.withdrawalsByAsset.stocks ?? 0),
    bonds: roundToCents(override.withdrawalsByAsset.bonds ?? 0),
    cash: roundToCents(override.withdrawalsByAsset.cash ?? 0),
  };

  const actualByAsset: AssetBalances = { stocks: 0, bonds: 0, cash: 0 };
  for (const asset of [AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash]) {
    const requested = requestedByAsset[asset];
    const actual = Math.min(requested, balances[asset]);
    balances[asset] = roundToCents(balances[asset] - actual);
    actualByAsset[asset] = roundToCents(actual);
  }

  const requestedTotal = requestedByAsset.stocks + requestedByAsset.bonds + requestedByAsset.cash;
  const actualTotal = actualByAsset.stocks + actualByAsset.bonds + actualByAsset.cash;

  return {
    byAsset: actualByAsset,
    requested: roundToCents(requestedTotal),
    actual: roundToCents(actualTotal),
    shortfall: roundToCents(requestedTotal - actualTotal),
  };
};

export const reforecastDeterministic = (
  config: SimulationConfig,
  actualOverridesByMonth: ActualOverridesByMonth,
): SinglePathResult => {
  const normalizedOverrides = normalizeOverrides(actualOverridesByMonth);
  const durationMonths = config.coreParams.retirementDuration * 12;
  const withdrawalStartYear = Math.max(1, config.coreParams.withdrawalsStartAt - config.coreParams.startingAge);
  const monthlyRates = {
    stocks: annualToMonthlyRate(config.returnAssumptions.stocks.expectedReturn),
    bonds: annualToMonthlyRate(config.returnAssumptions.bonds.expectedReturn),
    cash: annualToMonthlyRate(config.returnAssumptions.cash.expectedReturn),
  };
  const inflationFactorByMonth = buildMonthlyInflationFactors(
    durationMonths,
    () => config.coreParams.inflationRate,
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
  const adaptiveRollingReturns = isMonthlyWithdrawalStrategy(config.withdrawalStrategy)
    ? createRollingAnnualizedRealReturns(config.withdrawalStrategy.params.lookbackMonths)
    : null;

  const rows: SinglePathResult['rows'] = [];

  for (let monthIndex = 0; monthIndex < durationMonths; monthIndex += 1) {
    const oneBasedMonth = monthIndex + 1;
    const year = Math.floor(monthIndex / 12) + 1;
    const monthInYear = (monthIndex % 12) + 1;
    const override = normalizedOverrides[oneBasedMonth];

    let startBalances = { ...balances };
    if (override?.startBalances) {
      startBalances = {
        stocks: roundToCents(override.startBalances.stocks ?? startBalances.stocks),
        bonds: roundToCents(override.startBalances.bonds ?? startBalances.bonds),
        cash: roundToCents(override.startBalances.cash ?? startBalances.cash),
      };
      balances = { ...startBalances };
    }

    const startPortfolioValue = totalPortfolio(startBalances);
    if (monthInYear === 1) {
      currentYearStartPortfolio = startPortfolioValue;
      currentYearReturnFactor = 1;
    }

    const afterMarket: AssetBalances = {
      stocks: roundToCents(startBalances.stocks * (1 + monthlyRates.stocks)),
      bonds: roundToCents(startBalances.bonds * (1 + monthlyRates.bonds)),
      cash: roundToCents(startBalances.cash * (1 + monthlyRates.cash)),
    };
    const marketChange: AssetBalances = {
      stocks: roundToCents(afterMarket.stocks - startBalances.stocks),
      bonds: roundToCents(afterMarket.bonds - startBalances.bonds),
      cash: roundToCents(afterMarket.cash - startBalances.cash),
    };
    const afterMarketValue = totalPortfolio(afterMarket);
    if (startPortfolioValue > 0) {
      currentYearReturnFactor *= afterMarketValue / startPortfolioValue;
    }
    balances = afterMarket;

    if (year < withdrawalStartYear) {
      previousAnnualWithdrawal = 0;
      currentMonthlyWithdrawal = 0;
    } else if (isMonthlyWithdrawalStrategy(config.withdrawalStrategy)) {
      const annualizedRealReturnsByAsset = adaptiveRollingReturns?.annualized() ?? undefined;
      const monthlyWithdrawal = calculateAnnualWithdrawal(
        {
          year,
          monthIndex: oneBasedMonth,
          retirementYears: config.coreParams.retirementDuration,
          portfolioValue: totalPortfolio(balances),
          initialPortfolioValue: totalPortfolio(initialBalances),
          previousWithdrawal: previousAnnualWithdrawal,
          previousYearReturn,
          previousYearStartPortfolio,
          remainingYears: config.coreParams.retirementDuration - year + 1,
          remainingMonths: durationMonths - monthIndex,
          inflationRate: config.coreParams.inflationRate,
          startOfMonthWeights: resolveStartOfMonthWeights(startBalances),
          annualizedRealReturnsByAsset,
        },
        config.withdrawalStrategy,
      );
      const phase = findSpendingPhaseForYear(config, year);
      const monthlyInflationFactor = inflationFactorByMonth[oneBasedMonth] ?? 1;
      const monthlyMin = roundToCents(phase.minMonthlySpend * monthlyInflationFactor);
      const monthlyMax = roundToCents(phase.maxMonthlySpend * monthlyInflationFactor);
      currentMonthlyWithdrawal = Math.max(monthlyMin, Math.min(monthlyWithdrawal, monthlyMax));
    } else if (monthInYear === 1) {
      const annualWithdrawal = calculateAnnualWithdrawal(
        {
          year,
          monthIndex: oneBasedMonth,
          retirementYears: config.coreParams.retirementDuration,
          portfolioValue: totalPortfolio(balances),
          initialPortfolioValue: totalPortfolio(initialBalances),
          previousWithdrawal: previousAnnualWithdrawal,
          previousYearReturn,
          previousYearStartPortfolio,
          remainingYears: config.coreParams.retirementDuration - year + 1,
          remainingMonths: durationMonths - monthIndex,
          inflationRate: config.coreParams.inflationRate,
          startOfMonthWeights: resolveStartOfMonthWeights(startBalances),
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

    const editedWithdrawals = override ? applyEditedWithdrawals(balances, override) : null;
    const drawdown = editedWithdrawals
      ? {
          balances: { ...balances },
          withdrawnByAsset: editedWithdrawals.byAsset,
          totalWithdrawn: editedWithdrawals.actual,
          shortfall: editedWithdrawals.shortfall,
        }
      : applyConfiguredDrawdown(balances, currentMonthlyWithdrawal, config.drawdownStrategy, year);

    balances = drawdown.balances;
    totalWithdrawn = roundToCents(totalWithdrawn + drawdown.totalWithdrawn);
    totalShortfall = roundToCents(totalShortfall + drawdown.shortfall);

    const incomeTotal = override?.incomeTotal !== undefined
      ? roundToCents(Math.max(0, override.incomeTotal))
      : sumEventIncome(balances, config.incomeEvents, config, oneBasedMonth);
    if (override?.incomeTotal !== undefined) {
      balances.cash = roundToCents(balances.cash + incomeTotal);
    }

    let expenseResult: { actualTotal: number; shortfallTotal: number };
    if (override?.expenseTotal !== undefined) {
      const amount = roundToCents(Math.max(0, override.expenseTotal));
      const expenseDrawdown = applyConfiguredDrawdown(balances, amount, config.drawdownStrategy, year);
      balances = expenseDrawdown.balances;
      expenseResult = { actualTotal: expenseDrawdown.totalWithdrawn, shortfallTotal: expenseDrawdown.shortfall };
    } else {
      expenseResult = sumEventExpenses(balances, config.expenseEvents, config, oneBasedMonth, year);
    }
    totalShortfall = roundToCents(totalShortfall + expenseResult.shortfallTotal);

    if (monthInYear === 12) {
      previousYearReturn = currentYearReturnFactor - 1;
      previousYearStartPortfolio = currentYearStartPortfolio;
    }

    rows.push({
      monthIndex: oneBasedMonth,
      year,
      monthInYear,
      startBalances,
      marketChange,
      withdrawals: {
        byAsset: drawdown.withdrawnByAsset,
        requested: editedWithdrawals?.requested ?? currentMonthlyWithdrawal,
        actual: drawdown.totalWithdrawn,
        shortfall: drawdown.shortfall,
      },
      incomeTotal,
      expenseTotal: expenseResult.actualTotal,
      endBalances: { ...balances },
    });

    if (adaptiveRollingReturns) {
      adaptiveRollingReturns.push({
        stocks: toRealMonthlyReturn(monthlyRates.stocks, config.coreParams.inflationRate),
        bonds: toRealMonthlyReturn(monthlyRates.bonds, config.coreParams.inflationRate),
        cash: toRealMonthlyReturn(monthlyRates.cash, config.coreParams.inflationRate),
      });
    }
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
