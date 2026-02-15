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

import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from './simulator';
import { runMonteCarlo } from './monteCarlo';

type StressRunOptions = {
  seed?: number;
  actualOverridesByMonth?: ActualOverridesByMonth;
  monthlyReturns?: MonthlyReturns[];
  base?: {
    result: SinglePathResult;
    monteCarlo?: MonteCarloResult;
  };
};

const toMonthlyRate = (annualRate: number): number => (1 + annualRate) ** (1 / 12) - 1;

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

const toTimelineMonth = (projectedStartMonth: number, startYear: number): number =>
  projectedStartMonth + (startYear - 1) * 12;

const cloneReturns = (returns: MonthlyReturns[]): MonthlyReturns[] => returns.map((value) => ({ ...value }));

const applyCrashToMonth = (month: MonthlyReturns, stockShock = 0, bondShock = 0): MonthlyReturns => ({
  stocks: (1 + month.stocks) * (1 + stockShock) - 1,
  bonds: (1 + month.bonds) * (1 + bondShock) - 1,
  cash: month.cash,
});

const returnsWithScenarioShock = (
  scenario: StressScenario,
  baselineReturns: MonthlyReturns[],
  projectedStartMonth: number,
): MonthlyReturns[] => {
  const returns = cloneReturns(baselineReturns);
  const startMonth = toTimelineMonth(projectedStartMonth, scenario.startYear);
  const startIndex = Math.max(0, startMonth - 1);

  if (startIndex >= returns.length) {
    return returns;
  }

  if (scenario.type === 'stockCrash') {
    returns[startIndex] = applyCrashToMonth(returns[startIndex] ?? { stocks: 0, bonds: 0, cash: 0 }, scenario.params.dropPct, 0);
    return returns;
  }
  if (scenario.type === 'bondCrash') {
    returns[startIndex] = applyCrashToMonth(returns[startIndex] ?? { stocks: 0, bonds: 0, cash: 0 }, 0, scenario.params.dropPct);
    return returns;
  }
  if (scenario.type === 'broadMarketCrash') {
    returns[startIndex] = applyCrashToMonth(
      returns[startIndex] ?? { stocks: 0, bonds: 0, cash: 0 },
      scenario.params.stockDropPct,
      scenario.params.bondDropPct,
    );
    return returns;
  }
  if (scenario.type === 'prolongedBear') {
    const stockMonthly = toMonthlyRate(scenario.params.stockAnnualReturn);
    const bondMonthly = toMonthlyRate(scenario.params.bondAnnualReturn);
    const months = scenario.params.durationYears * 12;
    for (let index = startIndex; index < Math.min(returns.length, startIndex + months); index += 1) {
      const current = returns[index];
      if (!current) {
        continue;
      }
      returns[index] = {
        stocks: stockMonthly,
        bonds: bondMonthly,
        cash: current.cash,
      };
    }
    return returns;
  }
  if (scenario.type === 'custom') {
    for (const entry of scenario.params.years) {
      const yearStartIndex = startIndex + (entry.yearOffset - 1) * 12;
      const stocksMonthly = toMonthlyRate(entry.stocksAnnualReturn);
      const bondsMonthly = toMonthlyRate(entry.bondsAnnualReturn);
      const cashMonthly = toMonthlyRate(entry.cashAnnualReturn);
      for (let index = yearStartIndex; index < Math.min(returns.length, yearStartIndex + 12); index += 1) {
        returns[index] = {
          stocks: stocksMonthly,
          bonds: bondsMonthly,
          cash: cashMonthly,
        };
      }
    }
  }

  return returns;
};

const inflationOverridesForScenario = (
  scenario: StressScenario,
  projectedStartMonth: number,
): Partial<Record<number, number>> => {
  if (scenario.type !== 'highInflationSpike') {
    return {};
  }

  const startMonth = toTimelineMonth(projectedStartMonth, scenario.startYear);
  const startYear = Math.floor((startMonth - 1) / 12) + 1;
  const overrides: Partial<Record<number, number>> = {};
  for (let offset = 0; offset < scenario.params.durationYears; offset += 1) {
    overrides[startYear + offset] = scenario.params.inflationRate;
  }
  return overrides;
};

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

