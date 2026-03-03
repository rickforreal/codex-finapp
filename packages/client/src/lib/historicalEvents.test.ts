import { describe, expect, it } from 'vitest';

import {
  HISTORICAL_EVENT_MARKERS,
  getHistoricalEventLabel,
  snapToHistoricalEventOrdinal,
} from './historicalEvents';

describe('historicalEvents', () => {
  it('returns labels for exact month-year matches', () => {
    expect(getHistoricalEventLabel(9, 1939)).toBe('World War II Begins');
    expect(getHistoricalEventLabel(2, 2020)).toBe('COVID-19 market crash begins');
    expect(getHistoricalEventLabel(1, 2024)).toBe('US spot Bitcoin ETF approvals');
  });

  it('returns null for non-event months', () => {
    expect(getHistoricalEventLabel(8, 1939)).toBeNull();
    expect(getHistoricalEventLabel(12, 2021)).toBeNull();
  });

  it('keeps broad catalog size and unique month-year points', () => {
    expect(HISTORICAL_EVENT_MARKERS.length).toBe(45);
    const uniqueOrdinals = new Set(
      HISTORICAL_EVENT_MARKERS.map((event) => event.year * 12 + (event.month - 1)),
    );
    expect(uniqueOrdinals.size).toBe(HISTORICAL_EVENT_MARKERS.length);
  });

  it('snaps to nearest in-range event month when within threshold', () => {
    const ww2Begins = 1939 * 12 + (9 - 1);
    const oneMonthAway = 1939 * 12 + (10 - 1);
    const farAway = 1939 * 12 + (12 - 1);

    expect(
      snapToHistoricalEventOrdinal(oneMonthAway, {
        minOrdinal: 1926 * 12 + (7 - 1),
        maxOrdinal: 2025 * 12 + (12 - 1),
      }),
    ).toBe(ww2Begins);
    expect(
      snapToHistoricalEventOrdinal(farAway, {
        minOrdinal: 1926 * 12 + (7 - 1),
        maxOrdinal: 2025 * 12 + (12 - 1),
      }),
    ).toBe(farAway);
  });

  it('does not snap to out-of-range events', () => {
    const nearEventOutsideRange = 1939 * 12 + (10 - 1);

    expect(
      snapToHistoricalEventOrdinal(nearEventOutsideRange, {
        minOrdinal: 1940 * 12 + (1 - 1),
        maxOrdinal: 1940 * 12 + (12 - 1),
      }),
    ).toBe(nearEventOutsideRange);
  });
});
