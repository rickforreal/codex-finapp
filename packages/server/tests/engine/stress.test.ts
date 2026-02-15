import { describe, expect, it } from 'vitest';

import { SimulationMode, type StressScenario } from '@finapp/shared';

import { runStressTest } from '../../src/engine/stress';
import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from '../../src/engine/simulator';
import { createBaseConfig } from '../fixtures';

describe('runStressTest', () => {
  it('matches base exactly for a no-shock scenario with same seed', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    const seed = 123;
    const baseReturns = generateMonthlyReturnsFromAssumptions(config, seed);
    const baseResult = simulateRetirement(config, baseReturns);
    const scenarios: StressScenario[] = [
      {
        id: 'no-shock',
        label: 'No Shock',
        type: 'stockCrash',
        startYear: 1,
        params: { dropPct: 0 },
      },
    ];

    const result = await runStressTest(config, scenarios, { seed, base: { result: baseResult } });

    expect(result.scenarios[0]?.result.summary.terminalPortfolioValue).toBe(
      baseResult.summary.terminalPortfolioValue,
    );
    expect(result.scenarios[0]?.result.rows).toEqual(baseResult.rows);
  });

  it('produces worse terminal outcome for an early stock crash', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    const seed = 42;
    const scenarios: StressScenario[] = [
      {
        id: 'crash',
        label: 'Crash',
        type: 'stockCrash',
        startYear: 1,
        params: { dropPct: -0.3 },
      },
    ];

    const result = await runStressTest(config, scenarios, { seed });
    const baseTerminal = result.base.result.summary.terminalPortfolioValue;
    const stressedTerminal = result.scenarios[0]?.result.summary.terminalPortfolioValue ?? 0;

    expect(stressedTerminal).toBeLessThan(baseTerminal);
  });

  it('uses provided monthly returns path for stress comparison', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    const seed = 99;
    const monthlyReturns = generateMonthlyReturnsFromAssumptions(config, seed);
    const base = simulateRetirement(config, monthlyReturns);
    const scenarios: StressScenario[] = [
      {
        id: 'crash',
        label: 'Crash',
        type: 'stockCrash',
        startYear: 1,
        params: { dropPct: -0.3 },
      },
    ];

    const result = await runStressTest(config, scenarios, {
      base: { result: base },
      monthlyReturns,
    });

    expect(result.scenarios[0]?.metrics.terminalDeltaVsBase).toBeLessThanOrEqual(0);
  });
});
