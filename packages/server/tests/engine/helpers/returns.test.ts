import { describe, expect, it } from 'vitest';

import { createSeededRandom, generateRandomMonthlyReturn } from '../../../src/engine/helpers/returns';

describe('returns helpers', () => {
  it('should produce deterministic random values for the same seed', () => {
    const rngA = createSeededRandom(12345);
    const rngB = createSeededRandom(12345);

    const seqA = [rngA(), rngA(), rngA(), rngA(), rngA()];
    const seqB = [rngB(), rngB(), rngB(), rngB(), rngB()];

    expect(seqA).toEqual(seqB);
  });

  it('should generate stochastic monthly returns around the expected rate', () => {
    const rng = createSeededRandom(42);
    const results = Array.from({ length: 12 }, () => generateRandomMonthlyReturn(0.08, 0.15, rng));
    const roundedDistinct = new Set(results.map((value) => value.toFixed(6)));

    expect(roundedDistinct.size).toBeGreaterThan(1);
    expect(results.every((value) => value > -1)).toBe(true);
  });
});
