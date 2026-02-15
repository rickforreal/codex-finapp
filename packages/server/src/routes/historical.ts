import type { FastifyPluginAsync } from 'fastify';

import { HistoricalEra, type HistoricalSummaryResponse } from '@finapp/shared';

import { getHistoricalDataSummaryForEra } from '../engine/historicalData';

type SummaryQuery = {
  era?: HistoricalEra;
};

export const historicalRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: SummaryQuery; Reply: HistoricalSummaryResponse }>(
    '/historical/summary',
    async (request) => {
      const era = request.query.era ?? HistoricalEra.FullHistory;
      const summary = await getHistoricalDataSummaryForEra(era);
      return { summary };
    },
  );
};
