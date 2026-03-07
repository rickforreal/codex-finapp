import { afterEach, describe, expect, it, vi } from 'vitest';

import { SimulationMode } from '@finapp/shared';

import { runMonteCarlo } from '../../src/engine/monteCarlo';
import * as monteCarloNative from '../../src/engine/monteCarloNative';
import { createBaseConfig } from '../fixtures';

const ORIGINAL_ENGINE = process.env.FINAPP_MC_ENGINE;
const ORIGINAL_SHADOW_COMPARE = process.env.FINAPP_MC_SHADOW_COMPARE;
const ORIGINAL_SHADOW_SAMPLE = process.env.FINAPP_MC_SHADOW_SAMPLE_RATE;

afterEach(() => {
  process.env.FINAPP_MC_ENGINE = ORIGINAL_ENGINE;
  process.env.FINAPP_MC_SHADOW_COMPARE = ORIGINAL_SHADOW_COMPARE;
  process.env.FINAPP_MC_SHADOW_SAMPLE_RATE = ORIGINAL_SHADOW_SAMPLE;
  vi.restoreAllMocks();
});

describe('runMonteCarlo runtime selector', () => {
  it('falls back to TS engine when rust engine fails to load', async () => {
    process.env.FINAPP_MC_ENGINE = 'rust';
    process.env.FINAPP_MC_SHADOW_COMPARE = '0';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(monteCarloNative, 'runMonteCarloRust').mockRejectedValue(new Error('forced rust failure'));
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const result = await runMonteCarlo(config, { runs: 64, seed: 123 });

    expect(result.monteCarlo.simulationCount).toBe(64);
    expect(warnSpy).toHaveBeenCalled();
    const fallbackLog = warnSpy.mock.calls
      .map((call) => String(call[0]))
      .find((entry) => entry.includes('mc_rust_fallback_to_ts'));
    expect(fallbackLog).toBeDefined();
  });

  it('preserves primary TS result when shadow compare is enabled', async () => {
    process.env.FINAPP_MC_ENGINE = 'ts';
    process.env.FINAPP_MC_SHADOW_COMPARE = '1';
    process.env.FINAPP_MC_SHADOW_SAMPLE_RATE = '1';

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const baseline = await runMonteCarlo(config, { runs: 80, seed: 42 });
    const withShadow = await runMonteCarlo(config, { runs: 80, seed: 42 });

    expect(withShadow.monteCarlo.probabilityOfSuccess).toBe(baseline.monteCarlo.probabilityOfSuccess);
    expect(withShadow.monteCarlo.percentileCurves.total.p50).toEqual(
      baseline.monteCarlo.percentileCurves.total.p50,
    );
  });
});
