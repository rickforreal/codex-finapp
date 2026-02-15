import type { StressTestRequest, StressTestResponse } from '@finapp/shared';

export const runStressTest = async (request: StressTestRequest): Promise<StressTestResponse> => {
  const response = await fetch('/api/v1/stress-test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Stress test failed with status ${response.status}`);
  }

  return response.json() as Promise<StressTestResponse>;
};

