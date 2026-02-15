import { describe, expect, it } from 'vitest';

import { SimulationMode } from '@finapp/shared';

import { reforecastDeterministic } from '../../src/engine/deterministic';
import { createBaseConfig } from '../fixtures';

describe('reforecastDeterministic', () => {
  it('uses fixed monthly return formula with deterministic output', () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;

    const resultA = reforecastDeterministic(config, {});
    const resultB = reforecastDeterministic(config, {});

    expect(resultA.summary.terminalPortfolioValue).toBe(resultB.summary.terminalPortfolioValue);
    expect(resultA.rows).toHaveLength(config.coreParams.retirementDuration * 12);
  });

  it('locks edited month start balances and withdrawals', () => {
    const config = createBaseConfig();
    const result = reforecastDeterministic(config, {
      3: {
        startBalances: { stocks: 1_000_000, bonds: 500_000, cash: 100_000 },
        withdrawalsByAsset: { cash: 20_000, bonds: 10_000, stocks: 0 },
      },
    });

    const row = result.rows[2];
    expect(row?.startBalances.stocks).toBe(1_000_000);
    expect(row?.withdrawals.byAsset.cash).toBe(20_000);
    expect(row?.withdrawals.byAsset.bonds).toBe(10_000);
  });
});
