import type { FastifyPluginAsync } from 'fastify';

import type { HealthResponse } from '@finapp/shared';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>('/health', async () => ({ status: 'ok' }));
};
