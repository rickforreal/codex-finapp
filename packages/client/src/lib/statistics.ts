import type { MonthlySimulationRow } from '@finapp/shared';

import { AssetClass } from '@finapp/shared';

export type SummaryStatsView = {
  totalDrawdownNominal: number;
  totalDrawdownReal: number;
  medianMonthlyReal: number;
  meanMonthlyReal: number;
  stdDevMonthlyReal: number;
  p25MonthlyReal: number;
  p75MonthlyReal: number;
  terminalValue: number;
  depletionMonthIndex: number | null;
};

type Quantiles = {
  p25: number;
  p50: number;
  p75: number;
};

const sorted = (values: number[]) => [...values].sort((a, b) => a - b);

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

const computeQuantiles = (values: number[]): Quantiles => {
  const ranked = sorted(values);
  return {
    p25: quantile(ranked, 0.25),
    p50: quantile(ranked, 0.5),
    p75: quantile(ranked, 0.75),
  };
};

const mean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const stdDevPopulation = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const avg = mean(values);
  const variance = values.reduce((acc, value) => acc + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const inflationFactor = (inflationRate: number, monthIndex: number): number => (1 + inflationRate) ** (monthIndex / 12);

const totalBalance = (row: MonthlySimulationRow): number =>
  row.endBalances[AssetClass.Stocks] + row.endBalances[AssetClass.Bonds] + row.endBalances[AssetClass.Cash];

export const buildSummaryStats = (rows: MonthlySimulationRow[], inflationRate: number): SummaryStatsView => {
  if (rows.length === 0) {
    return {
      totalDrawdownNominal: 0,
      totalDrawdownReal: 0,
      medianMonthlyReal: 0,
      meanMonthlyReal: 0,
      stdDevMonthlyReal: 0,
      p25MonthlyReal: 0,
      p75MonthlyReal: 0,
      terminalValue: 0,
      depletionMonthIndex: null,
    };
  }

  const withdrawalRows = rows.filter((row) => row.withdrawals.requested > 0);
  const sourceRows = withdrawalRows.length > 0 ? withdrawalRows : rows;
  const nominalWithdrawals = sourceRows.map((row) => row.withdrawals.requested);
  const realWithdrawals = sourceRows.map(
    (row) => row.withdrawals.requested / inflationFactor(inflationRate, row.monthIndex),
  );
  const totals = rows.map(totalBalance);
  const { p25, p50, p75 } = computeQuantiles(realWithdrawals);

  const depletion = rows.find((row) => totalBalance(row) <= 0);
  const terminalValue = totals[totals.length - 1] ?? 0;

  return {
    totalDrawdownNominal: nominalWithdrawals.reduce((acc, value) => acc + value, 0),
    totalDrawdownReal: realWithdrawals.reduce((acc, value) => acc + value, 0),
    medianMonthlyReal: p50,
    meanMonthlyReal: mean(realWithdrawals),
    stdDevMonthlyReal: stdDevPopulation(realWithdrawals),
    p25MonthlyReal: p25,
    p75MonthlyReal: p75,
    terminalValue,
    depletionMonthIndex: depletion?.monthIndex ?? null,
  };
};
