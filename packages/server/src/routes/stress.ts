import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ApiErrorResponse, StressTestRequest, StressTestResponse } from '@finapp/shared';
import { stressTestRequestSchema } from '@finapp/shared';

import { runStressTest } from '../engine/stress';

const mapZodIssues = (error: ZodError): NonNullable<ApiErrorResponse['fieldErrors']> =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    issue: issue.message,
  }));

export const stressTestRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: StressTestRequest; Reply: StressTestResponse | ApiErrorResponse }>(
    '/stress-test',
    async (request, reply) => {
      try {
        const body = stressTestRequestSchema.parse(request.body);
        const result = await runStressTest(body.config, body.scenarios, {
          seed: body.seed,
          actualOverridesByMonth: body.actualOverridesByMonth,
          monthlyReturns: body.monthlyReturns,
          base: body.base,
        });

        return { result };
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            fieldErrors: mapZodIssues(error),
          });
        }

        app.log.error(error, 'stress route failed');
        return reply.code(500).send({
          code: 'COMPUTE_ERROR',
          message: 'Stress test failed unexpectedly',
        });
      }
    },
  );
};
