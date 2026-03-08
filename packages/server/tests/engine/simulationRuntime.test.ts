import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReturnSource, SimulationMode } from '@finapp/shared';

import { reforecastDeterministic } from '../../src/engine/deterministic';
import * as monteCarloNative from '../../src/engine/monteCarloNative';
import { runReforecast, runSinglePath } from '../../src/engine/simulationRuntime';
import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from '../../src/engine/simulator';
import { createBaseConfig } from '../fixtures';

const ORIGINAL_SIM_ENGINE = process.env.FINAPP_SIM_ENGINE;

afterEach(() => {
  process.env.FINAPP_SIM_ENGINE = ORIGINAL_SIM_ENGINE;
  vi.restoreAllMocks();
});

describe('simulationRuntime engine selector', () => {
  it('uses rust single-path engine and matches TS results', async () => {
    process.env.FINAPP_SIM_ENGINE = 'rust';
    const rustSpy = vi.spyOn(monteCarloNative, 'runSinglePathRust');

    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    config.returnsSource = ReturnSource.Manual;
    const returns = generateMonthlyReturnsFromAssumptions(config, 42);
    const overrides = {
      2: {
        startBalances: { stocks: 1_500_000, bonds: 300_000, cash: 120_000 },
      },
    };
    const inflationOverrides = { 2: 0.01 };

    const baseline = simulateRetirement(config, returns, overrides, inflationOverrides);
    rustSpy.mockResolvedValue(baseline);
    const result = await runSinglePath(config, returns, overrides, inflationOverrides);

    expect(rustSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(baseline);
  });

  it('uses rust reforecast engine and matches TS results', async () => {
    process.env.FINAPP_SIM_ENGINE = 'rust';
    const rustSpy = vi.spyOn(monteCarloNative, 'runReforecastRust');

    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    const overrides = {
      3: {
        startBalances: { stocks: 1_000_000, bonds: 500_000, cash: 150_000 },
        withdrawalsByAsset: { stocks: 50_000, bonds: 0, cash: 10_000 },
      },
    };

    const baseline = reforecastDeterministic(config, overrides);
    rustSpy.mockResolvedValue(baseline);
    const result = await runReforecast(config, overrides);

    expect(rustSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(baseline);
  });

  it('falls back to TS single-path when rust single-path execution fails', async () => {
    process.env.FINAPP_SIM_ENGINE = 'rust';
    vi.spyOn(monteCarloNative, 'runSinglePathRust').mockRejectedValue(new Error('forced single-path failure'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = createBaseConfig();
    config.simulationMode = SimulationMode.Manual;
    config.returnsSource = ReturnSource.Manual;
    const returns = generateMonthlyReturnsFromAssumptions(config, 7);
    const baseline = simulateRetirement(config, returns);
    const result = await runSinglePath(config, returns, {}, {}, 'simulate_manual');

    expect(result).toEqual(baseline);
    const fallbackLog = warnSpy.mock.calls
      .map((call) => String(call[0]))
      .find((entry) => entry.includes('sim_rust_fallback_to_ts') && entry.includes('simulate_manual'));
    expect(fallbackLog).toBeDefined();
  });

  it('falls back to TS reforecast when rust reforecast execution fails', async () => {
    process.env.FINAPP_SIM_ENGINE = 'rust';
    vi.spyOn(monteCarloNative, 'runReforecastRust').mockRejectedValue(new Error('forced reforecast failure'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = createBaseConfig();
    const overrides = {
      2: {
        startBalances: { stocks: 1_250_000, bonds: 350_000, cash: 90_000 },
      },
    };
    const baseline = reforecastDeterministic(config, overrides);
    const result = await runReforecast(config, overrides, 'reforecast');

    expect(result).toEqual(baseline);
    const fallbackLog = warnSpy.mock.calls
      .map((call) => String(call[0]))
      .find((entry) => entry.includes('sim_rust_fallback_to_ts') && entry.includes('reforecast'));
    expect(fallbackLog).toBeDefined();
  });
});
