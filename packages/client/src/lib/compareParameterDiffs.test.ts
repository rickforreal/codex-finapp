import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
  ReturnSource,
  SimulationMode,
  WithdrawalStrategyType,
  type SimulationConfig,
} from '@finapp/shared';
import { describe, expect, it } from 'vitest';

import { buildCompareParameterDiffs } from './compareParameterDiffs';

const baseConfig = (): SimulationConfig => ({
  mode: AppMode.Planning,
  simulationMode: SimulationMode.Manual,
  selectedHistoricalEra: HistoricalEra.FullHistory,
  customHistoricalRange: null,
  blockBootstrapEnabled: false,
  blockBootstrapLength: 12,
  coreParams: {
    birthDate: { month: 1, year: 1970 },
    portfolioStart: { month: 1, year: 2030 },
    portfolioEnd: { month: 1, year: 2060 },
    inflationRate: 0.032,
  },
  portfolio: {
    [AssetClass.Stocks]: 1_000_000,
    [AssetClass.Bonds]: 100_000,
    [AssetClass.Cash]: 50_000,
  },
  returnAssumptions: {
    [AssetClass.Stocks]: { expectedReturn: 0.08, stdDev: 0.15 },
    [AssetClass.Bonds]: { expectedReturn: 0.04, stdDev: 0.07 },
    [AssetClass.Cash]: { expectedReturn: 0.02, stdDev: 0.01 },
  },
  spendingPhases: [
    {
      id: 'phase-a',
      name: 'Phase 1',
      start: { month: 1, year: 2030 },
      end: { month: 1, year: 2060 },
      minMonthlySpend: 6_000,
      maxMonthlySpend: 8_000,
    },
  ],
  withdrawalStrategy: {
    type: WithdrawalStrategyType.ConstantDollar,
    params: {
      initialWithdrawalRate: 0.04,
    },
  },
  drawdownStrategy: {
    type: DrawdownStrategyType.Bucket,
    bucketOrder: [AssetClass.Cash, AssetClass.Bonds, AssetClass.Stocks],
  },
  incomeEvents: [
    {
      id: 'inc-a',
      name: 'Pension',
      amount: 2_000,
      depositTo: AssetClass.Cash,
      start: { month: 1, year: 2030 },
      end: 'endOfRetirement',
      frequency: 'monthly',
      inflationAdjusted: true,
    },
  ],
  expenseEvents: [
    {
      id: 'exp-a',
      name: 'Roof',
      amount: 20_000,
      sourceFrom: 'follow-drawdown',
      start: { month: 7, year: 2032 },
      end: { month: 7, year: 2032 },
      frequency: 'oneTime',
      inflationAdjusted: false,
    },
  ],
});

