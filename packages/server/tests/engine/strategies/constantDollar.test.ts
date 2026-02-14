import { describe, expect, it } from 'vitest';

import { calculateConstantDollarWithdrawal } from '../../../src/engine/strategies/constantDollar';

describe('ConstantDollar', () => {
  describe('calculateConstantDollarWithdrawal', () => {
    it('should return portfolio × rate in Year 1', () => {
      const annual = calculateConstantDollarWithdrawal({
        year: 1,
        initialPortfolioValue: 100_000_000,
        previousWithdrawal: 0,
        inflationRate: 0.03,
        params: { initialWithdrawalRate: 0.04 },
      });

      expect(annual).toBe(4_000_000);
    });

    it('should inflate previous withdrawal in Year 2+', () => {
      const y2 = calculateConstantDollarWithdrawal({
        year: 2,
        initialPortfolioValue: 100_000_000,
        previousWithdrawal: 4_000_000,
        inflationRate: 0.03,
        params: { initialWithdrawalRate: 0.04 },
      });

      expect(y2).toBe(4_120_000);
    });

    it('should compound inflation over five years', () => {
      let withdrawal = 4_000_000;

      for (let year = 2; year <= 5; year += 1) {
        withdrawal = calculateConstantDollarWithdrawal({
          year,
          initialPortfolioValue: 100_000_000,
          previousWithdrawal: withdrawal,
          inflationRate: 0.03,
          params: { initialWithdrawalRate: 0.04 },
        });
      }

      expect(withdrawal).toBe(4_502_035);
    });

    it('should return 0 when initial portfolio is 0', () => {
      const annual = calculateConstantDollarWithdrawal({
        year: 1,
        initialPortfolioValue: 0,
        previousWithdrawal: 0,
        inflationRate: 0.03,
        params: { initialWithdrawalRate: 0.04 },
      });

      expect(annual).toBe(0);
    });

    it('should support final year calculation using previous clamped value', () => {
      const annual = calculateConstantDollarWithdrawal({
        year: 30,
        initialPortfolioValue: 100_000_000,
        previousWithdrawal: 9_703_288,
        inflationRate: 0.03,
        params: { initialWithdrawalRate: 0.04 },
      });

      expect(annual).toBe(9_994_387);
    });
  });
});
