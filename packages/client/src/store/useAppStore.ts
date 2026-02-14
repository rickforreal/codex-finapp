import { create } from 'zustand';

import { SimulationMode, type SimulationResult } from '@finapp/shared';

import { collectionsInitialState } from './slices/collections';
import { coreParamsInitialState } from './slices/coreParams';
import { drawdownStrategyInitialState } from './slices/drawdownStrategy';
import { portfolioInitialState } from './slices/portfolio';
import { returnAssumptionsInitialState } from './slices/returnAssumptions';
import { simulationInitialState } from './slices/simulation';
import { uiInitialState } from './slices/ui';
import { withdrawalStrategyInitialState } from './slices/withdrawalStrategy';

type ChartDisplayMode = 'nominal' | 'real';
type TableGranularity = 'monthly' | 'annual';
type RunStatus = 'idle' | 'running' | 'complete' | 'error';
type ReforecastStatus = 'idle' | 'pending' | 'complete';

type AppStore = {
  mode: 'planning' | 'tracking';
  simulationMode: SimulationMode;
  selectedHistoricalEra: string;
  coreParams: {
    startingAge: number;
    withdrawalsStartAt: number;
    retirementStartDate: { month: number; year: number };
    retirementDuration: number;
    inflationRate: number;
  };
  portfolio: {
    stocks: number;
    bonds: number;
    cash: number;
  };
  returnAssumptions: {
    stocks: { expectedReturn: number; stdDev: number };
    bonds: { expectedReturn: number; stdDev: number };
    cash: { expectedReturn: number; stdDev: number };
  };
  spendingPhases: unknown[];
  withdrawalStrategy: {
    type: string;
    params: Record<string, unknown>;
  };
  drawdownStrategy: {
    type: 'bucket' | 'rebalancing';
    bucketOrder: string[];
    rebalancing: {
      targetAllocation: { stocks: number; bonds: number; cash: number };
      glidePathEnabled: boolean;
      glidePath: unknown[];
    };
  };
  incomeEvents: unknown[];
  expenseEvents: unknown[];
  stressScenarios: unknown[];
  actuals: Record<string, unknown>;
  simulationResults: {
    manual: SimulationResult | null;
    monteCarlo: SimulationResult | null;
    status: RunStatus;
    mcStale: boolean;
    reforecast: SimulationResult | null;
  };
  ui: {
    chartDisplayMode: ChartDisplayMode;
    chartBreakdownEnabled: boolean;
    tableGranularity: TableGranularity;
    tableAssetColumnsEnabled: boolean;
    tableSort: { column: string; direction: 'asc' | 'desc' } | null;
    chartZoom: { start: number; end: number } | null;
    reforecastStatus: ReforecastStatus;
  };
};

export const useAppStore = create<AppStore>(() => ({
  mode: 'planning',
  simulationMode: SimulationMode.Manual,
  selectedHistoricalEra: 'all',
  coreParams: coreParamsInitialState,
  portfolio: portfolioInitialState,
  returnAssumptions: returnAssumptionsInitialState,
  spendingPhases: collectionsInitialState.spendingPhases,
  withdrawalStrategy: withdrawalStrategyInitialState,
  drawdownStrategy: drawdownStrategyInitialState,
  incomeEvents: collectionsInitialState.incomeEvents,
  expenseEvents: collectionsInitialState.expenseEvents,
  stressScenarios: collectionsInitialState.stressScenarios,
  actuals: collectionsInitialState.actuals,
  simulationResults: simulationInitialState,
  ui: uiInitialState,
}));
