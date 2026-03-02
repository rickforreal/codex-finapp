import { describe, expect, it } from 'vitest';

import { HistoricalEra } from '@finapp/shared';

import {
  getHistoricalDataSummaryForEra,
  getHistoricalDataSummaryForSelection,
  getHistoricalMonthsForEra,
  getHistoricalMonthsForSelection,
} from '../../src/engine/historicalData';

describe('historicalData', () => {
  it('loads and filters historical rows for selected era', async () => {
    const rows = await getHistoricalMonthsForEra(HistoricalEra.OilCrisis);
    expect(rows.length).toBeGreaterThan(0);
    expect(Math.min(...rows.map((row) => row.year))).toBeGreaterThanOrEqual(1973);
    expect(Math.max(...rows.map((row) => row.year))).toBeLessThanOrEqual(1982);
  });

  it('builds summary stats for selected era', async () => {
    const summary = await getHistoricalDataSummaryForEra(HistoricalEra.FullHistory);
    expect(summary.selectedEra.key).toBe(HistoricalEra.FullHistory);
    expect(summary.selectedEra.endYear).toBeGreaterThanOrEqual(2025);
    expect(summary.selectedEra.startMonth).toBeGreaterThanOrEqual(1);
    expect(summary.selectedEra.endMonth).toBeLessThanOrEqual(12);
    expect(summary.byAsset.stocks.sampleSizeMonths).toBeGreaterThan(1000);
    expect(summary.byAsset.bonds.stdDev).toBeGreaterThan(0);
    expect(summary.byAsset.cash.meanReturn).toBeGreaterThan(0);
  });

  it('filters custom ranges using month-year inclusive bounds', async () => {
    const rows = await getHistoricalMonthsForSelection(HistoricalEra.Custom, {
      start: { year: 2000, month: 1 },
      end: { year: 2000, month: 3 },
    });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ year: 2000, month: 1 });
    expect(rows[2]).toMatchObject({ year: 2000, month: 3 });
  });

  it('builds custom summary with custom selected era metadata', async () => {
    const summary = await getHistoricalDataSummaryForSelection(HistoricalEra.Custom, {
      start: { year: 1999, month: 7 },
      end: { year: 1999, month: 12 },
    });
    expect(summary.selectedEra.key).toBe(HistoricalEra.Custom);
    expect(summary.selectedEra.startYear).toBe(1999);
    expect(summary.selectedEra.startMonth).toBe(7);
    expect(summary.selectedEra.endYear).toBe(1999);
    expect(summary.selectedEra.endMonth).toBe(12);
    expect(summary.byAsset.stocks.sampleSizeMonths).toBe(6);
  });
});
