import { afterEach, describe, expect, it, vi } from 'vitest';

import { SimulationMode, type StressScenario } from '@finapp/shared';

import { runStressTest } from '../../src/engine/stress';
import * as monteCarloNative from '../../src/engine/monteCarloNative';
import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from '../../src/engine/simulator';
import { createBaseConfig } from '../fixtures';

const ORIGINAL_SIM_ENGINE = process.env.FINAPP_SIM_ENGINE;

afterEach(() => {
  process.env.FINAPP_SIM_ENGINE = ORIGINAL_SIM_ENGINE;
  vi.restoreAllMocks();
});

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
        start: { month: 1, year: 2030 },
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
        start: { month: 1, year: 2030 },
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
        start: { month: 1, year: 2030 },
        params: { dropPct: -0.3 },
      },
    ];

    const result = await runStressTest(config, scenarios, {
      base: { result: base },
      monthlyReturns,
    });

    expect(result.scenarios[0]?.metrics.terminalDeltaVsBase).toBeLessThanOrEqual(0);
  });

  it('uses configured simulationRuns for monte carlo stress base and scenarios', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.simulationRuns = 7;
    const scenarios: StressScenario[] = [
      {
        id: 'mc-crash',
        label: 'MC Crash',
        type: 'stockCrash',
        start: { month: 1, year: 2030 },
        params: { dropPct: -0.3 },
      },
    ];

    const result = await runStressTest(config, scenarios, { seed: 33 });

    expect(result.base.monteCarlo?.simulationCount).toBe(7);
    expect(result.scenarios[0]?.monteCarlo?.simulationCount).toBe(7);
  });

  it('falls back to TS in stress manual flow when rust runtime errors', async () => {
    process.env.FINAPP_SIM_ENGINE = 'rust';
    vi.spyOn(monteCarloNative, 'runSinglePathRust').mockRejectedValue(new Error('forced stress manual failure'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    config.coreParams.portfolioEnd = { month: 1, year: 2030 + 2 };
    const scenarios: StressScenario[] = [
      {
        id: 'manual-crash',
        label: 'Manual Crash',
        type: 'stockCrash',
        start: { month: 1, year: 2030 },
        params: { dropPct: -0.2 },
      },
    ];

    const result = await runStressTest(config, scenarios, { seed: 21 });

    expect(result.scenarios[0]?.result.rows.length).toBe(24);
    const fallbackLog = warnSpy.mock.calls
      .map((call) => String(call[0]))
      .find((entry) => entry.includes('sim_rust_fallback_to_ts') && entry.includes('stress_manual'));
    expect(fallbackLog).toBeDefined();
  });

  it('falls back to TS in stress monte carlo flow when rust runtime errors', async () => {
    process.env.FINAPP_SIM_ENGINE = 'rust';
    vi.spyOn(monteCarloNative, 'runMonteCarloRust').mockRejectedValue(new Error('forced stress mc failure'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.simulationRuns = 24;
    config.coreParams.portfolioEnd = { month: 1, year: 2030 + 2 };
    const scenarios: StressScenario[] = [
      {
        id: 'mc-crash-fallback',
        label: 'MC Crash Fallback',
        type: 'stockCrash',
        start: { month: 1, year: 2030 },
        params: { dropPct: -0.3 },
      },
    ];

    const result = await runStressTest(config, scenarios, { seed: 13 });

    expect(result.base.monteCarlo?.simulationCount).toBe(24);
    expect(result.scenarios[0]?.monteCarlo?.simulationCount).toBe(24);
    const fallbackLog = warnSpy.mock.calls
      .map((call) => String(call[0]))
      .find((entry) => entry.includes('mc_rust_fallback_to_ts') && entry.includes('stress_mc'));
    expect(fallbackLog).toBeDefined();
  });
});
