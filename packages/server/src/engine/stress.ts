import {
  AppMode,
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
} from '@finapp/shared';

import { runMonteCarlo } from './monteCarlo';
import { runSinglePath } from './simulationRuntime';
import { generateMonthlyReturnsFromAssumptions } from './simulator';
import {
  type StressTransformDescriptor,
  inflationOverridesForScenario,
  returnsWithStressTransform,
} from './stressTransforms';

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

const getLastEditedMonthIndex = (overrides: ActualOverridesByMonth = {}): number =>
  Object.keys(overrides)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)
    .reduce((max, value) => Math.max(max, value), 0);

const getProjectedYearStartMonth = (config: SimulationConfig, overrides: ActualOverridesByMonth = {}): number => {
  if (config.mode !== AppMode.Tracking) {
    return 1;
  }
  return getLastEditedMonthIndex(overrides) + 1;
};

const createStressDescriptor = (
  scenario: StressScenario,
  projectedStartMonth: number,
): StressTransformDescriptor => ({
  projectedStartMonth,
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
  projectedStartMonth: number,
  actualOverridesByMonth: ActualOverridesByMonth,
): Promise<{ result: SinglePathResult; inflationOverridesByYear: Partial<Record<number, number>> }> => {
  const descriptor = createStressDescriptor(scenario, projectedStartMonth);
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
  projectedStartMonth: number,
  monteCarloRuns: number,
  options: StressRunOptions,
): Promise<{ result: SinglePathResult; monteCarlo: MonteCarloResult; inflationOverridesByYear: Partial<Record<number, number>> }> => {
  const descriptor = createStressDescriptor(scenario, projectedStartMonth);
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

const scenarioForTiming = (scenario: StressScenario, startYear: number): StressScenario => ({
  ...scenario,
  startYear,
});

export const runStressTest = async (
  config: SimulationConfig,
  scenarios: StressScenario[],
  options: StressRunOptions = {},
): Promise<StressTestResult> => {
  const actualOverridesByMonth = options.actualOverridesByMonth ?? {};
  const projectedStartMonth = getProjectedYearStartMonth(config, actualOverridesByMonth);
  const durationMonths = config.coreParams.retirementDuration * 12;
  const monteCarloRuns = resolveMonteCarloRuns(config.simulationRuns);

  let baseResult = options.base?.result;
  let baseMonteCarlo = options.base?.monteCarlo;
  let baselineReturns: MonthlyReturns[] | null = null;

  if (config.simulationMode === SimulationMode.Manual) {
    baselineReturns =
      options.monthlyReturns?.slice(0, durationMonths) ??
      generateMonthlyReturnsFromAssumptions(config, options.seed).slice(0, durationMonths);
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
        baselineReturns ?? generateMonthlyReturnsFromAssumptions(config, options.seed),
        scenario,
        projectedStartMonth,
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
        projectedStartMonth,
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
      for (let index = 0; index < config.coreParams.retirementDuration; index += 1) {
        const startYear = index + 1;
        const timedScenario = scenarioForTiming(scenario, startYear);
        const run = await runScenarioManual(
          config,
          baselineReturns,
          timedScenario,
          projectedStartMonth,
          actualOverridesByMonth,
        );
        points.push({
          startYear,
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
