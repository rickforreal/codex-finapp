import type { MonthlyReturns, SimulationConfig, SinglePathResult } from '../domain/simulation';

export interface HealthResponse {
  status: 'ok';
}

export interface SimulateRequest {
  config: SimulationConfig;
  monthlyReturns?: MonthlyReturns[];
  seed?: number;
}

export interface SimulateResponse {
  result: SinglePathResult;
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
