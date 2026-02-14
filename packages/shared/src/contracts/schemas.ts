import { z } from 'zod';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  SimulationMode,
  WithdrawalStrategyType,
} from '../constants/enums';

const assetBalancesSchema = z
  .object({
    stocks: z.number().int().nonnegative(),
    bonds: z.number().int().nonnegative(),
    cash: z.number().int().nonnegative(),
  })
  .strict();

const spendingPhaseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    startYear: z.number().int().positive(),
    endYear: z.number().int().positive(),
    minMonthlySpend: z.number().int().nonnegative(),
    maxMonthlySpend: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => value.endYear >= value.startYear, {
    message: 'endYear must be greater than or equal to startYear',
    path: ['endYear'],
  })
  .refine((value) => value.maxMonthlySpend >= value.minMonthlySpend, {
    message: 'maxMonthlySpend must be greater than or equal to minMonthlySpend',
    path: ['maxMonthlySpend'],
  });

const returnAssumptionSchema = z
  .object({
    expectedReturn: z.number().min(-1).max(1),
    stdDev: z.number().min(0).max(1),
  })
  .strict();

const simpleCashflowEventSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    amount: z.number().int().nonnegative(),
  })
  .strict();

const simulationConfigSchema = z
  .object({
    mode: z.nativeEnum(AppMode),
    simulationMode: z.nativeEnum(SimulationMode),
    selectedHistoricalEra: z.string().min(1),
    coreParams: z
      .object({
        startingAge: z.number().int().min(1).max(120),
        withdrawalsStartAt: z.number().int().min(1).max(120),
        retirementStartDate: z
          .object({
            month: z.number().int().min(1).max(12),
            year: z.number().int().min(1900).max(3000),
          })
          .strict(),
        retirementDuration: z.number().int().min(1).max(100),
        inflationRate: z.number().min(0).max(0.2),
      })
      .strict(),
    portfolio: assetBalancesSchema,
    returnAssumptions: z
      .object({
        stocks: returnAssumptionSchema,
        bonds: returnAssumptionSchema,
        cash: returnAssumptionSchema,
      })
      .strict(),
    spendingPhases: z.array(spendingPhaseSchema).min(1),
    withdrawalStrategy: z.discriminatedUnion('type', [
      z
        .object({
          type: z.literal(WithdrawalStrategyType.ConstantDollar),
          params: z
            .object({
              initialWithdrawalRate: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.PercentOfPortfolio),
          params: z
            .object({
              annualWithdrawalRate: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.OneOverN),
          params: z.object({}).strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.Vpw),
          params: z
            .object({
              expectedRealReturn: z.number().min(-1).max(1),
              drawdownTarget: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.DynamicSwr),
          params: z
            .object({
              expectedRateOfReturn: z.number().min(-1).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.SensibleWithdrawals),
          params: z
            .object({
              baseWithdrawalRate: z.number().min(0).max(1),
              extrasWithdrawalRate: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.NinetyFivePercent),
          params: z
            .object({
              annualWithdrawalRate: z.number().min(0).max(1),
              minimumFloor: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.GuytonKlinger),
          params: z
            .object({
              initialWithdrawalRate: z.number().min(0).max(1),
              capitalPreservationTrigger: z.number().min(0).max(2),
              capitalPreservationCut: z.number().min(0).max(1),
              prosperityTrigger: z.number().min(0).max(2),
              prosperityRaise: z.number().min(0).max(1),
              guardrailsSunset: z.number().int().min(0).max(120),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.VanguardDynamic),
          params: z
            .object({
              annualWithdrawalRate: z.number().min(0).max(1),
              ceiling: z.number().min(0).max(1),
              floor: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.Endowment),
          params: z
            .object({
              spendingRate: z.number().min(0).max(1),
              smoothingWeight: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.HebelerAutopilot),
          params: z
            .object({
              initialWithdrawalRate: z.number().min(0).max(1),
              pmtExpectedReturn: z.number().min(-1).max(1),
              priorYearWeight: z.number().min(0).max(1),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          type: z.literal(WithdrawalStrategyType.CapeBased),
          params: z
            .object({
              baseWithdrawalRate: z.number().min(0).max(1),
              capeWeight: z.number().min(0).max(5),
              startingCape: z.number().positive().max(200),
            })
            .strict(),
        })
        .strict(),
    ]),
    drawdownStrategy: z
      .object({
        type: z.literal(DrawdownStrategyType.Bucket),
        bucketOrder: z.array(z.nativeEnum(AssetClass)).length(3),
        rebalancing: z
          .object({
            targetAllocation: z
              .object({
                stocks: z.number().min(0).max(1),
                bonds: z.number().min(0).max(1),
                cash: z.number().min(0).max(1),
              })
              .strict(),
            glidePathEnabled: z.boolean(),
            glidePath: z.array(
              z
                .object({
                  year: z.number().int().positive(),
                  allocation: z
                    .object({
                      stocks: z.number().min(0).max(1),
                      bonds: z.number().min(0).max(1),
                      cash: z.number().min(0).max(1),
                    })
                    .strict(),
                })
                .strict(),
            ),
          })
          .strict(),
      })
      .strict(),
    incomeEvents: z.array(simpleCashflowEventSchema),
    expenseEvents: z.array(simpleCashflowEventSchema),
  })
  .strict();

const monthlyReturnsSchema = z
  .object({
    stocks: z.number().min(-1).max(10),
    bonds: z.number().min(-1).max(10),
    cash: z.number().min(-1).max(10),
  })
  .strict();

export const simulateRequestSchema = z
  .object({
    config: simulationConfigSchema,
    monthlyReturns: z.array(monthlyReturnsSchema).optional(),
    seed: z.number().int().optional(),
  })
  .strict();
