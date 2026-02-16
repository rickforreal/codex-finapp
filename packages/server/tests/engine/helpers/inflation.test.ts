import { describe, expect, it } from 'vitest';

import { buildMonthlyInflationFactors } from '../../../src/engine/helpers/inflation';

describe('inflation helpers', () => {
  it('builds monthly factors for a constant annual inflation rate', () => {
    const annual = 0.03;
    const factors = buildMonthlyInflationFactors(24, () => annual);
    const monthly = (1 + annual) ** (1 / 12);

    expect(factors[1]).toBeCloseTo(1, 12);
    expect(factors[2]).toBeCloseTo(monthly, 12);
    expect(factors[13]).toBeCloseTo(monthly ** 12, 12);
    expect(factors[24]).toBeCloseTo(monthly ** 23, 12);
  });

  it('supports year-specific inflation overrides', () => {
    const factors = buildMonthlyInflationFactors(24, (year) => (year === 1 ? 0.03 : 0.06));
    const y1Monthly = (1 + 0.03) ** (1 / 12);
    const y2Monthly = (1 + 0.06) ** (1 / 12);

    expect(factors[13]).toBeCloseTo(y1Monthly ** 12, 10);
    expect(factors[14]).toBeCloseTo((y1Monthly ** 12) * y2Monthly, 10);
  });
});

