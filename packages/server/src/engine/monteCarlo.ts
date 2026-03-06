import {
  AssetClass,
  type ActualOverridesByMonth,
  HistoricalEra,
  type MonthlyReturns,
  type MonteCarloPercentileCurves,
  type MonteCarloResult,
  type SimulationConfig,
} from '@finapp/shared';

import {
  getHistoricalDataSummaryForSelection,
  getHistoricalMonthsForSelection,
  type HistoricalMonth,
} from './historicalData';
import { createSeededRandom } from './helpers/returns';
import { simulateRetirement } from './simulator';

type MonteCarloOptions = {
  runs?: number;
  seed?: number;
  actualOverridesByMonth?: ActualOverridesByMonth;
  transformReturns?: (returns: MonthlyReturns[], runIndex: number) => MonthlyReturns[];
  inflationOverridesByYear?: Partial<Record<number, number>>;
};

const quantile = (sortedValues: number[], percentile: number): number => {
  if (sortedValues.length === 0) {
    return 0;
  }
  const index = (sortedValues.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sortedValues[lower] ?? 0;
  }
  const lowerValue = sortedValues[lower] ?? 0;
  const upperValue = sortedValues[upper] ?? 0;
  const weight = index - lower;
  return lowerValue + (upperValue - lowerValue) * weight;
};

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

const stdDevPopulation = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const inflationFactor = (inflationRate: number, monthIndexOneBased: number): number =>
  (1 + inflationRate) ** (monthIndexOneBased / 12);

const percentileCurve = (valuesByRun: number[][]): MonteCarloPercentileCurves => {
  const curveFor = (percentile: number): number[] =>
    valuesByRun.map((values) => quantile([...values].sort((a, b) => a - b), percentile));

  return {
    p05: curveFor(0.05),
    p10: curveFor(0.1),
    p25: curveFor(0.25),
    p50: curveFor(0.5),
    p75: curveFor(0.75),
    p90: curveFor(0.9),
    p95: curveFor(0.95),
  };
};

const sampleHistoricalReturnsIid = (
  sourceMonths: HistoricalMonth[],
  durationMonths: number,
  random: () => number,
): MonthlyReturns[] =>
  Array.from({ length: durationMonths }, () => {
    const index = Math.floor(random() * sourceMonths.length);
    const sampled = sourceMonths[index] ?? sourceMonths[sourceMonths.length - 1];
    if (!sampled) {
      return { stocks: 0, bonds: 0, cash: 0 };
    }
    return sampled.returns;
  });

const sampleHistoricalReturnsBlock = (
  sourceMonths: HistoricalMonth[],
  durationMonths: number,
  blockLength: number,
  random: () => number,
): MonthlyReturns[] => {
  const result: MonthlyReturns[] = [];
  const poolSize = sourceMonths.length;
  while (result.length < durationMonths) {
    const blockStart = Math.floor(random() * poolSize);
    const take = Math.min(blockLength, durationMonths - result.length);
    for (let offset = 0; offset < take; offset += 1) {
      const sampled = sourceMonths[(blockStart + offset) % poolSize];
      result.push(sampled ? sampled.returns : { stocks: 0, bonds: 0, cash: 0 });
    }
  }
  return result;
};

