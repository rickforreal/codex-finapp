import cors from '@fastify/cors';
import fastify from 'fastify';

import { healthRoutes } from './routes/health';
import { historicalRoutes } from './routes/historical';
import { simulationRoutes } from './routes/simulation';

export const createApp = () => {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  app.register(cors, { origin: true });
  app.register(healthRoutes, { prefix: '/api/v1' });
  app.register(historicalRoutes, { prefix: '/api/v1' });
  app.register(simulationRoutes, { prefix: '/api/v1' });

  return app;
};
