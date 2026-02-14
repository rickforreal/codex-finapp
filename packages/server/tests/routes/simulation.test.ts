import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app';
import { createSimulateRequest } from '../fixtures';

describe('POST /api/v1/simulate', () => {
  it('should return 200 and simulation response for valid request', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/simulate',
      payload: createSimulateRequest(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.result.rows.length).toBe(120);
    expect(body.result.summary.terminalPortfolioValue).toBeGreaterThanOrEqual(0);

    await app.close();
  });

  it('should return 400 with field errors for invalid request', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/simulate',
      payload: {
        config: {
          simulationMode: 'manual',
        },
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.fieldErrors)).toBe(true);
    expect(body.fieldErrors.length).toBeGreaterThan(0);

    await app.close();
  });
});
