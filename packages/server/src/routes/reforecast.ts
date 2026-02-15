import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ApiErrorResponse, ReforecastRequest, ReforecastResponse } from '@finapp/shared';
import { reforecastRequestSchema } from '@finapp/shared';

import { reforecastDeterministic } from '../engine/deterministic';

const mapZodIssues = (error: ZodError): NonNullable<ApiErrorResponse['fieldErrors']> =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    issue: issue.message,
  }));

export const reforecastRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ReforecastRequest; Reply: ReforecastResponse | ApiErrorResponse }>(
    '/reforecast',
    async (request, reply) => {
      try {
        const body = reforecastRequestSchema.parse(request.body);
        const result = reforecastDeterministic(body.config, body.actualOverridesByMonth);
        const editedMonths = Object.keys(body.actualOverridesByMonth)
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0);
        const lastEditedMonthIndex = editedMonths.length > 0 ? Math.max(...editedMonths) : null;

        return { result, lastEditedMonthIndex };
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            fieldErrors: mapZodIssues(error),
          });
        }
        app.log.error(error, 'reforecast route failed');
        return reply.code(500).send({
          code: 'COMPUTE_ERROR',
          message: 'Reforecast failed unexpectedly',
        });
      }
    },
  );
};
