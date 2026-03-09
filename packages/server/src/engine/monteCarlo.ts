import {
  type ActualOverridesByMonth,
  HistoricalEra,
  ReturnSource,
  SimulationMode,
  type MonthlyReturns,
  type MonteCarloPercentileCurves,
  type MonteCarloResult,
  type SinglePathResult,
  type SimulationConfig,
} from '@finapp/shared';

import {
  getHistoricalDataSummaryForSelection,
  getHistoricalMonthsForSelection,
  type HistoricalMonth,
} from './historicalData';
import { createSeededRandom } from './helpers/returns';
import { runMonteCarloRust } from './monteCarloNative';
import { type StressTransformDescriptor, returnsWithStressTransform } from './stressTransforms';
import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from './simulator';
import { monthsBetween } from './helpers/dates';

export type MonteCarloOptions = {
  runs?: number;
  seed?: number;
  actualOverridesByMonth?: ActualOverridesByMonth;
  transformReturns?: (returns: MonthlyReturns[], runIndex: number) => MonthlyReturns[];
  inflationOverridesByYear?: Partial<Record<number, number>>;
  stressTransform?: StressTransformDescriptor;
  flowTag?: string;
};

export type MonteCarloExecutionResult = {
  representativePath: SinglePathResult;
  monteCarlo: MonteCarloResult;
  seedUsed?: number;
};

type RunSummary = {
  runIndex: number;
  terminalValue: number;
  totalDrawdown: number;
  totalShortfall: number;
};

type NumericSeries = {
  length: number;
  [index: number]: number;
};

const RUN_SEED_STRIDE = 9_973;
const MAX_SIMULATION_RUNS = 10_000;
const DEFAULT_SIMULATION_RUNS = 1_000;
const MAX_SEED = 2_147_483_000;

