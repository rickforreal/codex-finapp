import type { ReforecastRequest, ReforecastResponse } from '@finapp/shared';

export const runReforecast = async (request: ReforecastRequest): Promise<ReforecastResponse> => {
  const response = await fetch('/api/v1/reforecast', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Reforecast failed with status ${response.status}`);
  }

  return response.json() as Promise<ReforecastResponse>;
};