export const runMonteCarlo = async (
  config: SimulationConfig,
  options: MonteCarloOptions = {},
): Promise<{ representativePath: ReturnType<typeof simulateRetirement>; monteCarlo: MonteCarloResult; seedUsed?: number }> => {
  const simulationCount = Math.max(1, Math.min(options.runs ?? 1000, 5000));
  const durationMonths = config.coreParams.retirementDuration * 12;
  const customRange =
    config.selectedHistoricalEra === HistoricalEra.Custom ? config.customHistoricalRange : null;
  const historicalMonths = await getHistoricalMonthsForSelection(config.selectedHistoricalEra, customRange);
  const historicalSummary = await getHistoricalDataSummaryForSelection(config.selectedHistoricalEra, customRange);
  if (historicalMonths.length === 0) {
    throw new Error('No historical data rows available for selected era');
  }

  const monthlyTotalsByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const monthlyStocksByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const monthlyBondsByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const monthlyCashByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const monthlyWithdrawalsRealByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const terminalValues: number[] = [];
  const totalDrawdowns: number[] = [];
  let successCount = 0;
  const runResults: Array<ReturnType<typeof simulateRetirement>> = [];

  for (let runIndex = 0; runIndex < simulationCount; runIndex += 1) {
    const random =
      options.seed === undefined
        ? Math.random
        : createSeededRandom(options.seed + runIndex * 9_973);
    const returns = config.blockBootstrapEnabled
      ? sampleHistoricalReturnsBlock(historicalMonths, durationMonths, config.blockBootstrapLength, random)
      : sampleHistoricalReturnsIid(historicalMonths, durationMonths, random);
    const transformedReturns = options.transformReturns ? options.transformReturns(returns, runIndex) : returns;
    const path = simulateRetirement(
      config,
      transformedReturns,
      options.actualOverridesByMonth ?? {},
      options.inflationOverridesByYear ?? {},
    );
    runResults.push(path);

    path.rows.forEach((row, monthIndex) => {
      const stocks = row.endBalances[AssetClass.Stocks];
      const bonds = row.endBalances[AssetClass.Bonds];
      const cash = row.endBalances[AssetClass.Cash];
      const total = stocks + bonds + cash;
      monthlyTotalsByRun[monthIndex]?.push(total);
      monthlyStocksByRun[monthIndex]?.push(stocks);
      monthlyBondsByRun[monthIndex]?.push(bonds);
      monthlyCashByRun[monthIndex]?.push(cash);
    });

    const terminalValue = path.summary.terminalPortfolioValue;
    terminalValues.push(terminalValue);
    totalDrawdowns.push(path.summary.totalWithdrawn);

    const hasRequestedWithdrawals = path.rows.some((row) => row.withdrawals.requested > 0);
    path.rows.forEach((row) => {
      if (hasRequestedWithdrawals && row.withdrawals.requested <= 0) {
        return;
      }
      monthlyWithdrawalsRealByRun[row.monthIndex - 1]?.push(
        row.withdrawals.actual / inflationFactor(config.coreParams.inflationRate, row.monthIndex),
      );
    });

    if (terminalValue > 0) {
      successCount += 1;
    }
  }

  const terminalMedian = quantile([...terminalValues].sort((a, b) => a - b), 0.5);
  const drawdownMedian = quantile([...totalDrawdowns].sort((a, b) => a - b), 0.5);
  const representativePath =
    runResults.reduce((best, candidate) => {
      if (!best) {
        return candidate;
      }
      const candidateTerminalDelta = Math.abs(candidate.summary.terminalPortfolioValue - terminalMedian);
      const bestTerminalDelta = Math.abs(best.summary.terminalPortfolioValue - terminalMedian);
      if (candidateTerminalDelta < bestTerminalDelta) {
        return candidate;
      }
      if (candidateTerminalDelta > bestTerminalDelta) {
        return best;
      }

      const candidateDrawdownDelta = Math.abs(candidate.summary.totalWithdrawn - drawdownMedian);
      const bestDrawdownDelta = Math.abs(best.summary.totalWithdrawn - drawdownMedian);
      if (candidateDrawdownDelta < bestDrawdownDelta) {
        return candidate;
      }
      if (candidateDrawdownDelta > bestDrawdownDelta) {
        return best;
      }

      if (candidate.summary.totalShortfall < best.summary.totalShortfall) {
        return candidate;
      }
      return best;
    }, runResults[0]) ?? runResults[0];

  if (!representativePath) {
    throw new Error('Monte Carlo failed to produce any runs');
  }

  const monthlyWithdrawalP50Series = monthlyWithdrawalsRealByRun
    .map((values) => {
      if (values.length === 0) {
        return null;
      }
      return quantile([...values].sort((a, b) => a - b), 0.5);
    })
    .filter((value): value is number => value !== null);
  const sortedMonthlyWithdrawalP50Series = [...monthlyWithdrawalP50Series].sort((a, b) => a - b);

  return {
    representativePath,
    seedUsed: options.seed,
    monteCarlo: {
      simulationCount,
      successCount,
      probabilityOfSuccess: successCount / simulationCount,
      terminalValues,
      withdrawalStatsReal: {
        medianMonthly: quantile(sortedMonthlyWithdrawalP50Series, 0.5),
        meanMonthly: mean(monthlyWithdrawalP50Series),
        stdDevMonthly: stdDevPopulation(monthlyWithdrawalP50Series),
        p25Monthly: quantile(sortedMonthlyWithdrawalP50Series, 0.25),
        p75Monthly: quantile(sortedMonthlyWithdrawalP50Series, 0.75),
      },
      percentileCurves: {
        total: percentileCurve(monthlyTotalsByRun),
        stocks: percentileCurve(monthlyStocksByRun),
        bonds: percentileCurve(monthlyBondsByRun),
        cash: percentileCurve(monthlyCashByRun),
      },
      historicalSummary,
    },
  };
};
