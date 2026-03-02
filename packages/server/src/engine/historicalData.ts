import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  AssetClass,
  HISTORICAL_ERA_DEFINITIONS,
  HistoricalEra,
  type HistoricalRange,
  type HistoricalAssetSummary,
  type HistoricalDataSummary,
  type HistoricalEraOption,
  type MonthlyReturns,
} from '@finapp/shared';

export type HistoricalMonth = {
  year: number;
  month: number;
  returns: MonthlyReturns;
};

let historicalMonthsCache: HistoricalMonth[] | null = null;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.month))
    .sort((left, right) => (left.year === right.year ? left.month - right.month : left.year - right.year));

const getHistoricalMonths = async (): Promise<HistoricalMonth[]> => {
  if (historicalMonthsCache !== null) {
    return historicalMonthsCache;
  }
  const csvPath = await resolveCsvPath();
  const raw = await readFile(csvPath, 'utf-8');
  historicalMonthsCache = parseCsv(raw);
  return historicalMonthsCache;
};

const firstMonth = (months: HistoricalMonth[]): HistoricalMonth => {
  if (months.length === 0) {
    throw new Error('No historical rows loaded');
  }
  return months[0] as HistoricalMonth;
};

const lastMonth = (months: HistoricalMonth[]): HistoricalMonth => {
  if (months.length === 0) {
    throw new Error('No historical rows loaded');
  }
  return months[months.length - 1] as HistoricalMonth;
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

const summarizeAsset = (values: number[]): HistoricalAssetSummary => ({
  meanReturn: mean(values),
  stdDev: stdDevPopulation(values),
  sampleSizeMonths: values.length,
});

const compareMonthYear = (
  left: { year: number; month: number },
  right: { year: number; month: number },
): number => {
  if (left.year !== right.year) {
    return left.year - right.year;
  }
  return left.month - right.month;
};

const monthYearLabel = (year: number, month: number): string => `${MONTH_LABELS[month - 1]} ${year}`;

const inRange = (row: HistoricalMonth, range: HistoricalRange): boolean =>
  compareMonthYear(row, range.start) >= 0 && compareMonthYear(row, range.end) <= 0;

const resolveEraOptions = (months: HistoricalMonth[]): HistoricalEraOption[] => {
  const datasetFirst = firstMonth(months);
  const datasetLast = lastMonth(months);

  return HISTORICAL_ERA_DEFINITIONS.map((definition) => {
    const rangeEndYear = definition.endYear ?? datasetLast.year;
    const rows = months.filter((row) => row.year >= definition.startYear && row.year <= rangeEndYear);
    const first = rows[0] ?? { year: definition.startYear, month: 1 };
    const last = rows[rows.length - 1] ?? { year: rangeEndYear, month: 12 };

    return {
      key: definition.key,
      label: `${definition.label} (${first.year}-${last.year})`,
      startYear: first.year,
      endYear: last.year,
      startMonth: rows.length > 0 ? first.month : datasetFirst.month,
      endMonth: rows.length > 0 ? last.month : datasetLast.month,
    };
  });
};

const resolveRangeForSelection = (
  era: HistoricalEra,
  customRange: HistoricalRange | null | undefined,
  months: HistoricalMonth[],
): HistoricalEraOption => {
  if (era === HistoricalEra.Custom) {
    if (!customRange) {
      throw new Error('customHistoricalRange is required for custom historical era');
    }
    const { start, end } = customRange;
    if (
      !Number.isInteger(start.year) ||
      !Number.isInteger(end.year) ||
      !Number.isInteger(start.month) ||
      !Number.isInteger(end.month) ||
      start.month < 1 ||
      start.month > 12 ||
      end.month < 1 ||
      end.month > 12
    ) {
      throw new Error('customHistoricalRange has invalid month/year values');
    }
    if (compareMonthYear(start, end) > 0) {
      throw new Error('customHistoricalRange start must be <= end');
    }
    return {
      key: HistoricalEra.Custom,
      label: `Custom (${monthYearLabel(start.year, start.month)} - ${monthYearLabel(end.year, end.month)})`,
      startYear: start.year,
      endYear: end.year,
      startMonth: start.month,
      endMonth: end.month,
    };
  }

  const match = resolveEraOptions(months).find((option) => option.key === era);
  if (!match) {
    throw new Error(`Unknown historical era: ${era}`);
  }
  return match;
};

const optionToRange = (option: HistoricalEraOption): HistoricalRange => ({
  start: { year: option.startYear, month: option.startMonth },
  end: { year: option.endYear, month: option.endMonth },
});

export const getHistoricalMonthsForSelection = async (
  era: HistoricalEra,
  customRange?: HistoricalRange | null,
): Promise<HistoricalMonth[]> => {
  const months = await getHistoricalMonths();
  const selected = resolveRangeForSelection(era, customRange, months);
  return months.filter((row) => inRange(row, optionToRange(selected)));
};

export const getHistoricalMonthsForEra = async (era: HistoricalEra): Promise<HistoricalMonth[]> =>
  getHistoricalMonthsForSelection(era, null);

export const getHistoricalDataSummaryForSelection = async (
  era: HistoricalEra,
  customRange?: HistoricalRange | null,
): Promise<HistoricalDataSummary> => {
  const allMonths = await getHistoricalMonths();
  const eras = resolveEraOptions(allMonths);
  const selectedEra = resolveRangeForSelection(era, customRange, allMonths);

  const eraMonths = allMonths.filter((row) => inRange(row, optionToRange(selectedEra)));

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

export const getHistoricalDataSummaryForEra = async (era: HistoricalEra): Promise<HistoricalDataSummary> =>
  getHistoricalDataSummaryForSelection(era, null);
