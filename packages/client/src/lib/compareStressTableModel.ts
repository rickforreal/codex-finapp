import { SimulationMode, type MonthlySimulationRow, type StressScenario, type StressTestResult } from '@finapp/shared';

import { formatCurrency, formatPercent } from './format';

type SlotId = string;

export type CompareStressSlotTableData = {
  stressResult: StressTestResult | null;
  inflationRate: number;
};

export type CompareStressTableRow = {
  key: string;
  label: string;
  isDelta?: boolean;
  valuesBySlot: Record<SlotId, string>;
};

export type CompareStressTableSection = {
  key: string;
  label: string;
  rows: CompareStressTableRow[];
};

export type CompareStressTableModel = {
  sections: CompareStressTableSection[];
};

type BuildCompareStressTableModelInput = {
  slotOrder: SlotId[];
  slotsById: Partial<Record<SlotId, CompareStressSlotTableData>>;
  scenarios: StressScenario[];
  simulationMode: SimulationMode;
};

const MISSING = '—';

const formatSignedCurrency = (value: number): string => {
  const rounded = Math.round(value);
  if (rounded === 0) {
    return '$0';
  }
  const abs = formatCurrency(Math.abs(rounded));
  return rounded > 0 ? `+${abs}` : `-${abs}`;
};

const formatSignedPercent = (value: number): string => {
  if (value === 0) {
    return '0%';
  }
  const abs = formatPercent(Math.abs(value), 1);
  return value > 0 ? `+${abs}` : `-${abs}`;
};

const findScenarioResult = (result: StressTestResult | null, scenario: StressScenario) =>
  result?.scenarios.find((entry) => entry.scenarioId === scenario.id) ??
  result?.scenarios.find((entry) => entry.scenarioLabel === scenario.label) ??
  null;

const sorted = (values: number[]) => [...values].sort((left, right) => left - right);

const quantile = (values: number[], percentile: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const index = (values.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return values[lower] ?? 0;
  }
  const lowerValue = values[lower] ?? 0;
  const upperValue = values[upper] ?? 0;
  const weight = index - lower;
  return lowerValue + (upperValue - lowerValue) * weight;
};

const monthlyStats = (rows: MonthlySimulationRow[] | undefined, inflationRate: number) => {
  if (!rows) {
    return null;
  }
  const realMonthlyWithdrawals = rows.map((row) => {
    const factor = (1 + inflationRate) ** (row.monthIndex / 12);
    return row.withdrawals.actual / factor;
  });
  if (realMonthlyWithdrawals.length === 0) {
    return { medianMonthlyReal: 0, meanMonthlyReal: 0 };
  }
  const ranked = sorted(realMonthlyWithdrawals);
  const meanMonthlyReal =
    realMonthlyWithdrawals.reduce((sum, value) => sum + value, 0) / realMonthlyWithdrawals.length;
  const medianMonthlyReal = quantile(ranked, 0.5);
  return { medianMonthlyReal, meanMonthlyReal };
};

const buildRow = (
  slotOrder: SlotId[],
  resolver: (slotId: SlotId) => string,
  options?: Pick<CompareStressTableRow, 'key' | 'label' | 'isDelta'>,
): CompareStressTableRow => {
  const key = options?.key ?? 'row';
  const label = options?.label ?? 'Metric';
  const valuesBySlot = Object.fromEntries(slotOrder.map((slotId) => [slotId, resolver(slotId)]));
  return { key, label, isDelta: options?.isDelta, valuesBySlot };
};

