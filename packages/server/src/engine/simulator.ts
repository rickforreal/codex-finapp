import {
  AssetClass,
  type ActualMonthOverride,
  type ActualOverridesByMonth,
  type AssetBalances,
  type EventDate,
  type EventFrequency,
  type ExpenseEvent,
  type IncomeEvent,
  type MonthlyReturns,
  type SpendingPhase,
  type SimulationConfig,
  type SinglePathResult,
  type MonthYear,
} from '@finapp/shared';

import { applyConfiguredDrawdown } from './drawdown';
import { buildMonthlyInflationFactors, inflateAnnualAmount } from './helpers/inflation';
import { createRollingAnnualizedRealReturns } from './helpers/rollingWindow';
import { createSeededRandom, generateRandomMonthlyReturn } from './helpers/returns';
import { roundToCents } from './helpers/rounding';
import { calculateAnnualWithdrawal, isMonthlyWithdrawalStrategy } from './strategies';
import { toRealMonthlyReturn } from './strategies/dynamicSwrAdaptive';
import { addMonths, compareMonthYear, monthsBetween } from './helpers/dates';

const assetOrder: AssetClass[] = [AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash];

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
): number => {
  if (end === 'endOfRetirement') {
    return portfolioMonths;
  }
  return monthKeyToIndex(portfolioStart, end);
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
  inflationRateForYear: (year: number) => number,
  monthIndex: number,
): number => {
  if (!inflationAdjusted) {
    return baseAmount;
  }
  const yearOffset = Math.floor((monthIndex - 1) / 12);
  let inflated = baseAmount;
  for (let year = 1; year <= yearOffset; year += 1) {
    inflated = inflateAnnualAmount(inflated, inflationRateForYear(year), 1);
  }
  return roundToCents(inflated);
};

