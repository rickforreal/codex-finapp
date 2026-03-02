import type {
  ActualOverridesByMonth,
  HistoricalRange,
  HistoricalDataSummary,
  MonthlyReturns,
  MonteCarloResult,
  StressScenario,
  StressTestResult,
  SimulationConfig,
  SinglePathResult,
} from '../domain/simulation';
import type {
  ThemeCatalogItem,
  ThemeDefaultSelection,
  ThemeDefinition,
  ThemeFamilyCatalogItem,
  ThemeSlotCatalogItem,
  ThemeValidationIssue,
} from '../domain/theme';
import type { SimulationMode } from '../constants/enums';

export interface HealthResponse {
  status: 'ok';
}

export interface SimulateRequest {
  config: SimulationConfig;
  monthlyReturns?: MonthlyReturns[];
  actualOverridesByMonth?: ActualOverridesByMonth;
  seed?: number;
}

export interface SimulateResponse {
  simulationMode: SimulationMode;
  seedUsed?: number;
  configSnapshot?: SimulationConfig;
  result: SinglePathResult;
  monteCarlo?: MonteCarloResult;
}

export interface HistoricalSummaryResponse {
  summary: HistoricalDataSummary;
}

export interface HistoricalSummaryQuery {
  era: SimulationConfig['selectedHistoricalEra'];
  customHistoricalRange?: HistoricalRange;
}

export interface ThemesResponse {
  tokenModelVersion: ThemeDefinition['tokenModelVersion'];
  defaultSelection: ThemeDefaultSelection;
  variants: ThemeDefinition[];
  families: ThemeFamilyCatalogItem[];
  defaultThemeId: ThemeCatalogItem['id'];
  themes: ThemeDefinition[];
  catalog: ThemeCatalogItem[];
  slotCatalog: ThemeSlotCatalogItem[];
  validationIssues: ThemeValidationIssue[];
}

export interface ReforecastRequest {
  config: SimulationConfig;
  actualOverridesByMonth: ActualOverridesByMonth;
}

export interface ReforecastResponse {
  result: SinglePathResult;
  lastEditedMonthIndex: number | null;
}

export interface StressTestRequest {
  config: SimulationConfig;
  scenarios: StressScenario[];
  monthlyReturns?: MonthlyReturns[];
  base?: {
    result: SinglePathResult;
    monteCarlo?: MonteCarloResult;
  };
  actualOverridesByMonth?: ActualOverridesByMonth;
  seed?: number;
}

export interface StressTestResponse {
  result: StressTestResult;
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
