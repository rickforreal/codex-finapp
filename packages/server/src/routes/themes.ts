import type { FastifyPluginAsync } from 'fastify';

import type { ApiErrorResponse, ThemesResponse } from '@finapp/shared';

import { getThemesResponse } from '../themes/registry';

export const themeRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: ThemesResponse | ApiErrorResponse }>(
    '/themes',
    async (_request, reply) => {
      try {
        return getThemesResponse();
      } catch (error) {
        app.log.error(error, 'themes route failed');
        return reply.status(500).send({
          code: 'COMPUTE_ERROR',
          message: 'Theme catalog failed unexpectedly',
        });
      }
    },
  );
};
