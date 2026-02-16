import { describe, expect, it } from 'vitest';

import { ThemeId } from '@finapp/shared';

import { createApp } from '../../src/app';

describe('GET /api/v1/themes', () => {
  it('returns built-in themes catalog with default', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/themes',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.defaultThemeId).toBe(ThemeId.Light);
    expect(Array.isArray(body.themes)).toBe(true);
    expect(body.themes.map((theme: { id: ThemeId }) => theme.id)).toEqual(
      expect.arrayContaining([ThemeId.Light, ThemeId.Dark, ThemeId.HighContrast, ThemeId.Monokai]),
    );

    await app.close();
  });

  it('includes theme validation issues payload', async () => {
    const app = createApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/themes',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.validationIssues)).toBe(true);

    await app.close();
  });
});
