import { describe, expect, it } from 'vitest';

import { HistoricalEra } from '@finapp/shared';

import { getHistoricalDataSummaryForEra, getHistoricalMonthsForEra } from '../../src/engine/historicalData';

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
    expect(summary.byAsset.stocks.sampleSizeMonths).toBeGreaterThan(1000);
    expect(summary.byAsset.bonds.stdDev).toBeGreaterThan(0);
    expect(summary.byAsset.cash.meanReturn).toBeGreaterThan(0);
  });
});
