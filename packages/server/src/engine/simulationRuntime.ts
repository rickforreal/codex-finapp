import type { ActualOverridesByMonth, MonthlyReturns, SimulationConfig, SinglePathResult } from '@finapp/shared';

import { reforecastDeterministic } from './deterministic';
import { runReforecastRust, runSinglePathRust } from './monteCarloNative';
import { simulateRetirement } from './simulator';

const resolveSimulationEnginePreference = (): 'ts' | 'rust' => {
  const value = (process.env.FINAPP_SIM_ENGINE ?? 'rust').trim().toLowerCase();
  return value === 'rust' ? 'rust' : 'ts';
};

const logEngineEvent = (event: string, details: Record<string, unknown>): void => {
  console.warn(
    JSON.stringify({
      event,
      engine: 'simulation',
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
};

export const runSinglePath = async (
  config: SimulationConfig,
  monthlyReturns: MonthlyReturns[],
  actualOverridesByMonth: ActualOverridesByMonth = {},
  inflationOverridesByYear: Partial<Record<number, number>> = {},
  flowTag = 'simulate_manual',
): Promise<SinglePathResult> => {
  const preferred = resolveSimulationEnginePreference();
  if (preferred === 'rust') {
    try {
      return await runSinglePathRust(config, monthlyReturns, actualOverridesByMonth, inflationOverridesByYear);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logEngineEvent('sim_rust_fallback_to_ts', { flowTag, message });
    }
  }

  return simulateRetirement(config, monthlyReturns, actualOverridesByMonth, inflationOverridesByYear);
};

export const runReforecast = async (
  config: SimulationConfig,
  actualOverridesByMonth: ActualOverridesByMonth = {},
  flowTag = 'reforecast',
): Promise<SinglePathResult> => {
  const preferred = resolveSimulationEnginePreference();
  if (preferred === 'rust') {
    try {
      return await runReforecastRust(config, actualOverridesByMonth);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logEngineEvent('sim_rust_fallback_to_ts', { flowTag, message });
    }
  }

  return reforecastDeterministic(config, actualOverridesByMonth);
};
