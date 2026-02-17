import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ApiErrorResponse, SimulateRequest, SimulateResponse } from '@finapp/shared';
import { SimulationMode, simulateRequestSchema } from '@finapp/shared';

import { runMonteCarlo } from '../engine/monteCarlo';
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
        if (body.config.simulationMode === SimulationMode.MonteCarlo) {
          const mc = await runMonteCarlo(body.config, {
            seed: body.seed,
            runs: 1000,
            actualOverridesByMonth: body.actualOverridesByMonth ?? {},
          });
          return {
            simulationMode: SimulationMode.MonteCarlo,
            seedUsed: mc.seedUsed,
            configSnapshot: {
              coreParams: body.config.coreParams,
              selectedHistoricalEra: body.config.selectedHistoricalEra,
            },
            result: mc.representativePath,
            monteCarlo: mc.monteCarlo,
          };
        }

        const returns = body.monthlyReturns ?? generateMonthlyReturnsFromAssumptions(body.config, body.seed);
        const result = simulateRetirement(body.config, returns, body.actualOverridesByMonth ?? {});

        return {
          simulationMode: SimulationMode.Manual,
          seedUsed: body.seed,
          configSnapshot: {
            coreParams: body.config.coreParams,
            selectedHistoricalEra: body.config.selectedHistoricalEra,
          },
          result,
        };
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
