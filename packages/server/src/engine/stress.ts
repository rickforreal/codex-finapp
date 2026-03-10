import {
  SimulationMode,
  type ActualOverridesByMonth,
  type MonthlyReturns,
  type MonteCarloResult,
  type SinglePathResult,
  type SimulationConfig,
  type StressComparisonMetrics,
  type StressScenario,
  type StressScenarioResult,
  type StressTestResult,
  type StressTimingSensitivitySeries,
  type MonthYear,
} from '@finapp/shared';

import { runMonteCarlo } from './monteCarlo';
import { prepareReturnPhaseSampler, sampleMonthlyReturnsForPreparedPhases } from './returnPhases';
import { runSinglePath } from './simulationRuntime';
import {
  type StressTransformDescriptor,
  inflationOverridesForScenario,
  returnsWithStressTransform,
} from './stressTransforms';
import { addMonths, monthsBetween } from './helpers/dates';

type StressRunOptions = {
  seed?: number;
  actualOverridesByMonth?: ActualOverridesByMonth;
  monthlyReturns?: MonthlyReturns[];
  base?: {
    result: SinglePathResult;
    monteCarlo?: MonteCarloResult;
  };
};

const resolveMonteCarloRuns = (configuredRuns: number | undefined): number =>
  Math.max(1, Math.min(Math.round(configuredRuns ?? 1000), 10000));

const createStressDescriptor = (
  scenario: StressScenario,
  portfolioStart: MonthYear,
): StressTransformDescriptor => ({
  portfolioStart,
  scenario,
});

const withdrawalRealTotal = (
  rows: SinglePathResult['rows'],
  inflationRate: number,
  inflationByYear: Partial<Record<number, number>>,
): number => {
  let total = 0;
  for (const row of rows) {
    const yearRate = inflationByYear[row.year] ?? inflationRate;
    const factor = (1 + yearRate) ** (row.monthIndex / 12);
    total += row.withdrawals.actual / factor;
  }
  return total;
};

const firstDepletionMonth = (rows: SinglePathResult['rows']): number | null => {
  const match = rows.find((row) => row.endBalances.stocks + row.endBalances.bonds + row.endBalances.cash <= 0);
  return match?.monthIndex ?? null;
};

const firstYearReducedWithdrawal = (
  baseRows: SinglePathResult['rows'],
  scenarioRows: SinglePathResult['rows'],
): number | null => {
  const years = Math.min(Math.floor(baseRows.length / 12), Math.floor(scenarioRows.length / 12));
  for (let year = 1; year <= years; year += 1) {
    const startIndex = (year - 1) * 12;
    const endIndex = startIndex + 12;
    const baseTotal = baseRows.slice(startIndex, endIndex).reduce((sum, row) => sum + row.withdrawals.actual, 0);
    const scenarioTotal = scenarioRows.slice(startIndex, endIndex).reduce((sum, row) => sum + row.withdrawals.actual, 0);
    if (scenarioTotal < baseTotal) {
      return year;
    }
  }
  return null;
};

const buildMetrics = (
  baseResult: SinglePathResult,
  scenarioResult: SinglePathResult,
  inflationRate: number,
  scenarioInflationByYear: Partial<Record<number, number>>,
  baseMc?: MonteCarloResult,
  scenarioMc?: MonteCarloResult,
): StressComparisonMetrics => {
  const baseTerminal = baseResult.summary.terminalPortfolioValue;
  const terminal = scenarioResult.summary.terminalPortfolioValue;
  const baseDrawdownReal = withdrawalRealTotal(baseResult.rows, inflationRate, {});
  const drawdownReal = withdrawalRealTotal(scenarioResult.rows, inflationRate, scenarioInflationByYear);
  const basePos = baseMc?.probabilityOfSuccess;
  const scenarioPos = scenarioMc?.probabilityOfSuccess;

  return {
    terminalValue: terminal,
    terminalDeltaVsBase: terminal - baseTerminal,
    totalDrawdownReal: drawdownReal,
    drawdownDeltaVsBase: drawdownReal - baseDrawdownReal,
    depletionMonth: firstDepletionMonth(scenarioResult.rows),
    firstYearReducedWithdrawal: firstYearReducedWithdrawal(baseResult.rows, scenarioResult.rows),
    probabilityOfSuccess: scenarioPos,
    successDeltaPpVsBase:
      basePos !== undefined && scenarioPos !== undefined ? (scenarioPos - basePos) * 100 : undefined,
  };
};

const runScenarioManual = async (
  config: SimulationConfig,
  baselineReturns: MonthlyReturns[],
  scenario: StressScenario,
  actualOverridesByMonth: ActualOverridesByMonth,
): Promise<{ result: SinglePathResult; inflationOverridesByYear: Partial<Record<number, number>> }> => {
  const descriptor = createStressDescriptor(scenario, config.coreParams.portfolioStart);
  const shockedReturns = returnsWithStressTransform(descriptor, baselineReturns);
  const inflationOverridesByYear = inflationOverridesForScenario(descriptor);
  const result = await runSinglePath(
    config,
    shockedReturns,
    actualOverridesByMonth,
    inflationOverridesByYear,
    'stress_manual',
  );
  return { result, inflationOverridesByYear };
};

