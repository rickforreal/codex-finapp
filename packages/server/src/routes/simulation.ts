import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ApiErrorResponse, ReturnAssumptions, SimulateRequest, SimulateResponse } from '@finapp/shared';
import { ReturnSource, SimulationMode, simulateRequestSchema } from '@finapp/shared';

import { runMonteCarlo } from '../engine/monteCarlo';
import { generateMonthlyReturnsFromAssumptions, simulateRetirement } from '../engine/simulator';

const mapZodIssues = (error: ZodError): NonNullable<ApiErrorResponse['fieldErrors']> =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    issue: issue.message,
  }));

const allStdDevZero = (assumptions: ReturnAssumptions): boolean =>
  assumptions.stocks.stdDev <= 0 &&
  assumptions.bonds.stdDev <= 0 &&
  assumptions.cash.stdDev <= 0;

const effectiveRunConfig = (config: SimulateRequest['config']): {
  simulationMode: SimulationMode;
  simulationRuns: number;
  returnsSource: ReturnSource;
} => {
  const requestedRuns = Math.max(1, Math.min(Math.round(config.simulationRuns ?? 1000), 10000));
  const inferredSource =
    config.returnsSource ??
    (config.simulationMode === SimulationMode.Manual
      ? ReturnSource.Manual
      : ReturnSource.Historical);
  const forceSingleRun = inferredSource === ReturnSource.Manual && allStdDevZero(config.returnAssumptions);
  const simulationRuns = forceSingleRun ? 1 : requestedRuns;
  return {
    simulationMode: simulationRuns > 1 ? SimulationMode.MonteCarlo : SimulationMode.Manual,
    simulationRuns,
    returnsSource: inferredSource,
  };
};

export const simulationRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: SimulateRequest; Reply: SimulateResponse | ApiErrorResponse }>(
    '/simulate',
    async (request, reply) => {
      try {
        const body = simulateRequestSchema.parse(request.body);
        const runConfig = effectiveRunConfig(body.config);
        const normalizedConfig = {
          ...body.config,
          simulationMode: runConfig.simulationMode,
          simulationRuns: runConfig.simulationRuns,
          returnsSource: runConfig.returnsSource,
        };
        if (runConfig.simulationMode === SimulationMode.MonteCarlo) {
          const mc = await runMonteCarlo(normalizedConfig, {
            seed: body.seed,
            runs: runConfig.simulationRuns,
            actualOverridesByMonth: body.actualOverridesByMonth ?? {},
          });
          return {
            simulationMode: SimulationMode.MonteCarlo,
            seedUsed: mc.seedUsed,
            configSnapshot: normalizedConfig,
            result: mc.representativePath,
            monteCarlo: mc.monteCarlo,
          };
        }

        const returns = body.monthlyReturns ?? generateMonthlyReturnsFromAssumptions(normalizedConfig, body.seed);
        const result = simulateRetirement(normalizedConfig, returns, body.actualOverridesByMonth ?? {});

        return {
          simulationMode: SimulationMode.Manual,
          seedUsed: body.seed,
          configSnapshot: normalizedConfig,
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