export const buildCompareStressTableModel = ({
  slotOrder,
  slotsById,
  scenarios,
  simulationMode,
}: BuildCompareStressTableModelInput): CompareStressTableModel => {
  const baseSection: CompareStressTableSection = {
    key: 'base',
    label: 'Base',
    rows: [
      buildRow(slotOrder, (slotId) => {
        const metrics = slotsById[slotId]?.stressResult?.base.metrics;
        return metrics ? formatCurrency(Math.round(metrics.terminalValue)) : MISSING;
      }, { key: 'base.terminalValue', label: 'Terminal Portfolio Value' }),
      buildRow(slotOrder, (slotId) => {
        const metrics = slotsById[slotId]?.stressResult?.base.metrics;
        return metrics ? formatCurrency(Math.round(metrics.totalDrawdownReal)) : MISSING;
      }, { key: 'base.totalDrawdownReal', label: 'Total Drawdown (Real)' }),
      buildRow(slotOrder, (slotId) => {
        const slot = slotsById[slotId];
        const stats = monthlyStats(slot?.stressResult?.base.result.rows, slot?.inflationRate ?? 0);
        return stats ? formatCurrency(Math.round(stats.medianMonthlyReal)) : MISSING;
      }, { key: 'base.medianMonthlyWithdrawalReal', label: 'Median Monthly Withdrawal (Real)' }),
      buildRow(slotOrder, (slotId) => {
        const slot = slotsById[slotId];
        const stats = monthlyStats(slot?.stressResult?.base.result.rows, slot?.inflationRate ?? 0);
        return stats ? formatCurrency(Math.round(stats.meanMonthlyReal)) : MISSING;
      }, { key: 'base.meanMonthlyWithdrawalReal', label: 'Mean Monthly Withdrawal (Real)' }),
      buildRow(slotOrder, (slotId) => {
        const metrics = slotsById[slotId]?.stressResult?.base.metrics;
        return metrics ? (metrics.depletionMonth ?? 'Never').toString() : MISSING;
      }, { key: 'base.depletionMonth', label: 'Depletion Month' }),
    ],
  };

  if (simulationMode === SimulationMode.MonteCarlo) {
    baseSection.rows.push(
      buildRow(slotOrder, (slotId) => {
        const metrics = slotsById[slotId]?.stressResult?.base.metrics;
        return metrics ? formatPercent(metrics.probabilityOfSuccess ?? 0, 1) : MISSING;
      }, { key: 'base.probabilityOfSuccess', label: 'Probability of Success' }),
    );
  }

  const scenarioSections: CompareStressTableSection[] = scenarios.map((scenario, index) => {
    const sectionRows: CompareStressTableRow[] = [
      buildRow(slotOrder, (slotId) => {
        const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
        return scenarioResult ? formatCurrency(Math.round(scenarioResult.metrics.terminalValue)) : MISSING;
      }, {
        key: `scenario.${scenario.id}.terminalValue`,
        label: 'Terminal Portfolio Value',
      }),
      buildRow(slotOrder, (slotId) => {
        const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
        return scenarioResult ? formatSignedCurrency(scenarioResult.metrics.terminalDeltaVsBase) : MISSING;
      }, {
        key: `scenario.${scenario.id}.terminalDeltaVsBase`,
        label: 'Δ Terminal vs. Base',
        isDelta: true,
      }),
      buildRow(slotOrder, (slotId) => {
        const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
        return scenarioResult ? formatCurrency(Math.round(scenarioResult.metrics.totalDrawdownReal)) : MISSING;
      }, {
        key: `scenario.${scenario.id}.totalDrawdownReal`,
        label: 'Total Drawdown (Real)',
      }),
      buildRow(slotOrder, (slotId) => {
        const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
        return scenarioResult ? formatSignedCurrency(scenarioResult.metrics.drawdownDeltaVsBase) : MISSING;
      }, {
        key: `scenario.${scenario.id}.drawdownDeltaVsBase`,
        label: 'Δ Drawdown vs. Base',
        isDelta: true,
      }),
      buildRow(slotOrder, (slotId) => {
        const slot = slotsById[slotId];
        const scenarioResult = findScenarioResult(slot?.stressResult ?? null, scenario);
        const stats = monthlyStats(scenarioResult?.result.rows, slot?.inflationRate ?? 0);
        return stats ? formatCurrency(Math.round(stats.medianMonthlyReal)) : MISSING;
      }, {
        key: `scenario.${scenario.id}.medianMonthlyWithdrawalReal`,
        label: 'Median Monthly Withdrawal (Real)',
      }),
      buildRow(slotOrder, (slotId) => {
        const slot = slotsById[slotId];
        const scenarioResult = findScenarioResult(slot?.stressResult ?? null, scenario);
        const stats = monthlyStats(scenarioResult?.result.rows, slot?.inflationRate ?? 0);
        return stats ? formatCurrency(Math.round(stats.meanMonthlyReal)) : MISSING;
      }, {
        key: `scenario.${scenario.id}.meanMonthlyWithdrawalReal`,
        label: 'Mean Monthly Withdrawal (Real)',
      }),
      buildRow(slotOrder, (slotId) => {
        const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
        return scenarioResult ? (scenarioResult.metrics.depletionMonth ?? 'Never').toString() : MISSING;
      }, {
        key: `scenario.${scenario.id}.depletionMonth`,
        label: 'Depletion Month',
      }),
    ];

    if (simulationMode === SimulationMode.MonteCarlo) {
      sectionRows.push(
        buildRow(slotOrder, (slotId) => {
          const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
          return scenarioResult ? formatPercent(scenarioResult.metrics.probabilityOfSuccess ?? 0, 1) : MISSING;
        }, {
          key: `scenario.${scenario.id}.probabilityOfSuccess`,
          label: 'Probability of Success',
        }),
        buildRow(slotOrder, (slotId) => {
          const scenarioResult = findScenarioResult(slotsById[slotId]?.stressResult ?? null, scenario);
          if (!scenarioResult) {
            return MISSING;
          }
          const delta =
            scenarioResult.metrics.successDeltaPpVsBase ??
            ((scenarioResult.metrics.probabilityOfSuccess ?? 0) -
              (slotsById[slotId]?.stressResult?.base.metrics.probabilityOfSuccess ?? 0));
          return formatSignedPercent(delta);
        }, {
          key: `scenario.${scenario.id}.successDeltaPpVsBase`,
          label: 'Δ Success vs. Base',
          isDelta: true,
        }),
      );
    }

    return {
      key: `scenario-${scenario.id}`,
      label: `Scenario: ${scenario.label || `Scenario ${index + 1}`}`,
      rows: sectionRows,
    };
  });

  return {
    sections: [baseSection, ...scenarioSections],
  };
};