const runScenarioMonteCarlo = async (
  config: SimulationConfig,
  scenario: StressScenario,
  monteCarloRuns: number,
  options: StressRunOptions,
): Promise<{ result: SinglePathResult; monteCarlo: MonteCarloResult; inflationOverridesByYear: Partial<Record<number, number>> }> => {
  const descriptor = createStressDescriptor(scenario, config.coreParams.portfolioStart);
  const inflationOverridesByYear = inflationOverridesForScenario(descriptor);
  const mc = await runMonteCarlo(config, {
    seed: options.seed,
    runs: monteCarloRuns,
    actualOverridesByMonth: options.actualOverridesByMonth ?? {},
    inflationOverridesByYear,
    stressTransform: descriptor,
    flowTag: 'stress_mc',
  });
  return { result: mc.representativePath, monteCarlo: mc.monteCarlo, inflationOverridesByYear };
};

const scenarioForTiming = (scenario: StressScenario, start: MonthYear): StressScenario => ({
  ...scenario,
  start,
});

export const runStressTest = async (
  config: SimulationConfig,
  scenarios: StressScenario[],
  options: StressRunOptions = {},
): Promise<StressTestResult> => {
  const actualOverridesByMonth = options.actualOverridesByMonth ?? {};
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);
  const monteCarloRuns = resolveMonteCarloRuns(config.simulationRuns);

  let baseResult = options.base?.result;
  let baseMonteCarlo = options.base?.monteCarlo;
  let baselineReturns: MonthlyReturns[] | null = null;

  if (config.simulationMode === SimulationMode.Manual) {
    const preparedReturns = await prepareReturnPhaseSampler(config);
    baselineReturns =
      options.monthlyReturns?.slice(0, durationMonths) ??
      sampleMonthlyReturnsForPreparedPhases(preparedReturns, options.seed).slice(0, durationMonths);
    if (!baseResult) {
      baseResult = await runSinglePath(config, baselineReturns, actualOverridesByMonth, {}, 'stress_manual');
    }
  } else if (!baseResult || !baseMonteCarlo) {
    const base = await runMonteCarlo(config, {
      seed: options.seed,
      runs: monteCarloRuns,
      actualOverridesByMonth,
      flowTag: 'stress_mc',
    });
    baseResult = base.representativePath;
    baseMonteCarlo = base.monteCarlo;
  }

  if (!baseResult) {
    throw new Error('Base result unavailable for stress test');
  }

  const scenarioResults: StressScenarioResult[] = [];
  for (const scenario of scenarios) {
    if (config.simulationMode === SimulationMode.Manual) {
      const manual = await runScenarioManual(
        config,
        baselineReturns!,
        scenario,
        actualOverridesByMonth,
      );
      scenarioResults.push({
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        simulationMode: SimulationMode.Manual,
        result: manual.result,
        metrics: buildMetrics(
          baseResult,
          manual.result,
          config.coreParams.inflationRate,
          manual.inflationOverridesByYear,
        ),
      });
    } else {
      const mc = await runScenarioMonteCarlo(
        config,
        scenario,
        monteCarloRuns,
        options,
      );
      scenarioResults.push({
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        simulationMode: SimulationMode.MonteCarlo,
        result: mc.result,
        monteCarlo: mc.monteCarlo,
        metrics: buildMetrics(
          baseResult,
          mc.result,
          config.coreParams.inflationRate,
          mc.inflationOverridesByYear,
          baseMonteCarlo,
          mc.monteCarlo,
        ),
      });
    }
  }

  let timingSensitivity: StressTimingSensitivitySeries[] | undefined;
  if (config.simulationMode === SimulationMode.Manual && baselineReturns) {
    timingSensitivity = [];
    for (const scenario of scenarios) {
      const points: StressTimingSensitivitySeries['points'] = [];
      const totalYears = Math.ceil(durationMonths / 12);
      for (let index = 0; index < totalYears; index += 1) {
        const start = addMonths(config.coreParams.portfolioStart, index * 12);
        const timedScenario = scenarioForTiming(scenario, start);
        const run = await runScenarioManual(
          config,
          baselineReturns,
          timedScenario,
          actualOverridesByMonth,
        );
        points.push({
          start,
          terminalPortfolioValue: run.result.summary.terminalPortfolioValue,
        });
      }
      timingSensitivity.push({
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        points,
      });
    }
  }

  return {
    simulationMode: config.simulationMode,
    base: {
      result: baseResult,
      monteCarlo: baseMonteCarlo,
      metrics: buildMetrics(
        baseResult,
        baseResult,
        config.coreParams.inflationRate,
        {},
        baseMonteCarlo,
        baseMonteCarlo,
      ),
    },
    scenarios: scenarioResults,
    timingSensitivity,
  };
};
