import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import type { ApiErrorResponse, SimulateRequest, SimulateResponse } from '@finapp/shared';
import { ReturnSource, SimulationMode, simulateRequestSchema } from '@finapp/shared';

import { runMonteCarlo } from '../engine/monteCarlo';
import {
  allManualReturnPhaseStdDevZero,
  hasHistoricalReturnPhase,
  prepareReturnPhaseSampler,
  sampleMonthlyReturnsForPreparedPhases,
} from '../engine/returnPhases';
import { runSinglePath } from '../engine/simulationRuntime';

const mapZodIssues = (error: ZodError): NonNullable<ApiErrorResponse['fieldErrors']> =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    issue: issue.message,
  }));

const effectiveRunConfig = (config: SimulateRequest['config']): {
  simulationMode: SimulationMode;
  simulationRuns: number;
  returnsSource: ReturnSource;
} => {
  const requestedRuns = Math.max(1, Math.min(Math.round(config.simulationRuns ?? 1000), 10000));
  const inferredSource = hasHistoricalReturnPhase(config)
    ? ReturnSource.Historical
    : ReturnSource.Manual;
  const forceSingleRun = inferredSource === ReturnSource.Manual && allManualReturnPhaseStdDevZero(config);
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
            flowTag: 'simulate_mc',
          });
          return {
            simulationMode: SimulationMode.MonteCarlo,
            seedUsed: mc.seedUsed,
            configSnapshot: normalizedConfig,
            result: mc.representativePath,
            monteCarlo: mc.monteCarlo,
          };
        }

        const returns =
          body.monthlyReturns ??
          sampleMonthlyReturnsForPreparedPhases(
            await prepareReturnPhaseSampler(normalizedConfig),
            body.seed,
          );
        const result = await runSinglePath(
          normalizedConfig,
          returns,
          body.actualOverridesByMonth ?? {},
          {},
          'simulate_manual',
        );

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
