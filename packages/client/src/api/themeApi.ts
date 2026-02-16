import type { ThemesResponse } from '@finapp/shared';

export const fetchThemes = async (): Promise<ThemesResponse> => {
  const response = await fetch('/api/v1/themes');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Themes request failed with status ${response.status}`);
  }
  return response.json() as Promise<ThemesResponse>;
};
