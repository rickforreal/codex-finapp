import { describe, expect, it } from 'vitest';

import { type StressScenario } from '@finapp/shared';

import { createApp } from '../../src/app';
import { createBaseConfig } from '../fixtures';

describe('POST /api/v1/stress-test', () => {
  it('returns stress results for a valid request', async () => {
    const app = createApp();
    const scenarios: StressScenario[] = [
      {
        id: 's1',
        label: 'Early Crash',
        type: 'stockCrash',
        startYear: 1,
        params: { dropPct: -0.3 },
      },
    ];

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stress-test',
      payload: {
        config: createBaseConfig(),
        scenarios,
        seed: 123,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.result.base).toBeDefined();
    expect(Array.isArray(body.result.scenarios)).toBe(true);
    expect(body.result.scenarios).toHaveLength(1);

    await app.close();
  });

  it('returns 400 for invalid stress request', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/stress-test',
      payload: {
        config: createBaseConfig(),
        scenarios: [],
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.fieldErrors)).toBe(true);

    await app.close();
  });
});

