import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { HistoricalEra, ReturnSource, SimulationMode, type SimulationConfig } from '@finapp/shared';

import type { MonteCarloExecutionResult, MonteCarloOptions } from './monteCarlo';
import { getHistoricalDataSummaryForSelection, getHistoricalMonthsForSelection } from './historicalData';

type NativeMonteCarloRequest = {
  configJson: string;
  optionsJson?: string;
  historicalMonthsJson?: string;
  historicalSummaryJson?: string;
};

type NativeMonteCarloResponse = {
  resultJson: string;
};

type NativeMonteCarloModule = {
  runMonteCarloJson: (request: NativeMonteCarloRequest) => NativeMonteCarloResponse;
};

const require = createRequire(import.meta.url);
const thisFilePath = fileURLToPath(import.meta.url);
let loadedNativeModule: NativeMonteCarloModule | null | undefined;

const loadNativeModule = (): NativeMonteCarloModule => {
  if (loadedNativeModule) {
    return loadedNativeModule;
  }

  if (loadedNativeModule === null) {
    throw new Error('Native Monte Carlo module previously failed to load');
  }

  const loadAttempts = [
    () => require('@finapp/native-mc') as NativeMonteCarloModule,
    () =>
      require(path.resolve(path.dirname(thisFilePath), '../../../native-mc')) as NativeMonteCarloModule,
  ];

  const errors: string[] = [];
  for (const attempt of loadAttempts) {
    try {
      loadedNativeModule = attempt();
      return loadedNativeModule;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  loadedNativeModule = null;
  throw new Error(`Failed to load native Monte Carlo module: ${errors.join(' | ')}`);
};

const sanitizeOptionsForNative = (options: MonteCarloOptions): Omit<MonteCarloOptions, 'transformReturns'> => {
  if (options.transformReturns) {
    throw new Error('Native Monte Carlo does not support transformReturns callback options');
  }

  return {
    runs: options.runs,
    seed: options.seed,
    actualOverridesByMonth: options.actualOverridesByMonth,
    inflationOverridesByYear: options.inflationOverridesByYear,
  };
};

export const runMonteCarloRust = async (
  config: SimulationConfig,
  options: MonteCarloOptions,
): Promise<MonteCarloExecutionResult> => {
  const returnsSource =
    config.returnsSource ??
    (config.simulationMode === SimulationMode.Manual ? ReturnSource.Manual : ReturnSource.Historical);
  const customRange =
    config.selectedHistoricalEra === HistoricalEra.Custom ? config.customHistoricalRange : null;
  const historicalMonths =
    returnsSource === ReturnSource.Historical
      ? await getHistoricalMonthsForSelection(config.selectedHistoricalEra, customRange)
      : [];
  const historicalSummary = await getHistoricalDataSummaryForSelection(config.selectedHistoricalEra, customRange);
  if (returnsSource === ReturnSource.Historical && historicalMonths.length === 0) {
    throw new Error('No historical data rows available for selected era');
  }

  const module = loadNativeModule();
  const payload: NativeMonteCarloRequest = {
    configJson: JSON.stringify(config),
    optionsJson: JSON.stringify(sanitizeOptionsForNative(options)),
    historicalMonthsJson: JSON.stringify(historicalMonths),
    historicalSummaryJson: JSON.stringify(historicalSummary),
  };

  const response = module.runMonteCarloJson(payload);
  if (!response || typeof response.resultJson !== 'string') {
    throw new Error('Native Monte Carlo returned malformed response payload');
  }

  try {
    return JSON.parse(response.resultJson) as MonteCarloExecutionResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse native Monte Carlo result JSON: ${message}`);
  }
};
