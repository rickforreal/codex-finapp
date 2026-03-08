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
  type MonthYear,
} from '@finapp/shared';

import { applyConfiguredDrawdown } from './drawdown';
import { annualToMonthlyRate, buildMonthlyInflationFactors, inflateAnnualAmount } from './helpers/inflation';
import { createRollingAnnualizedRealReturns } from './helpers/rollingWindow';
import { roundToCents } from './helpers/rounding';
import { calculateAnnualWithdrawal, isMonthlyWithdrawalStrategy } from './strategies';
import { toRealMonthlyReturn } from './strategies/dynamicSwrAdaptive';
import { addMonths, compareMonthYear, monthsBetween } from './helpers/dates';

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

const findSpendingPhaseForMonth = (config: SimulationConfig, monthIndex: number): SpendingPhase | null => {
  const currentDate = addMonths(config.coreParams.portfolioStart, monthIndex - 1);
  const match = config.spendingPhases.find(
    (phase) => compareMonthYear(currentDate, phase.start) >= 0 && compareMonthYear(currentDate, phase.end) <= 0
  );
  return match ?? null;
};

const monthKeyToIndex = (portfolioStart: MonthYear, date: MonthYear): number =>
  monthsBetween(portfolioStart, date) + 1;

const resolveWithdrawalStartMonthIndex = (config: SimulationConfig): number | null => {
  if (config.spendingPhases.length === 0) {
    return null;
  }
  return config.spendingPhases.reduce((minStart, phase) => {
    const phaseStart = monthKeyToIndex(config.coreParams.portfolioStart, phase.start);
    return Math.min(minStart, phaseStart);
  }, Number.POSITIVE_INFINITY);
};

const resolveEventEndMonth = (
  portfolioStart: MonthYear,
  end: EventDate | 'endOfRetirement',
  portfolioMonths: number,
): number => (end === 'endOfRetirement' ? portfolioMonths : monthKeyToIndex(portfolioStart, end));

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
    const startMonth = monthKeyToIndex(config.coreParams.portfolioStart, event.start);
    const endMonth = resolveEventEndMonth(
      config.coreParams.portfolioStart,
      event.end,
      monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd),
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
    const startMonth = monthKeyToIndex(config.coreParams.portfolioStart, event.start);
    const endMonth = resolveEventEndMonth(
      config.coreParams.portfolioStart,
      event.end,
      monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd),
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
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);
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
  let previousAdaptiveFinalMonthlyWithdrawal: number | undefined;
  let totalWithdrawn = 0;
  let totalShortfall = 0;
  const withdrawalStartMonthIndex = resolveWithdrawalStartMonthIndex(config);
  const totalWithdrawalMonths =
    withdrawalStartMonthIndex === null ? durationMonths : durationMonths - (withdrawalStartMonthIndex - 1);
  const totalWithdrawalYears = Math.ceil(totalWithdrawalMonths / 12);
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

    const phase = findSpendingPhaseForMonth(config, oneBasedMonth);
    const withdrawalMonthIndex =
      withdrawalStartMonthIndex === null ? oneBasedMonth : oneBasedMonth - withdrawalStartMonthIndex + 1;
    const withdrawalYear = Math.floor((withdrawalMonthIndex - 1) / 12) + 1;
    const withdrawalMonthInYear = ((withdrawalMonthIndex - 1) % 12) + 1;
    const remainingWithdrawalMonths = totalWithdrawalMonths - (withdrawalMonthIndex - 1);
    const remainingRetirementYears = Math.ceil(remainingWithdrawalMonths / 12);

    if (!phase) {
      previousAnnualWithdrawal = 0;
      currentMonthlyWithdrawal = 0;
      previousAdaptiveFinalMonthlyWithdrawal = 0;
    } else if (isMonthlyWithdrawalStrategy(config.withdrawalStrategy)) {
      const annualizedRealReturnsByAsset = adaptiveRollingReturns?.annualized() ?? undefined;
      const monthlyWithdrawal = calculateAnnualWithdrawal(
        {
          year: withdrawalYear,
          monthIndex: oneBasedMonth,
          retirementYears: totalWithdrawalYears,
          portfolioValue: totalPortfolio(balances),
          initialPortfolioValue: totalPortfolio(initialBalances),
          previousWithdrawal: previousAnnualWithdrawal,
          previousMonthlyWithdrawal: previousAdaptiveFinalMonthlyWithdrawal,
          previousYearReturn,
          previousYearStartPortfolio,
          remainingYears: remainingRetirementYears,
          remainingMonths: durationMonths - monthIndex,
          inflationRate: config.coreParams.inflationRate,
          startOfMonthWeights: resolveStartOfMonthWeights(startBalances),
          annualizedRealReturnsByAsset,
        },
        config.withdrawalStrategy,
      );
      const monthlyInflationFactor = inflationFactorByMonth[oneBasedMonth] ?? 1;
      const monthlyMin = phase.minMonthlySpend !== undefined ? roundToCents(phase.minMonthlySpend * monthlyInflationFactor) : 0;
      const monthlyMax = phase.maxMonthlySpend !== undefined ? roundToCents(phase.maxMonthlySpend * monthlyInflationFactor) : Infinity;
      currentMonthlyWithdrawal = Math.max(monthlyMin, Math.min(monthlyWithdrawal, monthlyMax));
    } else if (withdrawalMonthInYear === 1 || currentMonthlyWithdrawal === 0) {
      const annualWithdrawal = calculateAnnualWithdrawal(
        {
          year: withdrawalYear,
          monthIndex: oneBasedMonth,
          retirementYears: totalWithdrawalYears,
          portfolioValue: totalPortfolio(balances),
          initialPortfolioValue: totalPortfolio(initialBalances),
          previousWithdrawal: previousAnnualWithdrawal,
          previousYearReturn,
          previousYearStartPortfolio,
          remainingYears: remainingRetirementYears,
          remainingMonths: durationMonths - monthIndex,
          inflationRate: config.coreParams.inflationRate,
          startOfMonthWeights: resolveStartOfMonthWeights(startBalances),
        },
        config.withdrawalStrategy,
      );
      const clampedAnnual = (() => {
        const annualMin = phase.minMonthlySpend !== undefined ? roundToCents(
          inflateAnnualAmount(phase.minMonthlySpend * 12, config.coreParams.inflationRate, year - 1),
        ) : 0;
        const annualMax = phase.maxMonthlySpend !== undefined ? roundToCents(
          inflateAnnualAmount(phase.maxMonthlySpend * 12, config.coreParams.inflationRate, year - 1),
        ) : Infinity;
        return Math.max(annualMin, Math.min(annualWithdrawal, annualMax));
      })();
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

    if (isMonthlyWithdrawalStrategy(config.withdrawalStrategy)) {
      previousAdaptiveFinalMonthlyWithdrawal = editedWithdrawals?.requested ?? currentMonthlyWithdrawal;
    }

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
