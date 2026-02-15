import { HistoricalEra, type HistoricalSummaryResponse } from '@finapp/shared';

export const fetchHistoricalSummary = async (
  era: HistoricalEra,
): Promise<HistoricalSummaryResponse> => {
  const params = new URLSearchParams({ era });
  const response = await fetch(`/api/v1/historical/summary?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Historical summary failed with status ${response.status}`);
  }
  return response.json() as Promise<HistoricalSummaryResponse>;
};