describe('buildCompareParameterDiffs', () => {
  it('returns zero rows when configs are identical', () => {
    const configA = baseConfig();
    const configB = baseConfig();

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    expect(result.rows).toEqual([]);
    expect(result.differenceCount).toBe(0);
  });

  it('captures scalar differences such as starting principal changes', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    configB.portfolio.stocks = 1_500_000;

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    const rowKeys = new Set(result.rows.map((row) => row.key));
    expect(rowKeys.has('portfolio.stocks')).toBe(true);
    expect(rowKeys.has('portfolio.totalPrincipal')).toBe(true);
    expect(result.differenceCount).toBeGreaterThanOrEqual(2);
  });

  it('handles strategy type mismatch with unified parameter rows and N/A', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    configB.withdrawalStrategy = {
      type: WithdrawalStrategyType.OneOverN,
      params: {},
    };

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    const strategyTypeRow = result.rows.find((row) => row.key === 'withdrawal.type');
    const initialRateRow = result.rows.find((row) => row.key === 'withdrawal.param.initialWithdrawalRate');

    expect(strategyTypeRow?.valuesBySlot.A).toBe('Constant Dollar');
    expect(strategyTypeRow?.valuesBySlot.B).toBe('1/N');
    expect(initialRateRow?.valuesBySlot.B).toBe('N/A');
  });

  it('renders drawdown strategy type with plain English labels', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    configB.drawdownStrategy = {
      type: DrawdownStrategyType.Rebalancing,
      rebalancing: {
        targetAllocation: {
          [AssetClass.Stocks]: 0.6,
          [AssetClass.Bonds]: 0.3,
          [AssetClass.Cash]: 0.1,
        },
        glidePathEnabled: false,
        glidePath: [],
      },
    };

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    const drawdownTypeRow = result.rows.find((row) => row.key === 'drawdown.type');
    expect(drawdownTypeRow?.valuesBySlot.A).toBe('Bucket');
    expect(drawdownTypeRow?.valuesBySlot.B).toBe('Rebalancing');
  });

  it('ignores ids for phases/events summary comparison', () => {
    const configA = baseConfig();
    const configB = baseConfig();

    configB.spendingPhases = configB.spendingPhases.map((phase) => ({ ...phase, id: 'phase-b' }));
    configB.incomeEvents = configB.incomeEvents.map((event) => ({ ...event, id: 'inc-b' }));
    configB.expenseEvents = configB.expenseEvents.map((event) => ({ ...event, id: 'exp-b' }));

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    expect(result.rows).toEqual([]);
    expect(result.differenceCount).toBe(0);
  });

  it('computes differsFromBaseline flags per slot', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    const configC = baseConfig();
    configB.coreParams.birthDate = { month: 1, year: 1975 };

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B', 'C'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB, C: configC },
    });

    const birthDateRow = result.rows.find((row) => row.key === 'core.birthDate');
    expect(birthDateRow).toBeDefined();
    expect(birthDateRow?.differsFromBaselineBySlot.A).toBe(false);
    expect(birthDateRow?.differsFromBaselineBySlot.B).toBe(true);
    expect(birthDateRow?.differsFromBaselineBySlot.C).toBe(false);
  });

  it('supports mixed multi-slot differences and returns non-zero difference count', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    const configC = baseConfig();
    const configD = baseConfig();

    configB.portfolio.stocks = 1_200_000;
    configC.coreParams.inflationRate = 0.04;
    configD.returnAssumptions.bonds.stdDev = 0.09;

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B', 'C', 'D'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB, C: configC, D: configD },
    });

    const rowKeys = new Set(result.rows.map((row) => row.key));
    expect(rowKeys.has('portfolio.stocks')).toBe(true);
    expect(rowKeys.has('core.inflationRate')).toBe(true);
    expect(rowKeys.has('returns.bonds.stdDev')).toBe(true);
    expect(result.differenceCount).toBeGreaterThanOrEqual(4);
  });

  it('captures historical-era and block-bootstrap parameter differences', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    configA.returnsSource = ReturnSource.Historical;
    configB.returnsSource = ReturnSource.Historical;
    configB.selectedHistoricalEra = HistoricalEra.OilCrisis;
    configB.blockBootstrapEnabled = true;
    configB.blockBootstrapLength = 24;

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    const eraRow = result.rows.find((row) => row.key === 'historicalData.selectedEra');
    const blockEnabledRow = result.rows.find(
      (row) => row.key === 'historicalData.blockBootstrapEnabled',
    );
    const blockLengthRow = result.rows.find(
      (row) => row.key === 'historicalData.blockBootstrapLength',
    );

    expect(eraRow?.valuesBySlot.A).toBe('Full History');
    expect(eraRow?.valuesBySlot.B).toBe('Oil Crisis');
    expect(blockEnabledRow?.valuesBySlot.A).toBe('Off');
    expect(blockEnabledRow?.valuesBySlot.B).toBe('On');
    expect(blockLengthRow?.valuesBySlot.A).toBe('N/A');
    expect(blockLengthRow?.valuesBySlot.B).toBe('24');
  });

  it('formats custom historical era with month-year range text', () => {
    const configA = baseConfig();
    const configB = baseConfig();
    configA.returnsSource = ReturnSource.Historical;
    configB.returnsSource = ReturnSource.Historical;
    configB.selectedHistoricalEra = HistoricalEra.Custom;
    configB.customHistoricalRange = {
      start: { year: 1990, month: 1 },
      end: { year: 2000, month: 12 },
    };

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    const eraRow = result.rows.find((row) => row.key === 'historicalData.selectedEra');
    expect(eraRow?.valuesBySlot.B).toBe('Custom (Jan 1990 - Dec 2000)');
  });

  it('treats return assumptions as N/A for historical-source slots in mixed-source compares', () => {
    const configA = baseConfig();
    const configB = baseConfig();

    configA.returnsSource = ReturnSource.Manual;
    configA.returnAssumptions.stocks.expectedReturn = 0.05;
    configB.returnsSource = ReturnSource.Historical;
    configB.returnAssumptions.stocks.expectedReturn = 0.08;

    const result = buildCompareParameterDiffs({
      slotOrder: ['A', 'B'],
      baselineSlotId: 'A',
      slotConfigsById: { A: configA, B: configB },
    });

    const sourceRow = result.rows.find((row) => row.key === 'returns.source');
    const stocksExpectedRow = result.rows.find((row) => row.key === 'returns.stocks.expectedReturn');
    const historicalEraRow = result.rows.find((row) => row.key === 'historicalData.selectedEra');

    expect(sourceRow?.valuesBySlot.A).toBe('Manual');
    expect(sourceRow?.valuesBySlot.B).toBe('Historical');
    expect(stocksExpectedRow?.valuesBySlot.A).toBe('5.00%');
    expect(stocksExpectedRow?.valuesBySlot.B).toBe('N/A');
    expect(historicalEraRow?.valuesBySlot.A).toBe('N/A');
  });
});
