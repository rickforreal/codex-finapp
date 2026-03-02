import { HistoricalEra, type HistoricalRange, type HistoricalSummaryResponse } from '@finapp/shared';

export const fetchHistoricalSummary = async (
  era: HistoricalEra,
  customHistoricalRange?: HistoricalRange | null,
): Promise<HistoricalSummaryResponse> => {
  const params = new URLSearchParams({ era });
  if (era === HistoricalEra.Custom && customHistoricalRange) {
    params.set('startMonth', String(customHistoricalRange.start.month));
    params.set('startYear', String(customHistoricalRange.start.year));
    params.set('endMonth', String(customHistoricalRange.end.month));
    params.set('endYear', String(customHistoricalRange.end.year));
  }
  const response = await fetch(`/api/v1/historical/summary?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Historical summary failed with status ${response.status}`);
  }
  return response.json() as Promise<HistoricalSummaryResponse>;
};
