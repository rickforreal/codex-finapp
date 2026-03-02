import { describe, expect, it } from 'vitest';

import { HistoricalEra } from '@finapp/shared';

import { createApp } from '../../src/app';

describe('GET /api/v1/historical/summary', () => {
  it('returns historical summary for selected era', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/historical/summary?era=${HistoricalEra.PostWarBoom}`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary.selectedEra.key).toBe(HistoricalEra.PostWarBoom);
    expect(body.summary.byAsset.stocks.sampleSizeMonths).toBeGreaterThan(0);

    await app.close();
  });

  it('returns historical summary for custom month-year range query', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/historical/summary?era=custom&startMonth=1&startYear=2000&endMonth=3&endYear=2000',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.summary.selectedEra.key).toBe(HistoricalEra.Custom);
    expect(body.summary.byAsset.stocks.sampleSizeMonths).toBe(3);

    await app.close();
  });
});
