import { HistoricalEra } from './enums';

export type HistoricalEraDefinition = {
  key: HistoricalEra;
  label: string;
  startYear: number;
  endYear: number | null;
};

export const HISTORICAL_ERA_DEFINITIONS: HistoricalEraDefinition[] = [
  {
    key: HistoricalEra.FullHistory,
    label: 'Full History',
    startYear: 1926,
    endYear: null,
  },
  {
    key: HistoricalEra.DepressionEra,
    label: 'Depression Era',
    startYear: 1926,
    endYear: 1945,
  },
  {
    key: HistoricalEra.PostWarBoom,
    label: 'Post-War Boom',
    startYear: 1945,
    endYear: 1972,
  },
  {
    key: HistoricalEra.StagflationEra,
    label: 'Stagflation Era',
    startYear: 1966,
    endYear: 1982,
  },
  {
    key: HistoricalEra.OilCrisis,
    label: 'Oil Crisis',
    startYear: 1973,
    endYear: 1982,
  },
  {
    key: HistoricalEra.Post1980BullRun,
    label: 'Post-1980 Bull Run',
    startYear: 1980,
    endYear: null,
  },
  {
    key: HistoricalEra.LostDecade,
    label: 'Lost Decade',
    startYear: 2000,
    endYear: 2012,
  },
  {
    key: HistoricalEra.PostGfcRecovery,
    label: 'Post-GFC Recovery',
    startYear: 2009,
    endYear: null,
  },
];
