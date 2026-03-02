import type { FastifyPluginAsync } from 'fastify';

import { HistoricalEra, type HistoricalRange, type HistoricalSummaryResponse } from '@finapp/shared';

import { getHistoricalDataSummaryForSelection } from '../engine/historicalData';

type SummaryQuery = {
  era?: HistoricalEra;
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
};

export const historicalRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: SummaryQuery; Reply: HistoricalSummaryResponse }>(
    '/historical/summary',
    async (request) => {
      const era = request.query.era ?? HistoricalEra.FullHistory;
      const customRange: HistoricalRange | null =
        era === HistoricalEra.Custom
          ? {
              start: {
                month: Number(request.query.startMonth),
                year: Number(request.query.startYear),
              },
              end: {
                month: Number(request.query.endMonth),
                year: Number(request.query.endYear),
              },
            }
          : null;
      const summary = await getHistoricalDataSummaryForSelection(era, customRange);
      return { summary };
    },
  );
};
