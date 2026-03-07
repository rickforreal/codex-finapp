import {
  AssetClass,
  type ActualOverridesByMonth,
  HistoricalEra,
  ReturnSource,
  SimulationMode,
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
import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from './simulator';

type MonteCarloOptions = {
  runs?: number;
  seed?: number;
  actualOverridesByMonth?: ActualOverridesByMonth;
  transformReturns?: (returns: MonthlyReturns[], runIndex: number) => MonthlyReturns[];
  inflationOverridesByYear?: Partial<Record<number, number>>;
};

type RunSummary = {
  runIndex: number;
  terminalValue: number;
  totalDrawdown: number;
  totalShortfall: number;
};

const RUN_SEED_STRIDE = 9_973;
const MAX_SIMULATION_RUNS = 10_000;
const DEFAULT_SIMULATION_RUNS = 1_000;
const MAX_SEED = 2_147_483_000;

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

const clampSimulationRuns = (runs: number): number =>
  Math.max(1, Math.min(Math.round(runs), MAX_SIMULATION_RUNS));

const resolveSeed = (seed: number | undefined): number =>
  seed ?? Math.floor(Math.random() * MAX_SEED);

const runSeedForIndex = (seed: number, runIndex: number): number => seed + runIndex * RUN_SEED_STRIDE;

const percentileCurve = (valuesByRun: number[][]): MonteCarloPercentileCurves => {
  const curve: MonteCarloPercentileCurves = {
    p05: [],
    p10: [],
    p25: [],
    p50: [],
    p75: [],
    p90: [],
    p95: [],
  };

  for (const values of valuesByRun) {
    values.sort((a, b) => a - b);
    curve.p05.push(quantile(values, 0.05));
    curve.p10.push(quantile(values, 0.1));
    curve.p25.push(quantile(values, 0.25));
    curve.p50.push(quantile(values, 0.5));
    curve.p75.push(quantile(values, 0.75));
    curve.p90.push(quantile(values, 0.9));
    curve.p95.push(quantile(values, 0.95));
  }

  return curve;
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

const buildReturnsForRun = (
  config: SimulationConfig,
  runIndex: number,
  seedUsed: number,
  returnsSource: ReturnSource,
  historicalMonths: HistoricalMonth[],
  durationMonths: number,
  transformReturns: MonteCarloOptions['transformReturns'],
): MonthlyReturns[] => {
  const runSeed = runSeedForIndex(seedUsed, runIndex);
  const random = createSeededRandom(runSeed);

  const returns =
    returnsSource === ReturnSource.Manual
      ? generateMonthlyReturnsFromAssumptions(config, runSeed)
      : config.blockBootstrapEnabled
        ? sampleHistoricalReturnsBlock(historicalMonths, durationMonths, config.blockBootstrapLength, random)
        : sampleHistoricalReturnsIid(historicalMonths, durationMonths, random);

  return transformReturns ? transformReturns(returns, runIndex) : returns;
};

const runPathForIndex = (
  config: SimulationConfig,
  options: MonteCarloOptions,
  runIndex: number,
  seedUsed: number,
  returnsSource: ReturnSource,
  historicalMonths: HistoricalMonth[],
  durationMonths: number,
): ReturnType<typeof simulateRetirement> => {
  const returns = buildReturnsForRun(
    config,
    runIndex,
    seedUsed,
    returnsSource,
    historicalMonths,
    durationMonths,
    options.transformReturns,
  );

  return simulateRetirement(
    config,
    returns,
    options.actualOverridesByMonth ?? {},
    options.inflationOverridesByYear ?? {},
  );
};

const selectRepresentativeRun = (
  runSummaries: RunSummary[],
  terminalMedian: number,
  drawdownMedian: number,
): RunSummary =>
  runSummaries.reduce((best, candidate) => {
    const candidateTerminalDelta = Math.abs(candidate.terminalValue - terminalMedian);
    const bestTerminalDelta = Math.abs(best.terminalValue - terminalMedian);
    if (candidateTerminalDelta < bestTerminalDelta) {
      return candidate;
    }
    if (candidateTerminalDelta > bestTerminalDelta) {
      return best;
    }

    const candidateDrawdownDelta = Math.abs(candidate.totalDrawdown - drawdownMedian);
    const bestDrawdownDelta = Math.abs(best.totalDrawdown - drawdownMedian);
    if (candidateDrawdownDelta < bestDrawdownDelta) {
      return candidate;
    }
    if (candidateDrawdownDelta > bestDrawdownDelta) {
      return best;
    }

    if (candidate.totalShortfall < best.totalShortfall) {
      return candidate;
    }
    if (candidate.totalShortfall > best.totalShortfall) {
      return best;
    }

    return candidate.runIndex < best.runIndex ? candidate : best;
  }, runSummaries[0]!);

export const runMonteCarlo = async (
  config: SimulationConfig,
  options: MonteCarloOptions = {},
): Promise<{ representativePath: ReturnType<typeof simulateRetirement>; monteCarlo: MonteCarloResult; seedUsed?: number }> => {
  const simulationCount = clampSimulationRuns(options.runs ?? config.simulationRuns ?? DEFAULT_SIMULATION_RUNS);
  const seedUsed = resolveSeed(options.seed);
  const durationMonths = config.coreParams.retirementDuration * 12;
  const returnsSource =
    config.returnsSource ??
    (config.simulationMode === SimulationMode.Manual ? ReturnSource.Manual : ReturnSource.Historical);
  const customRange =
    config.selectedHistoricalEra === HistoricalEra.Custom ? config.customHistoricalRange : null;
  const historicalMonths =
    returnsSource === ReturnSource.Historical
      ? await getHistoricalMonthsForSelection(config.selectedHistoricalEra, customRange)
      : [];
  const historicalSummary = await getHistoricalDataSummaryForSelection(config.selectedHistoricalEra, customRange);
  if (returnsSource === ReturnSource.Historical && historicalMonths.length === 0) {
    throw new Error('No historical data rows available for selected era');
  }

  const monthlyTotalsByRun: number[][] = Array.from(
    { length: durationMonths },
    () => new Array<number>(simulationCount),
  );
  const monthlyStocksByRun: number[][] = Array.from(
    { length: durationMonths },
    () => new Array<number>(simulationCount),
  );
  const monthlyBondsByRun: number[][] = Array.from(
    { length: durationMonths },
    () => new Array<number>(simulationCount),
  );
  const monthlyCashByRun: number[][] = Array.from(
    { length: durationMonths },
    () => new Array<number>(simulationCount),
  );
  const monthlyWithdrawalsRealByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const terminalValues: number[] = new Array<number>(simulationCount);
  const totalDrawdowns: number[] = new Array<number>(simulationCount);
  const runSummaries: RunSummary[] = new Array<RunSummary>(simulationCount);
  let successCount = 0;

  for (let runIndex = 0; runIndex < simulationCount; runIndex += 1) {
    const path = runPathForIndex(
      config,
      options,
      runIndex,
      seedUsed,
      returnsSource,
      historicalMonths,
      durationMonths,
    );

    for (let monthIndex = 0; monthIndex < path.rows.length; monthIndex += 1) {
      const row = path.rows[monthIndex]!;
      const stocks = row.endBalances[AssetClass.Stocks];
      const bonds = row.endBalances[AssetClass.Bonds];
      const cash = row.endBalances[AssetClass.Cash];
      const total = stocks + bonds + cash;
      monthlyTotalsByRun[monthIndex]![runIndex] = total;
      monthlyStocksByRun[monthIndex]![runIndex] = stocks;
      monthlyBondsByRun[monthIndex]![runIndex] = bonds;
      monthlyCashByRun[monthIndex]![runIndex] = cash;
    }

    const terminalValue = path.summary.terminalPortfolioValue;
    const totalDrawdown = path.summary.totalWithdrawn;
    terminalValues[runIndex] = terminalValue;
    totalDrawdowns[runIndex] = totalDrawdown;
    runSummaries[runIndex] = {
      runIndex,
      terminalValue,
      totalDrawdown,
      totalShortfall: path.summary.totalShortfall,
    };

    const hasRequestedWithdrawals = path.rows.some((row) => row.withdrawals.requested > 0);
    for (const row of path.rows) {
      if (hasRequestedWithdrawals && row.withdrawals.requested <= 0) {
        continue;
      }
      monthlyWithdrawalsRealByRun[row.monthIndex - 1]?.push(
        row.withdrawals.actual / inflationFactor(config.coreParams.inflationRate, row.monthIndex),
      );
    }

    if (terminalValue > 0) {
      successCount += 1;
    }
  }

  const terminalMedian = quantile([...terminalValues].sort((a, b) => a - b), 0.5);
  const drawdownMedian = quantile([...totalDrawdowns].sort((a, b) => a - b), 0.5);
  const representativeRun = selectRepresentativeRun(runSummaries, terminalMedian, drawdownMedian);
  const representativePath = runPathForIndex(
    config,
    options,
    representativeRun.runIndex,
    seedUsed,
    returnsSource,
    historicalMonths,
    durationMonths,
  );

  const monthlyWithdrawalP50Series = monthlyWithdrawalsRealByRun
    .map((values) => {
      if (values.length === 0) {
        return null;
      }
      values.sort((a, b) => a - b);
      return quantile(values, 0.5);
    })
    .filter((value): value is number => value !== null);
  const sortedMonthlyWithdrawalP50Series = [...monthlyWithdrawalP50Series].sort((a, b) => a - b);

  return {
    representativePath,
    seedUsed,
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
