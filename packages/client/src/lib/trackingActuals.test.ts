import { describe, expect, it } from 'vitest';

import { sanitizeTrackingActualOverrides, getTrackingEditableMonthUpperBound, isTrackingMonthEditable } from './trackingActuals';

describe('trackingActuals', () => {
  it('allows edits through current month plus one and clamps to horizon', () => {
    const start = { month: 1, year: 2030 };
    const end = { month: 1, year: 2060 };
    const now = new Date('2030-01-15T00:00:00.000Z');

    expect(getTrackingEditableMonthUpperBound(start, end, now)).toBe(2);
    expect(isTrackingMonthEditable(2, start, end, now)).toBe(true);
    expect(isTrackingMonthEditable(3, start, end, now)).toBe(false);
  });

  it('permits month one when retirement start is still in the future', () => {
    const start = { month: 1, year: 2030 };
    const end = { month: 1, year: 2060 };
    const now = new Date('2029-12-15T00:00:00.000Z');

    expect(getTrackingEditableMonthUpperBound(start, end, now)).toBe(1);
    expect(isTrackingMonthEditable(1, start, end, now)).toBe(true);
    expect(isTrackingMonthEditable(2, start, end, now)).toBe(false);
  });

  it('still permits month one when retirement start is far in the future', () => {
    const start = { month: 1, year: 2030 };
    const end = { month: 1, year: 2060 };
    const now = new Date('2026-02-25T00:00:00.000Z');

    expect(getTrackingEditableMonthUpperBound(start, end, now)).toBe(1);
    expect(isTrackingMonthEditable(1, start, end, now)).toBe(true);
    expect(isTrackingMonthEditable(2, start, end, now)).toBe(false);
  });

  it('drops legacy income/expense override fields during sanitization', () => {
    const sanitized = sanitizeTrackingActualOverrides({
      1: {
        startBalances: { stocks: 100_000, bonds: 50_000, cash: 25_000 },
        withdrawalsByAsset: { stocks: 2_000 },
        incomeTotal: 10_000,
        expenseTotal: 5_000,
      },
      2: {
        incomeTotal: 9_000,
      },
    });

    expect(sanitized[1]).toEqual({
      startBalances: { stocks: 100_000, bonds: 50_000, cash: 25_000 },
      withdrawalsByAsset: { stocks: 2_000 },
    });
    expect(sanitized[2]).toBeUndefined();
  });
});