const sumEventIncome = (
  balances: AssetBalances,
  incomeEvents: IncomeEvent[],
  config: SimulationConfig,
  monthIndex: number,
  inflationRateForYear: (year: number) => number,
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
      inflationRateForYear,
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

const sumEventExpenses = (
  balances: AssetBalances,
  expenseEvents: ExpenseEvent[],
  config: SimulationConfig,
  monthIndex: number,
  year: number,
  inflationRateForYear: (year: number) => number,
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
      inflationRateForYear,
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
  actualOverridesByMonth: ActualOverridesByMonth = {},
  inflationOverridesByYear: Partial<Record<number, number>> = {},
  options: {
    includeRows?: boolean;
    onMonthComplete?: (summary: {
      monthIndex: number;
      endStocks: number;
      endBonds: number;
      endCash: number;
      withdrawalRequested: number;
      withdrawalActual: number;
    }) => void;
  } = {},
): SinglePathResult => {
  const includeRows = options.includeRows ?? true;
  const normalizedOverrides = normalizeOverrides(actualOverridesByMonth);
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);
  
  const initialBalances: AssetBalances = {
    stocks: config.portfolio.stocks,
    bonds: config.portfolio.bonds,
    cash: config.portfolio.cash,
  };
  const inflationRateForYear = (year: number): number =>
    inflationOverridesByYear[year] ?? config.coreParams.inflationRate;
  const inflationFactorByMonth = buildMonthlyInflationFactors(durationMonths, inflationRateForYear);

  const inflateBySchedule = (baseAmount: number, yearOffset: number): number => {
    let inflated = baseAmount;
    for (let offset = 1; offset <= yearOffset; offset += 1) {
      inflated = inflateAnnualAmount(inflated, inflationRateForYear(offset), 1);
    }
    return roundToCents(inflated);
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

    const returns = monthlyReturnsSeries[monthIndex] ?? { stocks: 0, bonds: 0, cash: 0 };
    const afterMarket = applyMarketReturns(startBalances, returns);
    const marketChange = includeRows ? diffBalances(afterMarket, startBalances) : null;
    const afterMarketValue = totalPortfolio(afterMarket);
    if (startPortfolioValue > 0) {
      currentYearReturnFactor *= afterMarketValue / startPortfolioValue;
    }
    balances = afterMarket;

    let incomeTotal = 0;
    if (override?.incomeTotal === undefined) {
      incomeTotal = sumEventIncome(
        balances,
        config.incomeEvents,
        config,
        oneBasedMonth,
        inflationRateForYear,
      );
    }

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
          inflationRate: inflationRateForYear(year),
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
      // Re-calculate annual withdrawal if it's the first month of the year, OR if we just entered a phase and current is 0
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
          inflateBySchedule(phase.minMonthlySpend * 12, year - 1),
        ) : 0;
        const annualMax = phase.maxMonthlySpend !== undefined ? roundToCents(
          inflateBySchedule(phase.maxMonthlySpend * 12, year - 1),
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
      : applyConfiguredDrawdown(
          balances,
          currentMonthlyWithdrawal,
          config.drawdownStrategy,
          year,
        );

    balances = drawdown.balances;
    totalWithdrawn = roundToCents(totalWithdrawn + drawdown.totalWithdrawn);
    totalShortfall = roundToCents(totalShortfall + drawdown.shortfall);

    if (override?.incomeTotal !== undefined) {
      incomeTotal = roundToCents(Math.max(0, override.incomeTotal));
      balances.cash = roundToCents(balances.cash + incomeTotal);
    }

    let expenseResult: { actualTotal: number; shortfallTotal: number };
    if (override?.expenseTotal !== undefined) {
      const amount = roundToCents(Math.max(0, override.expenseTotal));
      const expenseDrawdown = applyConfiguredDrawdown(balances, amount, config.drawdownStrategy, year);
      balances = expenseDrawdown.balances;
      expenseResult = { actualTotal: expenseDrawdown.totalWithdrawn, shortfallTotal: expenseDrawdown.shortfall };
    } else {
      expenseResult = sumEventExpenses(
        balances,
        config.expenseEvents,
        config,
        oneBasedMonth,
        year,
        inflationRateForYear,
      );
    }
    totalShortfall = roundToCents(totalShortfall + expenseResult.shortfallTotal);

    if (monthInYear === 12) {
      previousYearReturn = currentYearReturnFactor - 1;
      previousYearStartPortfolio = currentYearStartPortfolio;
    }

    const requestedWithdrawal = editedWithdrawals?.requested ?? currentMonthlyWithdrawal;
    if (includeRows) {
      rows.push({
        monthIndex: oneBasedMonth,
        year,
        monthInYear,
        startBalances,
        marketChange: marketChange ?? emptyAssetBalances(),
        withdrawals: {
          byAsset: drawdown.withdrawnByAsset,
          requested: requestedWithdrawal,
          actual: drawdown.totalWithdrawn,
          shortfall: drawdown.shortfall,
        },
        incomeTotal,
        expenseTotal: expenseResult.actualTotal,
        endBalances: { ...balances },
      });
    }

    options.onMonthComplete?.({
      monthIndex: oneBasedMonth,
      endStocks: balances.stocks,
      endBonds: balances.bonds,
      endCash: balances.cash,
      withdrawalRequested: requestedWithdrawal,
      withdrawalActual: drawdown.totalWithdrawn,
    });

    if (isMonthlyWithdrawalStrategy(config.withdrawalStrategy)) {
      previousAdaptiveFinalMonthlyWithdrawal = requestedWithdrawal;
    }

    if (adaptiveRollingReturns) {
      const inflationForMonth = inflationRateForYear(year);
      adaptiveRollingReturns.push({
        stocks: toRealMonthlyReturn(returns.stocks, inflationForMonth),
        bonds: toRealMonthlyReturn(returns.bonds, inflationForMonth),
        cash: toRealMonthlyReturn(returns.cash, inflationForMonth),
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

export const defaultMonthlyReturnsForConfig = (config: SimulationConfig): MonthlyReturns[] => {
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);

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
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);
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
