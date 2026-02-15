import type {
  HistoricalDataSummary,
  MonthlyReturns,
  MonteCarloResult,
  SimulationConfig,
  SinglePathResult,
} from '../domain/simulation';
import type { SimulationMode } from '../constants/enums';

export interface HealthResponse {
  status: 'ok';
}

export interface SimulateRequest {
  config: SimulationConfig;
  monthlyReturns?: MonthlyReturns[];
  seed?: number;
}

export interface SimulateResponse {
  simulationMode: SimulationMode;
  seedUsed?: number;
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;
}

export interface HistoricalSummaryResponse {
  summary: HistoricalDataSummary;
}

export interface ApiFieldError {
  path: string;
  issue: string;
}

export interface ApiErrorResponse {
  code: 'VALIDATION_ERROR' | 'COMPUTE_ERROR';
  message: string;
  fieldErrors?: ApiFieldError[];
}
