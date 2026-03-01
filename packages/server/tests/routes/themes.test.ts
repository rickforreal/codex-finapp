import { describe, expect, it } from 'vitest';

import { ThemeAppearance, ThemeFamilyId, ThemeId, ThemeVariantId } from '@finapp/shared';

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
    expect(body.tokenModelVersion).toBe('2');
    expect(body.defaultSelection).toEqual({
      familyId: ThemeFamilyId.Default,
      appearance: ThemeAppearance.Light,
    });
    expect(body.defaultThemeId).toBe(ThemeId.Light);
    expect(Array.isArray(body.variants)).toBe(true);
    expect(Array.isArray(body.families)).toBe(true);
    expect(Array.isArray(body.themes)).toBe(true);
    expect(Array.isArray(body.slotCatalog)).toBe(true);
    expect(body.slotCatalog.length).toBeGreaterThan(10);
    expect(body.themes.map((theme: { id: ThemeVariantId }) => theme.id)).toEqual(
      expect.arrayContaining([
        ThemeVariantId.DefaultLight,
        ThemeVariantId.DefaultDark,
        ThemeVariantId.MonokaiDark,
        ThemeVariantId.Synthwave84Dark,
        ThemeVariantId.StayTheCourseDark,
        ThemeVariantId.HighContrastDark,
      ]),
    );
    expect(body.catalog.map((theme: { id: ThemeId }) => theme.id)).toEqual(
      expect.arrayContaining([
        ThemeId.Light,
        ThemeId.Dark,
        ThemeId.HighContrast,
        ThemeId.Monokai,
        ThemeId.Synthwave84,
        ThemeId.StayTheCourse,
      ]),
    );
    expect(body.families.map((family: { id: ThemeFamilyId }) => family.id)).toEqual(
      expect.arrayContaining([
        ThemeFamilyId.Default,
        ThemeFamilyId.Monokai,
        ThemeFamilyId.Synthwave84,
        ThemeFamilyId.StayTheCourse,
        ThemeFamilyId.HighContrast,
      ]),
    );
    const familyNames = body.families.map((family: { name: string }) => family.name);
    expect(familyNames).toEqual(expect.arrayContaining(['Circuit Breaker', 'Powell Pivot']));
    expect(familyNames).not.toContain('Monokai');
    expect(familyNames).not.toContain("Synthwave '84");

    const monokaiAppearances = body.variants
      .filter((variant: { familyId: ThemeFamilyId }) => variant.familyId === ThemeFamilyId.Monokai)
      .map((variant: { appearance: ThemeAppearance }) => variant.appearance);
    expect(monokaiAppearances).toEqual(
      expect.arrayContaining([ThemeAppearance.Light, ThemeAppearance.Dark]),
    );
    const synthwaveAppearances = body.variants
      .filter((variant: { familyId: ThemeFamilyId }) => variant.familyId === ThemeFamilyId.Synthwave84)
      .map((variant: { appearance: ThemeAppearance }) => variant.appearance);
    expect(synthwaveAppearances).toEqual(
      expect.arrayContaining([ThemeAppearance.Light, ThemeAppearance.Dark]),
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
