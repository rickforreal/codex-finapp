import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  AssetClass,
  HISTORICAL_ERA_DEFINITIONS,
  type HistoricalAssetSummary,
  type HistoricalDataSummary,
  type HistoricalEra,
  type HistoricalEraOption,
  type MonthlyReturns,
} from '@finapp/shared';

export type HistoricalMonth = {
  year: number;
  month: number;
  returns: MonthlyReturns;
};

let historicalMonthsCache: HistoricalMonth[] | null = null;

const resolveCsvPath = async (): Promise<string> => {
  const candidates = [
    path.resolve(process.cwd(), 'data/Historical-Returns.csv'),
    path.resolve(process.cwd(), '../../data/Historical-Returns.csv'),
  ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate, 'utf-8');
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error('Could not find data/Historical-Returns.csv');
};

const parseCsv = (raw: string): HistoricalMonth[] =>
  raw
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [yearRaw, monthRaw, stocksRaw, bondsRaw, cashRaw] = line.split(',');
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const stocksPct = Number(stocksRaw);
      const bondsPct = Number(bondsRaw);
      const cashPct = Number(cashRaw);

      return {
        year,
        month,
        returns: {
          stocks: stocksPct / 100,
          bonds: bondsPct / 100,
          cash: cashPct / 100,
        },
      };
    })
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.month));

const getHistoricalMonths = async (): Promise<HistoricalMonth[]> => {
  if (historicalMonthsCache !== null) {
    return historicalMonthsCache;
  }
  const csvPath = await resolveCsvPath();
  const raw = await readFile(csvPath, 'utf-8');
  historicalMonthsCache = parseCsv(raw);
  return historicalMonthsCache;
};

const latestYear = (months: HistoricalMonth[]): number =>
  months.reduce((max, row) => Math.max(max, row.year), 0);

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

const summarizeAsset = (values: number[]): HistoricalAssetSummary => ({
  meanReturn: mean(values),
  stdDev: stdDevPopulation(values),
  sampleSizeMonths: values.length,
});

const resolveEraOptions = (months: HistoricalMonth[]): HistoricalEraOption[] => {
  const endYear = latestYear(months);
  return HISTORICAL_ERA_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: `${definition.label} (${definition.startYear}-${definition.endYear ?? endYear})`,
    startYear: definition.startYear,
    endYear: definition.endYear ?? endYear,
  }));
};

const findEra = (era: HistoricalEra, months: HistoricalMonth[]): HistoricalEraOption => {
  const match = resolveEraOptions(months).find((option) => option.key === era);
  if (!match) {
    throw new Error(`Unknown historical era: ${era}`);
  }
  return match;
};

export const getHistoricalMonthsForEra = async (era: HistoricalEra): Promise<HistoricalMonth[]> => {
  const months = await getHistoricalMonths();
  const selectedEra = findEra(era, months);
  return months.filter((row) => row.year >= selectedEra.startYear && row.year <= selectedEra.endYear);
};

export const getHistoricalDataSummaryForEra = async (era: HistoricalEra): Promise<HistoricalDataSummary> => {
  const allMonths = await getHistoricalMonths();
  const eras = resolveEraOptions(allMonths);
  const selectedEra = eras.find((option) => option.key === era);
  if (!selectedEra) {
    throw new Error(`Unknown historical era: ${era}`);
  }

  const eraMonths = allMonths.filter(
    (row) => row.year >= selectedEra.startYear && row.year <= selectedEra.endYear,
  );

  const stocks = eraMonths.map((row) => row.returns.stocks);
  const bonds = eraMonths.map((row) => row.returns.bonds);
  const cash = eraMonths.map((row) => row.returns.cash);

  return {
    selectedEra,
    eras,
    byAsset: {
      [AssetClass.Stocks]: summarizeAsset(stocks),
      [AssetClass.Bonds]: summarizeAsset(bonds),
      [AssetClass.Cash]: summarizeAsset(cash),
    },
  };
};
