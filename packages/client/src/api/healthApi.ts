import type { HealthResponse } from '@finapp/shared';

export const fetchHealth = async (): Promise<HealthResponse> => {
  const response = await fetch('/api/v1/health');

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthResponse>;
};
