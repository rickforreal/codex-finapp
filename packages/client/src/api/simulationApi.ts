import type { SimulateRequest, SimulateResponse } from '@finapp/shared';

export const runSimulation = async (request: SimulateRequest): Promise<SimulateResponse> => {
  const response = await fetch('/api/v1/simulate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Simulation failed with status ${response.status}`);
  }

  return response.json() as Promise<SimulateResponse>;
};
