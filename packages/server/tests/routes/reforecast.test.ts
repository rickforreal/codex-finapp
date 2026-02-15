import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import { createBaseConfig } from '../fixtures';

describe('POST /api/v1/reforecast', () => {
  it('returns deterministic reforecast result', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reforecast',
      payload: {
        config: createBaseConfig(),
        actualOverridesByMonth: {
          2: {
            startBalances: { stocks: 900000, bonds: 400000, cash: 100000 },
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result.rows.length).toBe(120);
    expect(body.lastEditedMonthIndex).toBe(2);

    await app.close();
  });

  it('returns validation errors for invalid request', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reforecast',
      payload: {
        config: {},
        actualOverridesByMonth: {},
      },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
