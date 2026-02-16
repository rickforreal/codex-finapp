import { useEffect } from 'react';

import { fetchHealth } from './api/healthApi';
import { fetchThemes } from './api/themeApi';
import { AppShell } from './components/layout/AppShell';
import { applyTheme, loadThemePreference, persistThemePreference } from './styles/themeEngine';
import { useAppStore } from './store/useAppStore';

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
    const hasThemeCatalog = themeState.catalog.length > 0 && themeState.themes.length > 0;
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
        const availableIds = new Set(response.catalog.map((item) => item.id));
        const state = useAppStore.getState();
        const snapshotPreference =
          availableIds.has(state.theme.selectedThemeId) ? state.theme.selectedThemeId : null;
        const localPreference = loadThemePreference();
        const localPreferenceId = localPreference && availableIds.has(localPreference as typeof response.defaultThemeId)
          ? (localPreference as typeof response.defaultThemeId)
          : null;
        const selectedThemeId = snapshotPreference ?? localPreferenceId ?? response.defaultThemeId;
        const selectedTheme = response.themes.find((theme) => theme.id === selectedThemeId);
        if (selectedTheme) {
          applyTheme(selectedTheme);
          persistThemePreference(selectedTheme.id);
        }
        if (response.validationIssues.length > 0) {
          console.warn('Theme validation warnings', response.validationIssues);
        }
        setThemeState({
          status: 'ready',
          errorMessage: null,
          selectedThemeId,
          defaultThemeId: response.defaultThemeId,
          themes: response.themes,
          catalog: response.catalog,
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
  }, [setThemeState, themeState.catalog.length, themeState.themes.length]);

  useEffect(() => {
    if (themeState.status !== 'ready') {
      return;
    }
    const selectedTheme = themeState.themes.find((theme) => theme.id === themeState.selectedThemeId);
    if (!selectedTheme) {
      return;
    }
    applyTheme(selectedTheme);
    persistThemePreference(selectedTheme.id);
  }, [themeState.selectedThemeId, themeState.status, themeState.themes]);

  return <AppShell />;
};

export default App;
