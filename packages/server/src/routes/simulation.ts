import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ApiErrorResponse, SimulateRequest, SimulateResponse } from '@finapp/shared';
import { simulateRequestSchema } from '@finapp/shared';

import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from '../engine/simulator';

const mapZodIssues = (error: ZodError): NonNullable<ApiErrorResponse['fieldErrors']> =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    issue: issue.message,
  }));

export const simulationRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: SimulateRequest; Reply: SimulateResponse | ApiErrorResponse }>(
    '/simulate',
    async (request, reply) => {
      try {
        const body = simulateRequestSchema.parse(request.body);
        const returns = body.monthlyReturns ?? generateMonthlyReturnsFromAssumptions(body.config, body.seed);
        const result = simulateRetirement(body.config, returns);

        return { result };
      } catch (error) {
        if (error instanceof ZodError) {
          return reply.code(400).send({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            fieldErrors: mapZodIssues(error),
          });
        }

        app.log.error(error, 'simulation route failed');
        return reply.code(500).send({
          code: 'COMPUTE_ERROR',
          message: 'Simulation failed unexpectedly',
        });
      }
    },
  );
};
