import { describe, expect, it } from 'vitest';

import { calculateHebelerAutopilotWithdrawal } from '../../../src/engine/strategies/hebelerAutopilot';
import { createStrategyContext } from './context';

describe('HebelerAutopilot', () => {
  const params = {
    initialWithdrawalRate: 0.04,
    pmtExpectedReturn: 0.03,
    priorYearWeight: 0.6,
  };

  it('should calculate Year 1 from initial portfolio × initial withdrawal rate', () => {
    const annual = calculateHebelerAutopilotWithdrawal(
      createStrategyContext({ initialPortfolioValue: 100_000_000, year: 1 }),
      params,
    );

    expect(annual).toBe(4_000_000);
  });

  it('should blend prior inflated withdrawal and PMT component in later years', () => {
    const annual = calculateHebelerAutopilotWithdrawal(
      createStrategyContext({ year: 2, remainingYears: 29, previousWithdrawal: 4_000_000 }),
      params,
    );

    expect(annual).toBe(4_619_124);
  });

  it('should follow pure PMT nominal conversion when prior-year weight is zero', () => {
    const annual = calculateHebelerAutopilotWithdrawal(
      createStrategyContext({ year: 3, remainingYears: 28, previousWithdrawal: 4_000_000 }),
      { ...params, priorYearWeight: 0 },
    );

    expect(annual).toBe(5_653_879);
  });
});
