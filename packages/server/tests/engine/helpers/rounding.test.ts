import { describe, expect, it } from 'vitest';

import { roundToCents } from '../../../src/engine/helpers/rounding';

describe('roundToCents', () => {
  it('should round .5 up', () => {
    expect(roundToCents(10.5)).toBe(11);
  });

  it('should round .4999 down', () => {
    expect(roundToCents(10.4999)).toBe(10);
  });

  it('should round .5001 up', () => {
    expect(roundToCents(10.5001)).toBe(11);
  });

  it('should round negative half away from zero using Math.round behavior', () => {
    expect(roundToCents(-10.5)).toBe(-10);
  });

  it('should return zero for zero', () => {
    expect(roundToCents(0)).toBe(0);
  });
});
