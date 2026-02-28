import { useEffect } from 'react';

import { ThemeAppearance, ThemeFamilyId, type ThemeDefinition } from '@finapp/shared';

import { fetchHealth } from './api/healthApi';
import { fetchThemes } from './api/themeApi';
import { AppShell } from './components/layout/AppShell';
import { applyTheme, loadThemePreference, persistThemePreference } from './styles/themeEngine';
import { useAppStore } from './store/useAppStore';

const resolveVariant = (
  variants: ThemeDefinition[],
  familyId: ThemeFamilyId,
  appearance: ThemeAppearance,
): ThemeDefinition | null => {
  const direct = variants.find((variant) => variant.familyId === familyId && variant.appearance === appearance);
  if (direct) {
    return direct;
  }
  return variants.find((variant) => variant.familyId === familyId) ?? null;
};

const App = () => {
  const themeState = useAppStore((state) => state.theme);
  const setThemeState = useAppStore((state) => state.setThemeState);

  useEffect(() => {
    void fetchHealth()
      .then((response) => {
        console.info(response);
      })
      .catch((error: unknown) => {
        console.warn('Health check failed', error);
      });
  }, []);

  useEffect(() => {
    const hasThemeCatalog = themeState.families.length > 0 && themeState.variants.length > 0;
    if (hasThemeCatalog) {
      return;
    }

    let cancelled = false;
    setThemeState({ status: 'loading', errorMessage: null });

    void fetchThemes()
      .then((response) => {
        if (cancelled) {
          return;
        }
        const familyById = new Map(response.families.map((family) => [family.id, family]));
        const state = useAppStore.getState();
        const snapshotFamily = familyById.has(state.theme.selectedThemeFamilyId)
          ? state.theme.selectedThemeFamilyId
          : null;
        const snapshotAppearance = snapshotFamily
          ? state.theme.selectedAppearanceByFamily[snapshotFamily]
          : null;
        const localPreference = loadThemePreference();
        const localFamily = localPreference && familyById.has(localPreference.familyId)
          ? localPreference.familyId
          : null;
        const localAppearance = localPreference?.appearance ?? null;
        const selectedThemeFamilyId = snapshotFamily ?? localFamily ?? response.defaultSelection.familyId;
        const supportedAppearances = familyById.get(selectedThemeFamilyId)?.supportedAppearances ?? [ThemeAppearance.Dark];
        const preferredAppearance = snapshotAppearance ?? localAppearance ?? response.defaultSelection.appearance;
        const selectedAppearance = supportedAppearances.includes(preferredAppearance)
          ? preferredAppearance
          : (supportedAppearances[0] ?? ThemeAppearance.Dark);
        const selectedTheme = resolveVariant(response.variants, selectedThemeFamilyId, selectedAppearance);
        if (selectedTheme) {
          applyTheme(selectedTheme, response.slotCatalog);
          persistThemePreference({ familyId: selectedTheme.familyId, appearance: selectedTheme.appearance });
        }
        if (response.validationIssues.length > 0) {
          console.warn('Theme validation warnings', response.validationIssues);
        }
        const selectedAppearanceByFamily = Object.fromEntries(
          response.families.map((family) => {
            const existing = state.theme.selectedAppearanceByFamily[family.id];
            const remembered = existing && family.supportedAppearances.includes(existing)
              ? existing
              : (family.supportedAppearances[0] ?? ThemeAppearance.Dark);
            return [family.id, remembered];
          }),
        ) as Record<ThemeFamilyId, ThemeAppearance>;
        selectedAppearanceByFamily[selectedThemeFamilyId] = selectedAppearance;

        setThemeState({
          status: 'ready',
          errorMessage: null,
          selectedThemeFamilyId,
          selectedAppearanceByFamily,
          defaultThemeFamilyId: response.defaultSelection.familyId,
          defaultAppearance: response.defaultSelection.appearance,
          activeVariantId: selectedTheme?.id ?? null,
          variants: response.variants,
          families: response.families,
          legacyDefaultThemeId: response.defaultThemeId,
          legacyThemes: response.themes,
          legacyCatalog: response.catalog,
          slotCatalog: response.slotCatalog,
          validationIssues: response.validationIssues,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load themes';
        setThemeState({ status: 'error', errorMessage: message });
      });

    return () => {
      cancelled = true;
    };
  }, [setThemeState, themeState.families.length, themeState.variants.length]);

  useEffect(() => {
    if (themeState.status !== 'ready') {
      return;
    }
    const selectedAppearance = themeState.selectedAppearanceByFamily[themeState.selectedThemeFamilyId];
    const selectedTheme = resolveVariant(
      themeState.variants,
      themeState.selectedThemeFamilyId,
      selectedAppearance,
    );
    if (!selectedTheme) {
      return;
    }
    applyTheme(selectedTheme, themeState.slotCatalog);
    persistThemePreference({ familyId: selectedTheme.familyId, appearance: selectedTheme.appearance });
    if (themeState.activeVariantId !== selectedTheme.id) {
      setThemeState({ activeVariantId: selectedTheme.id });
    }
  }, [
    setThemeState,
    themeState.activeVariantId,
    themeState.selectedThemeFamilyId,
    themeState.selectedAppearanceByFamily,
    themeState.slotCatalog,
    themeState.status,
    themeState.variants,
  ]);

  return <AppShell />;
};

export default App;