const quantile = (sortedValues: NumericSeries, percentile: number): number => {
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

const percentileCurve = (valuesByRun: Float64Array[]): MonteCarloPercentileCurves => {
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
    values.sort();
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
  options: MonteCarloOptions,
  runIndex: number,
  seedUsed: number,
  returnsSource: ReturnSource,
  historicalMonths: HistoricalMonth[],
  durationMonths: number,
): MonthlyReturns[] => {
  const runSeed = runSeedForIndex(seedUsed, runIndex);
  const random = createSeededRandom(runSeed);

  const returns =
    returnsSource === ReturnSource.Manual
      ? generateMonthlyReturnsFromAssumptions(config, runSeed)
      : config.blockBootstrapEnabled
        ? sampleHistoricalReturnsBlock(historicalMonths, durationMonths, config.blockBootstrapLength, random)
        : sampleHistoricalReturnsIid(historicalMonths, durationMonths, random);

  const transformedByDescriptor = options.stressTransform
    ? returnsWithStressTransform(options.stressTransform, returns)
    : returns;
  return options.transformReturns
    ? options.transformReturns(transformedByDescriptor, runIndex)
    : transformedByDescriptor;
};

const runPathForIndex = (
  config: SimulationConfig,
  options: MonteCarloOptions,
  runIndex: number,
  seedUsed: number,
  returnsSource: ReturnSource,
  historicalMonths: HistoricalMonth[],
  durationMonths: number,
  simulationOptions?: Parameters<typeof simulateRetirement>[4],
): ReturnType<typeof simulateRetirement> => {
  const returns = buildReturnsForRun(
    config,
    options,
    runIndex,
    seedUsed,
    returnsSource,
    historicalMonths,
    durationMonths,
  );

  return simulateRetirement(
    config,
    returns,
    options.actualOverridesByMonth ?? {},
    options.inflationOverridesByYear ?? {},
    simulationOptions,
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

const runMonteCarloTs = async (
  config: SimulationConfig,
  options: MonteCarloOptions = {},
): Promise<MonteCarloExecutionResult> => {
  const simulationCount = clampSimulationRuns(options.runs ?? config.simulationRuns ?? DEFAULT_SIMULATION_RUNS);
  const seedUsed = resolveSeed(options.seed);
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);
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

  const monthlyTotalsByRun: Float64Array[] = Array.from(
    { length: durationMonths },
    () => new Float64Array(simulationCount),
  );
  const monthlyStocksByRun: Float64Array[] = Array.from(
    { length: durationMonths },
    () => new Float64Array(simulationCount),
  );
  const monthlyBondsByRun: Float64Array[] = Array.from(
    { length: durationMonths },
    () => new Float64Array(simulationCount),
  );
  const monthlyCashByRun: Float64Array[] = Array.from(
    { length: durationMonths },
    () => new Float64Array(simulationCount),
  );
  const monthlyWithdrawalsRealByRun: number[][] = Array.from({ length: durationMonths }, () => []);
  const monthlyWithdrawalsRealMatrix: Float64Array[] = Array.from(
    { length: durationMonths },
    () => new Float64Array(simulationCount),
  );
  const terminalValues: number[] = new Array<number>(simulationCount);
  const totalDrawdowns: number[] = new Array<number>(simulationCount);
  const runSummaries: RunSummary[] = new Array<RunSummary>(simulationCount);
  let successCount = 0;

  for (let runIndex = 0; runIndex < simulationCount; runIndex += 1) {
    const requestedWithdrawalByMonth = new Uint8Array(durationMonths);
    const actualWithdrawalRealByMonth = new Float64Array(durationMonths);
    let hasRequestedWithdrawals = false;

    const path = runPathForIndex(
      config,
      options,
      runIndex,
      seedUsed,
      returnsSource,
      historicalMonths,
      durationMonths,
      {
        includeRows: false,
        onMonthComplete: ({
          monthIndex,
          endStocks,
          endBonds,
          endCash,
          withdrawalRequested,
          withdrawalActual,
        }) => {
          const month = monthIndex - 1;
          const stocks = endStocks;
          const bonds = endBonds;
          const cash = endCash;
          if (withdrawalRequested > 0) {
            hasRequestedWithdrawals = true;
            requestedWithdrawalByMonth[month] = 1;
          }
          actualWithdrawalRealByMonth[month] =
            withdrawalActual / inflationFactor(config.coreParams.inflationRate, monthIndex);
          monthlyWithdrawalsRealMatrix[month]![runIndex] = actualWithdrawalRealByMonth[month]!;
          const total = stocks + bonds + cash;
          monthlyTotalsByRun[month]![runIndex] = total;
          monthlyStocksByRun[month]![runIndex] = stocks;
          monthlyBondsByRun[month]![runIndex] = bonds;
          monthlyCashByRun[month]![runIndex] = cash;
        },
      },
    );

    for (let month = 0; month < durationMonths; month += 1) {
      if (hasRequestedWithdrawals && requestedWithdrawalByMonth[month] !== 1) {
        continue;
      }
      monthlyWithdrawalsRealByRun[month]?.push(actualWithdrawalRealByMonth[month]!);
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
  const withdrawalPercentileCurvesReal = percentileCurve(monthlyWithdrawalsRealMatrix);
  const withdrawalP50SeriesReal = [...withdrawalPercentileCurvesReal.p50];

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
      withdrawalPercentileCurvesReal,
      withdrawalP50SeriesReal,
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

const resolveEnginePreference = (): 'ts' | 'rust' => {
  const globalValue = (process.env.FINAPP_SIM_ENGINE ?? '').trim().toLowerCase();
  if (globalValue === 'rust') {
    return 'rust';
  }
  if (globalValue === 'ts') {
    return 'ts';
  }

  const value = (process.env.FINAPP_MC_ENGINE ?? 'rust').trim().toLowerCase();
  return value === 'rust' ? 'rust' : 'ts';
};

const resolveShadowConfig = (): { enabled: boolean; sampleRate: number } => {
  const enabled = process.env.FINAPP_MC_SHADOW_COMPARE === '1';
  const sampleRateRaw = Number.parseFloat(process.env.FINAPP_MC_SHADOW_SAMPLE_RATE ?? '0.1');
  const sampleRate = Number.isFinite(sampleRateRaw)
    ? Math.min(1, Math.max(0, sampleRateRaw))
    : 0.1;
  return { enabled, sampleRate };
};

const logEngineEvent = (event: string, details: Record<string, unknown>): void => {
  console.warn(
    JSON.stringify({
      event,
      engine: 'monte-carlo',
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
};

const summarizeResult = (result: MonteCarloExecutionResult) => {
  const p50 = result.monteCarlo.percentileCurves.total.p50;
  const terminalP50 = p50[p50.length - 1] ?? 0;
  return {
    simulationCount: result.monteCarlo.simulationCount,
    successCount: result.monteCarlo.successCount,
    probabilityOfSuccess: result.monteCarlo.probabilityOfSuccess,
    representativeTerminal: result.representativePath.summary.terminalPortfolioValue,
    terminalP50,
  };
};

const runShadowCompare = (
  primaryLabel: 'ts' | 'rust',
  primaryResult: MonteCarloExecutionResult,
  secondaryResult: MonteCarloExecutionResult,
): void => {
  const primary = summarizeResult(primaryResult);
  const secondary = summarizeResult(secondaryResult);
  if (
    primary.simulationCount !== secondary.simulationCount ||
    primary.successCount !== secondary.successCount ||
    primary.probabilityOfSuccess !== secondary.probabilityOfSuccess ||
    primary.representativeTerminal !== secondary.representativeTerminal ||
    primary.terminalP50 !== secondary.terminalP50
  ) {
    logEngineEvent('mc_shadow_mismatch', {
      primaryEngine: primaryLabel,
      primary,
      secondary,
    });
  }
};

const runRustWithFallback = async (
  config: SimulationConfig,
  options: MonteCarloOptions,
): Promise<MonteCarloExecutionResult> => {
  try {
    return await runMonteCarloRust(config, options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logEngineEvent('mc_rust_fallback_to_ts', {
      message,
      flowTag: options.flowTag ?? 'simulate_mc',
    });
    return runMonteCarloTs(config, options);
  }
};

const optionsRequireTsEngine = (options: MonteCarloOptions): boolean =>
  typeof options.transformReturns === 'function';

export const runMonteCarlo = async (
  config: SimulationConfig,
  options: MonteCarloOptions = {},
): Promise<MonteCarloExecutionResult> => {
  const preferredEngine = resolveEnginePreference();
  const { enabled: shadowEnabled, sampleRate: shadowSampleRate } = resolveShadowConfig();
  const shouldShadow = shadowEnabled && Math.random() < shadowSampleRate;

  if (preferredEngine === 'rust' && optionsRequireTsEngine(options)) {
    logEngineEvent('mc_rust_option_unsupported_fallback', {
      reason: 'transformReturns callback not serializable for native boundary',
      flowTag: options.flowTag ?? 'simulate_mc',
    });
    return runMonteCarloTs(config, options);
  }

  if (preferredEngine === 'rust') {
    const primary = await runRustWithFallback(config, options);
    if (shouldShadow) {
      const secondary = await runMonteCarloTs(config, options);
      runShadowCompare('rust', primary, secondary);
    }
    return primary;
  }

  const primary = await runMonteCarloTs(config, options);
  if (shouldShadow && !optionsRequireTsEngine(options)) {
    try {
      const secondary = await runMonteCarloRust(config, options);
      runShadowCompare('ts', primary, secondary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logEngineEvent('mc_shadow_rust_failed', {
        message,
        flowTag: options.flowTag ?? 'simulate_mc',
      });
    }
  }
  return primary;
};
