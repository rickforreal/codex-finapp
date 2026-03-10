import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  HistoricalEra,
  type ActualOverridesByMonth,
  type MonthlyReturns,
  type SimulationConfig,
  type SinglePathResult,
} from '@finapp/shared';

import type { MonteCarloExecutionResult, MonteCarloOptions } from './monteCarlo';
import { getHistoricalDataSummaryForSelection, getHistoricalMonthsForSelection } from './historicalData';
import { hasHistoricalReturnPhase, prepareReturnPhaseSampler } from './returnPhases';

type NativeMonteCarloRequest = {
  configJson: string;
  optionsJson?: string;
  historicalMonthsJson?: string;
  historicalMonthsByPhaseJson?: string;
  historicalSummaryJson?: string;
};

type NativeMonteCarloResponse = {
  resultJson: string;
};

type NativeSinglePathRequest = {
  configJson: string;
  monthlyReturnsJson: string;
  actualOverridesByMonthJson?: string;
  inflationOverridesByYearJson?: string;
};

type NativeSinglePathResponse = {
  resultJson: string;
};

type NativeReforecastRequest = {
  configJson: string;
  actualOverridesByMonthJson?: string;
  historicalMonthsJson?: string;
  historicalMonthsByPhaseJson?: string;
};

type NativeReforecastResponse = {
  resultJson: string;
};

type NativeMonteCarloModule = {
  runMonteCarloJson: (request: NativeMonteCarloRequest) => NativeMonteCarloResponse;
  runSinglePathJson: (request: NativeSinglePathRequest) => NativeSinglePathResponse;
  runReforecastJson: (request: NativeReforecastRequest) => NativeReforecastResponse;
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

const sanitizeOptionsForNative = (
  options: MonteCarloOptions,
): Omit<MonteCarloOptions, 'transformReturns' | 'flowTag'> => {
  if (options.transformReturns) {
    throw new Error('Native Monte Carlo does not support transformReturns callback options');
  }

  return {
    runs: options.runs,
    seed: options.seed,
    actualOverridesByMonth: options.actualOverridesByMonth,
    inflationOverridesByYear: options.inflationOverridesByYear,
    stressTransform: options.stressTransform,
  };
};

const parseNativeResultJson = <T>(resultJson: string, context: string): T => {
  try {
    return JSON.parse(resultJson) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse native ${context} result JSON: ${message}`);
  }
};

export const runMonteCarloRust = async (
  config: SimulationConfig,
  options: MonteCarloOptions,
): Promise<MonteCarloExecutionResult> => {
  const preparedReturns = await prepareReturnPhaseSampler(config);
  const hasHistoricalPhase = hasHistoricalReturnPhase(config);
  const customRange =
    config.selectedHistoricalEra === HistoricalEra.Custom ? config.customHistoricalRange : null;
  const historicalMonths =
    hasHistoricalPhase
      ? await getHistoricalMonthsForSelection(config.selectedHistoricalEra, customRange)
      : [];
  const historicalSummary = await getHistoricalDataSummaryForSelection(config.selectedHistoricalEra, customRange);
  if (hasHistoricalPhase && historicalMonths.length === 0 && Object.keys(preparedReturns.historicalPoolsByPhaseId).length === 0) {
    throw new Error('No historical data rows available for selected era');
  }

  const module = loadNativeModule();
  const payload: NativeMonteCarloRequest = {
    configJson: JSON.stringify(config),
    optionsJson: JSON.stringify(sanitizeOptionsForNative(options)),
    historicalMonthsJson: JSON.stringify(historicalMonths),
    historicalMonthsByPhaseJson: JSON.stringify(preparedReturns.historicalPoolsByPhaseId),
    historicalSummaryJson: JSON.stringify(historicalSummary),
  };

  const response = module.runMonteCarloJson(payload);
  if (!response || typeof response.resultJson !== 'string') {
    throw new Error('Native Monte Carlo returned malformed response payload');
  }

  return parseNativeResultJson<MonteCarloExecutionResult>(response.resultJson, 'Monte Carlo');
};

export const runSinglePathRust = async (
  config: SimulationConfig,
  monthlyReturns: MonthlyReturns[],
  actualOverridesByMonth: ActualOverridesByMonth = {},
  inflationOverridesByYear: Partial<Record<number, number>> = {},
): Promise<SinglePathResult> => {
  const module = loadNativeModule();
  const payload: NativeSinglePathRequest = {
    configJson: JSON.stringify(config),
    monthlyReturnsJson: JSON.stringify(monthlyReturns),
    actualOverridesByMonthJson: JSON.stringify(actualOverridesByMonth),
    inflationOverridesByYearJson: JSON.stringify(inflationOverridesByYear),
  };

  const response = module.runSinglePathJson(payload);
  if (!response || typeof response.resultJson !== 'string') {
    throw new Error('Native single-path simulation returned malformed response payload');
  }

  return parseNativeResultJson<SinglePathResult>(response.resultJson, 'single-path');
};

export const runReforecastRust = async (
  config: SimulationConfig,
  actualOverridesByMonth: ActualOverridesByMonth = {},
): Promise<SinglePathResult> => {
  const preparedReturns = await prepareReturnPhaseSampler(config);
  const hasHistoricalPhase = hasHistoricalReturnPhase(config);
  const customRange =
    config.selectedHistoricalEra === HistoricalEra.Custom ? config.customHistoricalRange : null;
  const historicalMonths =
    hasHistoricalPhase
      ? await getHistoricalMonthsForSelection(config.selectedHistoricalEra, customRange)
      : [];
  const module = loadNativeModule();
  const payload: NativeReforecastRequest = {
    configJson: JSON.stringify(config),
    actualOverridesByMonthJson: JSON.stringify(actualOverridesByMonth),
    historicalMonthsJson: JSON.stringify(historicalMonths),
    historicalMonthsByPhaseJson: JSON.stringify(preparedReturns.historicalPoolsByPhaseId),
  };

  const response = module.runReforecastJson(payload);
  if (!response || typeof response.resultJson !== 'string') {
    throw new Error('Native reforecast returned malformed response payload');
  }

  return parseNativeResultJson<SinglePathResult>(response.resultJson, 'reforecast');
};
