import { AssetClass, SimulationMode, type MonthlySimulationRow, type StressScenario, type StressTestResult } from '@finapp/shared';
import { describe, expect, it } from 'vitest';

import { buildCompareStressTableModel } from './compareStressTableModel';

const makeRow = (monthIndex: number, withdrawalActual: number): MonthlySimulationRow => ({
  monthIndex,
  year: 1,
  monthInYear: monthIndex,
  startBalances: {
    [AssetClass.Stocks]: 1_000_000,
    [AssetClass.Bonds]: 200_000,
    [AssetClass.Cash]: 100_000,
  },
  marketChange: {
    [AssetClass.Stocks]: 0,
    [AssetClass.Bonds]: 0,
    [AssetClass.Cash]: 0,
  },
  withdrawals: {
    byAsset: {
      [AssetClass.Stocks]: withdrawalActual,
      [AssetClass.Bonds]: 0,
      [AssetClass.Cash]: 0,
    },
    requested: withdrawalActual,
    actual: withdrawalActual,
    shortfall: 0,
  },
  incomeTotal: 0,
  expenseTotal: 0,
  endBalances: {
    [AssetClass.Stocks]: 1_000_000 - withdrawalActual,
    [AssetClass.Bonds]: 200_000,
    [AssetClass.Cash]: 100_000,
  },
});

const scenarios: StressScenario[] = [
  {
    id: 's1',
    label: 'Early Crash',
    startYear: 1,
    type: 'stockCrash',
    params: { dropPct: -0.3 },
  },
  {
    id: 's2',
    label: 'Inflation Spike',
    startYear: 2,
    type: 'highInflationSpike',
    params: { durationYears: 3, inflationRate: 0.08 },
  },
];

const makeStressResult = (
  opts?: {
    reverseScenarioOrder?: boolean;
    basePos?: number;
    scenario1Pos?: number;
    scenario2Pos?: number;
  },
): StressTestResult => {
  const baseMetrics = {
    terminalValue: 900_000,
    terminalDeltaVsBase: 0,
    totalDrawdownReal: 240_000,
    drawdownDeltaVsBase: 0,
    depletionMonth: null,
    firstYearReducedWithdrawal: null,
    probabilityOfSuccess: opts?.basePos,
  };
  const s1 = {
    scenarioId: 's1',
    scenarioLabel: 'Early Crash',
    simulationMode: SimulationMode.Manual,
    result: {
      rows: [makeRow(1, 22_000), makeRow(2, 24_000)],
      summary: { totalWithdrawn: 46_000, totalShortfall: 0, terminalPortfolioValue: 700_000 },
    },
    metrics: {
      terminalValue: 700_000,
      terminalDeltaVsBase: -200_000,
      totalDrawdownReal: 200_000,
      drawdownDeltaVsBase: -40_000,
      depletionMonth: 300,
      firstYearReducedWithdrawal: 12_000,
      probabilityOfSuccess: opts?.scenario1Pos,
      successDeltaPpVsBase:
        opts?.scenario1Pos !== undefined && opts?.basePos !== undefined ? opts.scenario1Pos - opts.basePos : undefined,
    },
  };
  const s2 = {
    scenarioId: 's2',
    scenarioLabel: 'Inflation Spike',
    simulationMode: SimulationMode.Manual,
    result: {
      rows: [makeRow(1, 19_000), makeRow(2, 19_000)],
      summary: { totalWithdrawn: 38_000, totalShortfall: 0, terminalPortfolioValue: 760_000 },
    },
    metrics: {
      terminalValue: 760_000,
      terminalDeltaVsBase: -140_000,
      totalDrawdownReal: 210_000,
      drawdownDeltaVsBase: -30_000,
      depletionMonth: null,
      firstYearReducedWithdrawal: 6_000,
      probabilityOfSuccess: opts?.scenario2Pos,
      successDeltaPpVsBase:
        opts?.scenario2Pos !== undefined && opts?.basePos !== undefined ? opts.scenario2Pos - opts.basePos : undefined,
    },
  };

  return {
    simulationMode: SimulationMode.Manual,
    base: {
      result: {
        rows: [makeRow(1, 20_000), makeRow(2, 20_000)],
        summary: { totalWithdrawn: 40_000, totalShortfall: 0, terminalPortfolioValue: 900_000 },
      },
      metrics: baseMetrics,
    },
    scenarios: opts?.reverseScenarioOrder ? [s2, s1] : [s1, s2],
  };
};