const firstYearReducedWithdrawal = (baseRows: SinglePathResult['rows'], scenarioRows: SinglePathResult['rows']): number | null => {
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
    successDeltaPpVsBase: basePos !== undefined && scenarioPos !== undefined ? (scenarioPos - basePos) * 100 : undefined,
  };
};

const runScenarioManual = (
  config: SimulationConfig,
  baselineReturns: MonthlyReturns[],
  scenario: StressScenario,
  projectedStartMonth: number,
  actualOverridesByMonth: ActualOverridesByMonth,
): { result: SinglePathResult; inflationOverridesByYear: Partial<Record<number, number>> } => {
  const shockedReturns = returnsWithScenarioShock(scenario, baselineReturns, projectedStartMonth);
  const inflationOverridesByYear = inflationOverridesForScenario(scenario, projectedStartMonth);
  const result = simulateRetirement(config, shockedReturns, actualOverridesByMonth, inflationOverridesByYear);
  return { result, inflationOverridesByYear };
};

const runScenarioMonteCarlo = async (
  config: SimulationConfig,
  scenario: StressScenario,
  projectedStartMonth: number,
  options: StressRunOptions,
): Promise<{ result: SinglePathResult; monteCarlo: MonteCarloResult; inflationOverridesByYear: Partial<Record<number, number>> }> => {
  const inflationOverridesByYear = inflationOverridesForScenario(scenario, projectedStartMonth);
  const mc = await runMonteCarlo(config, {
    seed: options.seed,
    runs: 1000,
    actualOverridesByMonth: options.actualOverridesByMonth ?? {},
    inflationOverridesByYear,
    transformReturns: (returns) => returnsWithScenarioShock(scenario, returns, projectedStartMonth),
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

  let baseResult = options.base?.result;
  let baseMonteCarlo = options.base?.monteCarlo;
  let baselineReturns: MonthlyReturns[] | null = null;

  if (config.simulationMode === SimulationMode.Manual) {
    baselineReturns =
      options.monthlyReturns?.slice(0, durationMonths) ??
      generateMonthlyReturnsFromAssumptions(config, options.seed).slice(0, durationMonths);
    baseResult = baseResult ?? simulateRetirement(config, baselineReturns, actualOverridesByMonth);
  } else {
    if (!baseResult || !baseMonteCarlo) {
      const base = await runMonteCarlo(config, {
        seed: options.seed,
        runs: 1000,
        actualOverridesByMonth,
      });
      baseResult = base.representativePath;
      baseMonteCarlo = base.monteCarlo;
    }
  }

  if (!baseResult) {
    throw new Error('Base result unavailable for stress test');
  }

  const scenarioResults: StressScenarioResult[] = [];
  for (const scenario of scenarios) {
    if (config.simulationMode === SimulationMode.Manual) {
      const manual = runScenarioManual(
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
        metrics: buildMetrics(baseResult, manual.result, config.coreParams.inflationRate, manual.inflationOverridesByYear),
      });
    } else {
      const mc = await runScenarioMonteCarlo(config, scenario, projectedStartMonth, options);
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
    timingSensitivity = scenarios.map((scenario) => {
      const points = Array.from({ length: config.coreParams.retirementDuration }, (_, index) => {
        const startYear = index + 1;
        const timedScenario = scenarioForTiming(scenario, startYear);
        const run = runScenarioManual(
          config,
          baselineReturns ?? [],
          timedScenario,
          projectedStartMonth,
          actualOverridesByMonth,
        );
        return {
          startYear,
          terminalPortfolioValue: run.result.summary.terminalPortfolioValue,
        };
      });
      return {
        scenarioId: scenario.id,
        scenarioLabel: scenario.label,
        points,
      };
    });
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
