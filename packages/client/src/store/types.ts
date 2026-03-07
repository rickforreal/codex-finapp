import {
  AppMode,
  SimulationMode,
  HistoricalEra,
  ReturnSource,
  ThemeFamilyId,
  ThemeAppearance,
  ThemeVariantId,
  ThemeId,
  type SimulationConfig,
  type SimulateResponse,
  type StressTestResult,
  type ThemeFamilyCatalogItem,
  type ThemeDefinition,
  type ThemeSlotCatalogItem,
  type ThemeValidationIssue,
  type ActualOverridesByMonth,
  type HistoricalDataSummary,
} from '@finapp/shared';

export type RunStatus = 'idle' | 'running' | 'complete' | 'error';
export type ThemeStatus = 'idle' | 'loading' | 'ready' | 'error';

export const COMPARE_SLOT_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;
export type CompareSlotId = (typeof COMPARE_SLOT_IDS)[number];

export interface WorkspaceSnapshot {
  coreParams: SimulationConfig['coreParams'];
  portfolio: SimulationConfig['portfolio'];
  returnAssumptions: SimulationConfig['returnAssumptions'];
  spendingPhases: SimulationConfig['spendingPhases'];
  withdrawalStrategy: SimulationConfig['withdrawalStrategy'];
  drawdownStrategy: SimulationConfig['drawdownStrategy'];
  incomeEvents: SimulationConfig['incomeEvents'];
  expenseEvents: SimulationConfig['expenseEvents'];
  actualOverridesByMonth: ActualOverridesByMonth;
  lastEditedMonthIndex: number | null;
  simulationResults: {
    manual: SimulateResponse | null;
    monteCarlo: SimulateResponse | null;
    reforecast: SimulateResponse | null;
    status: RunStatus;
    mcStale: boolean;
    errorMessage: string | null;
  };
  stress: {
    isExpanded: boolean;
    scenarios: SimulationConfig['stressScenarios'];
    result: StressTestResult | null;
    status: RunStatus;
    errorMessage: string | null;
  };
}

export interface SnapshotState {
  mode: AppMode;
  trackingInitialized: boolean;
  planningWorkspace: WorkspaceSnapshot | null;
  trackingWorkspace: WorkspaceSnapshot | null;
  simulationMode: SimulationMode;
  returnsSource: ReturnSource;
  simulationRuns: number;
  selectedHistoricalEra: HistoricalEra;
  customHistoricalRange: SimulationConfig['customHistoricalRange'];
  historicalData: {
    summary: HistoricalDataSummary | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
    errorMessage: string | null;
  };
  theme: {
    selectedThemeFamilyId: ThemeFamilyId;
    selectedAppearanceByFamily: Record<ThemeFamilyId, ThemeAppearance>;
    defaultThemeFamilyId: ThemeFamilyId;
    defaultAppearance: ThemeAppearance;
    activeVariantId: ThemeVariantId | null;
    variants: ThemeDefinition[];
    families: ThemeFamilyCatalogItem[];
    legacyDefaultThemeId: ThemeId;
    legacyThemes: ThemeDefinition[];
    legacyCatalog: any[];
    slotCatalog: ThemeSlotCatalogItem[];
    validationIssues: ThemeValidationIssue[];
    status: ThemeStatus;
    errorMessage: string | null;
  };
  ui: {
    chartDisplayMode: 'nominal' | 'real';
    chartBreakdownEnabled: boolean;
    tableGranularity: 'monthly' | 'annual';
    tableAssetColumnsEnabled: boolean;
    tableSpreadsheetMode: boolean;
    tableSort: { column: string; direction: 'asc' | 'desc' } | null;
    chartZoom: { start: number; end: number } | null;
    reforecastStatus: 'idle' | 'pending' | 'complete';
    collapsedSections: Record<string, boolean>;
  };
  compareWorkspace: {
    activeSlotId: CompareSlotId;
    baselineSlotId: CompareSlotId;
    slotOrder: CompareSlotId[];
    compareSync: any;
    slots: Partial<Record<CompareSlotId, WorkspaceSnapshot>>;
  };
}