describe('buildCompareStressTableModel', () => {
  it('returns base + scenario sections with full row set including median/mean', () => {
    const model = buildCompareStressTableModel({
      slotOrder: ['A', 'B'],
      slotsById: {
        A: { stressResult: makeStressResult(), inflationRate: 0.03 },
        B: { stressResult: makeStressResult(), inflationRate: 0.03 },
      },
      scenarios,
      simulationMode: SimulationMode.Manual,
    });

    expect(model.sections.map((section) => section.label)).toEqual(['Base', 'Scenario: Early Crash', 'Scenario: Inflation Spike']);
    expect(model.sections[0]?.rows.some((row) => row.label === 'Median Monthly Withdrawal (Real)')).toBe(true);
    expect(model.sections[0]?.rows.some((row) => row.label === 'Mean Monthly Withdrawal (Real)')).toBe(true);
    expect(model.sections[1]?.rows.some((row) => row.label === 'Median Monthly Withdrawal (Real)')).toBe(true);
    expect(model.sections[1]?.rows.some((row) => row.label === 'Mean Monthly Withdrawal (Real)')).toBe(true);
  });

  it('matches scenario rows by scenarioId even when per-slot result order differs', () => {
    const model = buildCompareStressTableModel({
      slotOrder: ['A', 'B'],
      slotsById: {
        A: { stressResult: makeStressResult({ reverseScenarioOrder: false }), inflationRate: 0.03 },
        B: { stressResult: makeStressResult({ reverseScenarioOrder: true }), inflationRate: 0.03 },
      },
      scenarios,
      simulationMode: SimulationMode.Manual,
    });

    const scenarioOneSection = model.sections.find((section) => section.label === 'Scenario: Early Crash');
    const scenarioOneTerminal = scenarioOneSection?.rows.find((row) => row.label === 'Terminal Portfolio Value');
    expect(scenarioOneTerminal?.valuesBySlot.A).toBe('$700,000');
    expect(scenarioOneTerminal?.valuesBySlot.B).toBe('$700,000');
  });

  it('includes PoS and success delta rows only in Monte Carlo mode', () => {
    const mcModel = buildCompareStressTableModel({
      slotOrder: ['A', 'B'],
      slotsById: {
        A: { stressResult: makeStressResult({ basePos: 0.9, scenario1Pos: 0.85, scenario2Pos: 0.82 }), inflationRate: 0.03 },
        B: { stressResult: makeStressResult({ basePos: 0.88, scenario1Pos: 0.8, scenario2Pos: 0.75 }), inflationRate: 0.03 },
      },
      scenarios,
      simulationMode: SimulationMode.MonteCarlo,
    });

    expect(mcModel.sections[0]?.rows.some((row) => row.label === 'Probability of Success')).toBe(true);
    expect(mcModel.sections[1]?.rows.some((row) => row.label === 'Δ Success vs. Base')).toBe(true);

    const manualModel = buildCompareStressTableModel({
      slotOrder: ['A', 'B'],
      slotsById: {
        A: { stressResult: makeStressResult(), inflationRate: 0.03 },
        B: { stressResult: makeStressResult(), inflationRate: 0.03 },
      },
      scenarios,
      simulationMode: SimulationMode.Manual,
    });

    expect(manualModel.sections[0]?.rows.some((row) => row.label === 'Probability of Success')).toBe(false);
    expect(manualModel.sections[1]?.rows.some((row) => row.label === 'Δ Success vs. Base')).toBe(false);
  });

  it('returns missing marker for absent slot/scenario data', () => {
    const slotOnlyA = makeStressResult();
    slotOnlyA.scenarios = [slotOnlyA.scenarios[0]!];

    const model = buildCompareStressTableModel({
      slotOrder: ['A', 'B'],
      slotsById: {
        A: { stressResult: slotOnlyA, inflationRate: 0.03 },
        B: { stressResult: null, inflationRate: 0.03 },
      },
      scenarios,
      simulationMode: SimulationMode.Manual,
    });

    const scenarioTwoSection = model.sections.find((section) => section.label === 'Scenario: Inflation Spike');
    const scenarioTwoTerminal = scenarioTwoSection?.rows.find((row) => row.label === 'Terminal Portfolio Value');

    expect(scenarioTwoTerminal?.valuesBySlot.A).toBe('—');
    expect(scenarioTwoTerminal?.valuesBySlot.B).toBe('—');
  });

  it('computes base and scenario mean/median from rows', () => {
    const model = buildCompareStressTableModel({
      slotOrder: ['A'],
      slotsById: {
        A: { stressResult: makeStressResult(), inflationRate: 0 },
      },
      scenarios,
      simulationMode: SimulationMode.Manual,
    });

    const baseMedian = model.sections[0]?.rows.find((row) => row.label === 'Median Monthly Withdrawal (Real)');
    const scenarioMedian = model.sections[1]?.rows.find((row) => row.label === 'Median Monthly Withdrawal (Real)');

    expect(baseMedian?.valuesBySlot.A).toBe('$20,000');
    expect(scenarioMedian?.valuesBySlot.A).toBe('$23,000');
  });
});
