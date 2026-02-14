import { describe, expect, it } from 'vitest';

import { pmt } from '../../../src/engine/helpers/pmt';

describe('pmt', () => {
  it('should handle zero rate', () => {
    expect(pmt(0, 10, 120_000, 0)).toBe(12_000);
  });

  it('should match known 3%/30-year case for 1,000,000 principal', () => {
    expect(pmt(0.03, 30, 1_000_000, 0)).toBeCloseTo(51_019, 0);
  });

  it('should support non-zero future value', () => {
    expect(pmt(0.02, 20, 500_000, 100_000)).toBeCloseTo(34_694.03, 2);
  });

  it('should support small positive rate', () => {
    expect(pmt(0.005, 60, 250_000, 0)).toBeCloseTo(4_833.2, 2);
  });

  it('should throw for non-positive nper', () => {
    expect(() => pmt(0.03, 0, 1_000_000, 0)).toThrow('nper must be greater than 0');
  });
});
