import { describe, expect, it } from 'vitest';

import { calculateGuytonKlingerWithdrawal } from '../../../src/engine/strategies/guytonKlinger';
import { createStrategyContext } from './context';

const params = {
  initialWithdrawalRate: 0.052,
  capitalPreservationTrigger: 0.2,
  capitalPreservationCut: 0.1,
  prosperityTrigger: 0.2,
  prosperityRaise: 0.1,
  guardrailsSunset: 15,
};

describe('GuytonKlinger', () => {
  it('should calculate Year 1 from initial portfolio × initial withdrawal rate', () => {
    const annual = calculateGuytonKlingerWithdrawal(
      createStrategyContext({ initialPortfolioValue: 100_000_000, year: 1 }),
      params,
    );

    expect(annual).toBe(5_200_000);
  });

  it('should freeze inflation after a negative return when withdrawal rate exceeds initial rate', () => {
    const annual = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 2,
        portfolioValue: 90_000_000,
        previousWithdrawal: 5_200_000,
        previousYearReturn: -0.1,
      }),
      params,
    );

    expect(annual).toBe(5_200_000);
  });

  it('should apply capital preservation cut when rate exceeds trigger before sunset', () => {
    const annual = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 5,
        portfolioValue: 70_000_000,
        previousWithdrawal: 5_600_000,
        previousYearReturn: 0.04,
      }),
      params,
    );

    expect(annual).toBe(5_191_200);
  });

  it('should apply prosperity raise when rate falls below prosperity trigger', () => {
    const annual = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 4,
        portfolioValue: 140_000_000,
        previousWithdrawal: 5_356_000,
        previousYearReturn: 0.27,
      }),
      params,
    );

    expect(annual).toBe(6_068_348);
  });

  it('should stop guardrail cut/raise checks after sunset year', () => {
    const annual = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 26,
        retirementYears: 40,
        portfolioValue: 70_000_000,
        previousWithdrawal: 5_600_000,
        previousYearReturn: 0.04,
      }),
      params,
    );

    expect(annual).toBe(5_768_000);
  });

  it('should reproduce the worked example sequence from the strategy reference', () => {
    const year1 = calculateGuytonKlingerWithdrawal(
      createStrategyContext({ initialPortfolioValue: 100_000_000, year: 1 }),
      params,
    );

    const year2 = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 2,
        portfolioValue: 90_000_000,
        previousWithdrawal: year1,
        previousYearReturn: -0.1,
      }),
      params,
    );

    const year3 = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 3,
        portfolioValue: 110_000_000,
        previousWithdrawal: year2,
        previousYearReturn: 0.22,
      }),
      params,
    );

    const year4 = calculateGuytonKlingerWithdrawal(
      createStrategyContext({
        year: 4,
        portfolioValue: 140_000_000,
        previousWithdrawal: year3,
        previousYearReturn: 0.27,
      }),
      params,
    );

    expect(year1).toBe(5_200_000);
    expect(year2).toBe(5_200_000);
    expect(year3).toBe(5_356_000);
    expect(year4).toBe(6_068_348);
  });
});
