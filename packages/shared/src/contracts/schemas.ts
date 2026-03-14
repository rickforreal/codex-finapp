import { z } from 'zod';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
  ReturnSource,
  ThemeAppearance,
  ThemeFamilyId,
  SimulationMode,
  ThemeId,
  ThemeVariantId,
  WithdrawalStrategyType,
} from '../constants/enums';

const assetBalancesSchema = z
  .object({
    stocks: z.number().int().nonnegative(),
    bonds: z.number().int().nonnegative(),
    cash: z.number().int().nonnegative(),
  })
  .strict();

const eventDateSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(3000),
  })
  .strict();

const compareMonthYear = (
  left: { month: number; year: number },
  right: { month: number; year: number },
): number => {
  if (left.year !== right.year) {
    return left.year - right.year;
  }
  return left.month - right.month;
};

const spendingPhaseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    start: eventDateSchema,
    end: eventDateSchema,
    minMonthlySpend: z.number().int().nonnegative().optional(),
    maxMonthlySpend: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((value) => compareMonthYear(value.end, value.start) >= 0, {
    message: 'end must be greater than or equal to start',
    path: ['end'],
  })
  .refine(
    (value) => {
      if (value.minMonthlySpend !== undefined && value.maxMonthlySpend !== undefined) {
        return value.maxMonthlySpend >= value.minMonthlySpend;
      }
      return true;
    },
    {
      message: 'maxMonthlySpend must be greater than or equal to minMonthlySpend',
      path: ['maxMonthlySpend'],
    },
  );

const returnAssumptionSchema = z
  .object({
    expectedReturn: z.number().min(-1).max(1),
    stdDev: z.number().min(0).max(1),
  })
  .strict();

const returnAssumptionsSchema = z
  .object({
    stocks: returnAssumptionSchema,
    bonds: returnAssumptionSchema,
    cash: returnAssumptionSchema,
  })
  .strict();

const defaultReturnAssumptions = {
  stocks: { expectedReturn: 0.08, stdDev: 0.15 },
  bonds: { expectedReturn: 0.05, stdDev: 0.06 },
  cash: { expectedReturn: 0.03, stdDev: 0.01 },
} as const;

const cloneMonthYear = (value: { month: number; year: number }) => ({
  month: value.month,
  year: value.year,
});

const cloneHistoricalRange = (
  value: { start: { month: number; year: number }; end: { month: number; year: number } } | null,
) =>
  value === null
    ? null
    : {
        start: cloneMonthYear(value.start),
        end: cloneMonthYear(value.end),
      };

const cloneReturnAssumptions = (value: ReturnAssumptionsValue) => ({
  stocks: { ...value.stocks },
  bonds: { ...value.bonds },
  cash: { ...value.cash },
});

type MonthYearValue = { month: number; year: number };
type HistoricalRangeValue = { start: MonthYearValue; end: MonthYearValue };
type ReturnAssumptionsValue = z.infer<typeof returnAssumptionsSchema>;
type NormalizedReturnPhaseValue =
  | {
      id: string;
      start: MonthYearValue;
      end: MonthYearValue;
      source: ReturnSource.Manual;
      returnAssumptions: ReturnAssumptionsValue;
    }
  | {
      id: string;
      start: MonthYearValue;
      end: MonthYearValue;
      source: ReturnSource.Historical;
      selectedHistoricalEra: HistoricalEra;
      customHistoricalRange: HistoricalRangeValue | null;
      blockBootstrapEnabled: boolean;
      blockBootstrapLength: number;
    };
type ReturnPhaseNormalizationInput = {
  coreParams: { portfolioStart: MonthYearValue; portfolioEnd: MonthYearValue };
  simulationMode: SimulationMode;
  returnsSource?: ReturnSource;
  returnAssumptions?: ReturnAssumptionsValue;
  selectedHistoricalEra?: HistoricalEra;
  customHistoricalRange?: HistoricalRangeValue | null;
  blockBootstrapEnabled?: boolean;
  blockBootstrapLength?: number;
  returnPhases?: Array<Record<string, unknown>>;
};
type ReturnPhaseNormalizationOutput<T extends ReturnPhaseNormalizationInput> = Omit<
  T,
  | 'returnsSource'
  | 'returnAssumptions'
  | 'selectedHistoricalEra'
  | 'customHistoricalRange'
  | 'blockBootstrapEnabled'
  | 'blockBootstrapLength'
  | 'returnPhases'
> & {
  returnsSource: ReturnSource;
  returnAssumptions: ReturnAssumptionsValue;
  selectedHistoricalEra: HistoricalEra;
  customHistoricalRange: HistoricalRangeValue | null;
  blockBootstrapEnabled: boolean;
  blockBootstrapLength: number;
  returnPhases: NormalizedReturnPhaseValue[];
};

const simpleCashflowEventSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    amount: z.number().int().nonnegative(),
  })
  .strict();

const historicalRangeSchema = z
  .object({
    start: eventDateSchema,
    end: eventDateSchema,
  })
  .strict();

const manualReturnPhaseSchema = z
  .object({
    id: z.string().min(1),
    start: eventDateSchema,
    end: eventDateSchema,
    source: z.literal(ReturnSource.Manual),
    returnAssumptions: returnAssumptionsSchema,
  })
  .strict();

const historicalReturnPhaseSchema = z
  .object({
    id: z.string().min(1),
    start: eventDateSchema,
    end: eventDateSchema,
    source: z.literal(ReturnSource.Historical),
    selectedHistoricalEra: z.nativeEnum(HistoricalEra),
    customHistoricalRange: historicalRangeSchema.nullable(),
    blockBootstrapEnabled: z.boolean(),
    blockBootstrapLength: z.number().int().min(3).max(36),
  })
  .strict();

const returnPhaseSchema = z.discriminatedUnion('source', [
  manualReturnPhaseSchema,
  historicalReturnPhaseSchema,
]);

const resolveReturnSource = (
  simulationMode: SimulationMode,
  returnsSource?: ReturnSource,
): ReturnSource => {
  if (returnsSource !== undefined) {
    return returnsSource;
  }
  return simulationMode === SimulationMode.Manual
    ? ReturnSource.Manual
    : ReturnSource.Historical;
};

const normalizeReturnPhaseConfig = <
  T extends ReturnPhaseNormalizationInput & Record<string, unknown>,
>(
  value: T,
): ReturnPhaseNormalizationOutput<T> => {
  const simulationMode = value.simulationMode as SimulationMode;
  const returnsSource = value.returnsSource as ReturnSource | undefined;
  const effectiveSource = resolveReturnSource(simulationMode, returnsSource);
  const normalizedReturnAssumptions = cloneReturnAssumptions(
    (value.returnAssumptions as ReturnAssumptionsValue | undefined) ??
      defaultReturnAssumptions,
  );
  const selectedHistoricalEra =
    (value.selectedHistoricalEra as HistoricalEra | undefined) ??
    HistoricalEra.FullHistory;
  const customHistoricalRange = cloneHistoricalRange(
    (value.customHistoricalRange as {
      start: { month: number; year: number };
      end: { month: number; year: number };
    } | null | undefined) ?? null,
  );
  const blockBootstrapEnabled =
    (value.blockBootstrapEnabled as boolean | undefined) ?? false;
  const blockBootstrapLength =
    (value.blockBootstrapLength as number | undefined) ?? 12;
  const coreParams = value.coreParams as { portfolioStart: MonthYearValue; portfolioEnd: MonthYearValue };
  const returnPhasesInput = Array.isArray(value.returnPhases)
    ? (value.returnPhases as Array<Record<string, unknown>>)
    : undefined;

  const normalizedReturnPhases: NormalizedReturnPhaseValue[] =
    returnPhasesInput && returnPhasesInput.length > 0
      ? returnPhasesInput.map((phase) => {
          const phaseRecord = phase as Record<string, unknown> & {
            id: string;
            source: ReturnSource;
            start: MonthYearValue;
            end: MonthYearValue;
          };
          if (phaseRecord.source === ReturnSource.Manual) {
            return {
              id: phaseRecord.id,
              source: ReturnSource.Manual,
              start: cloneMonthYear(phaseRecord.start),
              end: cloneMonthYear(phaseRecord.end),
              returnAssumptions: cloneReturnAssumptions(
                (phaseRecord.returnAssumptions as ReturnAssumptionsValue | undefined) ??
                  normalizedReturnAssumptions,
              ),
            };
          }
          return {
            id: phaseRecord.id,
            source: ReturnSource.Historical,
            start: cloneMonthYear(phaseRecord.start),
            end: cloneMonthYear(phaseRecord.end),
            selectedHistoricalEra:
              (phaseRecord.selectedHistoricalEra as HistoricalEra | undefined) ??
              selectedHistoricalEra,
            customHistoricalRange: cloneHistoricalRange(
              (phaseRecord.customHistoricalRange as HistoricalRangeValue | null | undefined) ??
                null,
            ),
            blockBootstrapEnabled:
              (phaseRecord.blockBootstrapEnabled as boolean | undefined) ??
              blockBootstrapEnabled,
            blockBootstrapLength:
              (phaseRecord.blockBootstrapLength as number | undefined) ?? blockBootstrapLength,
          };
        })
      : [
          effectiveSource === ReturnSource.Manual
            ? {
                id: 'return-phase-1',
                start: cloneMonthYear(coreParams.portfolioStart),
                end: cloneMonthYear(coreParams.portfolioEnd),
                source: ReturnSource.Manual,
                returnAssumptions: cloneReturnAssumptions(normalizedReturnAssumptions),
              }
            : {
                id: 'return-phase-1',
                start: cloneMonthYear(coreParams.portfolioStart),
                end: cloneMonthYear(coreParams.portfolioEnd),
                source: ReturnSource.Historical,
                selectedHistoricalEra,
                customHistoricalRange: cloneHistoricalRange(customHistoricalRange),
                blockBootstrapEnabled,
                blockBootstrapLength,
              },
        ];

  const firstManualPhase = normalizedReturnPhases.find(
    (phase) => phase.source === ReturnSource.Manual,
  );
  const firstHistoricalPhase = normalizedReturnPhases.find(
    (phase) => phase.source === ReturnSource.Historical,
  );

  return {
    ...value,
    returnsSource: effectiveSource,
    returnAssumptions: firstManualPhase
      ? cloneReturnAssumptions(
          (firstManualPhase.returnAssumptions as typeof defaultReturnAssumptions) ??
            normalizedReturnAssumptions,
        )
      : cloneReturnAssumptions(normalizedReturnAssumptions),
    selectedHistoricalEra:
      (firstHistoricalPhase?.selectedHistoricalEra as HistoricalEra | undefined) ??
      selectedHistoricalEra,
    customHistoricalRange: firstHistoricalPhase
      ? cloneHistoricalRange(
          (firstHistoricalPhase.customHistoricalRange as {
            start: { month: number; year: number };
            end: { month: number; year: number };
          } | null | undefined) ?? null,
        )
      : cloneHistoricalRange(customHistoricalRange),
    blockBootstrapEnabled:
      (firstHistoricalPhase?.blockBootstrapEnabled as boolean | undefined) ??
      blockBootstrapEnabled,
    blockBootstrapLength:
      (firstHistoricalPhase?.blockBootstrapLength as number | undefined) ??
      blockBootstrapLength,
    returnPhases: normalizedReturnPhases,
  } as ReturnPhaseNormalizationOutput<T>;
};

const eventFrequencySchema = z.enum(['monthly', 'quarterly', 'annual', 'oneTime']);

const allocationSchema = z
  .object({
    stocks: z.number().min(0).max(1),
    bonds: z.number().min(0).max(1),
    cash: z.number().min(0).max(1),
  })
  .strict();

const allocationSumsToOne = (allocation: { stocks: number; bonds: number; cash: number }): boolean =>
  Math.abs(allocation.stocks + allocation.bonds + allocation.cash - 1) < 0.000001;

const incomeEventSchema = z
  .object({
    ...simpleCashflowEventSchema.shape,
    depositTo: z.nativeEnum(AssetClass),
    start: eventDateSchema,
    end: z.union([eventDateSchema, z.literal('endOfRetirement')]),
    frequency: eventFrequencySchema,
    inflationAdjusted: z.boolean(),
  })
  .strict()
  .refine(
    (event) =>
      event.frequency === 'oneTime'
        ? true
        : event.end === 'endOfRetirement'
          ? true
          : (event.end.year > event.start.year ||
              (event.end.year === event.start.year && event.end.month >= event.start.month)),
    {
      message: 'end must be greater than or equal to start for recurring events',
      path: ['end'],
    },
  );

const expenseEventSchema = z
  .object({
    ...simpleCashflowEventSchema.shape,
    sourceFrom: z.union([z.nativeEnum(AssetClass), z.literal('follow-drawdown')]),
    start: eventDateSchema,
    end: z.union([eventDateSchema, z.literal('endOfRetirement')]),
    frequency: z.enum(['monthly', 'annual', 'oneTime']),
    inflationAdjusted: z.boolean(),
  })
  .strict()
  .refine(
    (event) =>
      event.frequency === 'oneTime'
        ? true
        : event.end === 'endOfRetirement'
          ? true
          : (event.end.year > event.start.year ||
              (event.end.year === event.start.year && event.end.month >= event.start.month)),
    {
      message: 'end must be greater than or equal to start for recurring events',
      path: ['end'],
    },
  );

const simulationConfigSchema = z
  .object({
    mode: z.nativeEnum(AppMode),
    simulationMode: z.nativeEnum(SimulationMode),
    returnsSource: z.nativeEnum(ReturnSource).optional(),
    simulationRuns: z.number().int().min(1).max(10000).optional().default(1000),
    selectedHistoricalEra: z.nativeEnum(HistoricalEra).optional(),
    customHistoricalRange: historicalRangeSchema.nullable().optional(),
    blockBootstrapEnabled: z.boolean().optional(),
    blockBootstrapLength: z.number().int().min(3).max(36).optional(),
    coreParams: z
      .object({
        birthDate: eventDateSchema,
        portfolioStart: eventDateSchema,
        portfolioEnd: eventDateSchema,
        inflationRate: z.number().min(0).max(0.2),
      })
      .strict()
      .refine((data) => compareMonthYear(data.portfolioStart, data.birthDate) >= 0, {
        message: 'portfolioStart must be on or after birthDate',
        path: ['portfolioStart'],
      })
      .refine((data) => compareMonthYear(data.portfolioEnd, data.portfolioStart) > 0, {
        message: 'portfolioEnd must be strictly after portfolioStart',
        path: ['portfolioEnd'],
      }),
    portfolio: assetBalancesSchema,
    returnAssumptions: returnAssumptionsSchema.optional(),
    returnPhases: z.array(returnPhaseSchema).min(1).max(8).optional(),
    spendingPhases: z.array(spendingPhaseSchema).max(8),
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
          type: z.literal(WithdrawalStrategyType.DynamicSwrAdaptive),
          params: z
            .object({
              fallbackExpectedRateOfReturn: z.number().min(-1).max(1),
              lookbackMonths: z.number().int().min(6).max(60),
              smoothingEnabled: z.boolean(),
              smoothingBlend: z.number().min(0).max(0.95),
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
    drawdownStrategy: z.discriminatedUnion('type', [
      z
        .object({
          type: z.literal(DrawdownStrategyType.Bucket),
          bucketOrder: z.array(z.nativeEnum(AssetClass)).length(3),
        })
        .strict(),
      z
        .object({
          type: z.literal(DrawdownStrategyType.Rebalancing),
          rebalancing: z
            .object({
              targetAllocation: allocationSchema.refine(allocationSumsToOne, {
                message: 'target allocation must sum to 1',
              }),
              glidePathEnabled: z.boolean(),
              glidePath: z.array(
                z
                  .object({
                    year: z.number().int().positive(),
                    allocation: allocationSchema.refine(allocationSumsToOne, {
                      message: 'glide path allocation must sum to 1',
                    }),
                  })
                  .strict(),
              ),
            })
            .strict()
            .refine(
              (value) => (value.glidePathEnabled ? value.glidePath.length >= 2 : true),
              { message: 'at least two glide path waypoints are required when enabled', path: ['glidePath'] },
            ),
        })
        .strict(),
    ]),
    incomeEvents: z.array(incomeEventSchema),
    expenseEvents: z.array(expenseEventSchema),
  })
  .strict()
  .transform((value) => normalizeReturnPhaseConfig(value))
  .superRefine((rawValue, ctx) => {
    const value = rawValue as ReturnPhaseNormalizationOutput<ReturnPhaseNormalizationInput>;
    if (
      value.selectedHistoricalEra === HistoricalEra.Custom &&
      value.customHistoricalRange === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'customHistoricalRange is required when selectedHistoricalEra is custom',
        path: ['customHistoricalRange'],
      });
    }
    if (
      value.customHistoricalRange !== null &&
      compareMonthYear(value.customHistoricalRange.start, value.customHistoricalRange.end) > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'customHistoricalRange.start must be less than or equal to customHistoricalRange.end',
        path: ['customHistoricalRange', 'end'],
      });
    }
    if (!Array.isArray(value.returnPhases) || value.returnPhases.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'returnPhases must include at least one phase',
        path: ['returnPhases'],
      });
      return;
    }

    value.returnPhases.forEach((phase, index) => {
      if (compareMonthYear(phase.start, phase.end) >= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'phase end must be strictly after phase start',
          path: ['returnPhases', index, 'end'],
        });
      }
      if (
        phase.source === ReturnSource.Historical &&
        phase.selectedHistoricalEra === HistoricalEra.Custom &&
        phase.customHistoricalRange === null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'customHistoricalRange is required when selectedHistoricalEra is custom',
          path: ['returnPhases', index, 'customHistoricalRange'],
        });
      }
      if (
        phase.source === ReturnSource.Historical &&
        phase.customHistoricalRange !== null &&
        compareMonthYear(
          phase.customHistoricalRange.start,
          phase.customHistoricalRange.end,
        ) > 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'customHistoricalRange.start must be less than or equal to customHistoricalRange.end',
          path: ['returnPhases', index, 'customHistoricalRange', 'end'],
        });
      }
      if (index > 0) {
        const previousPhase = value.returnPhases[index - 1];
        if (!previousPhase) {
          return;
        }
        if (compareMonthYear(phase.start, previousPhase.start) < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'return phases must be ordered by start date',
            path: ['returnPhases', index, 'start'],
          });
        }
        if (compareMonthYear(phase.start, previousPhase.end) !== 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'return phases must be contiguous with no gaps or overlaps',
            path: ['returnPhases', index, 'start'],
          });
        }
      }
    });

    const firstPhase = value.returnPhases[0];
    const lastPhase = value.returnPhases[value.returnPhases.length - 1];
    if (!firstPhase || !lastPhase) {
      return;
    }
    if (compareMonthYear(firstPhase.start, value.coreParams.portfolioStart) !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'first return phase must start at portfolioStart',
        path: ['returnPhases', 0, 'start'],
      });
    }
    if (compareMonthYear(lastPhase.end, value.coreParams.portfolioEnd) !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'last return phase must end at portfolioEnd',
        path: ['returnPhases', value.returnPhases.length - 1, 'end'],
      });
    }
  });

const monthlyReturnsSchema = z
  .object({
    stocks: z.number().min(-1).max(10),
    bonds: z.number().min(-1).max(10),
    cash: z.number().min(-1).max(10),
  })
  .strict();

const partialAssetBalancesSchema = z
  .object({
    stocks: z.number().int().nonnegative().optional(),
    bonds: z.number().int().nonnegative().optional(),
    cash: z.number().int().nonnegative().optional(),
  })
  .strict();

const actualMonthOverrideSchema = z
  .object({
    startBalances: partialAssetBalancesSchema.optional(),
    withdrawalsByAsset: partialAssetBalancesSchema.optional(),
    incomeTotal: z.number().int().nonnegative().optional(),
    expenseTotal: z.number().int().nonnegative().optional(),
  })
  .strict();

export const simulateRequestSchema = z
  .object({
    config: simulationConfigSchema,
    monthlyReturns: z.array(monthlyReturnsSchema).optional(),
    actualOverridesByMonth: z.record(z.string(), actualMonthOverrideSchema).optional(),
    seed: z.number().int().optional(),
  })
  .strict();

export const reforecastRequestSchema = z
  .object({
    config: simulationConfigSchema,
    actualOverridesByMonth: z.record(z.string(), actualMonthOverrideSchema),
  })
  .strict();

const stressScenarioBaseSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(24),
    start: eventDateSchema,
  })
  .strict();

const stressScenarioSchema = z.discriminatedUnion('type', [
  z
    .object({
      ...stressScenarioBaseSchema.shape,
      type: z.literal('stockCrash'),
      params: z
        .object({
          dropPct: z.number().min(-0.8).max(0),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...stressScenarioBaseSchema.shape,
      type: z.literal('bondCrash'),
      params: z
        .object({
          dropPct: z.number().min(-0.4).max(0),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...stressScenarioBaseSchema.shape,
      type: z.literal('broadMarketCrash'),
      params: z
        .object({
          stockDropPct: z.number().min(-0.8).max(0),
          bondDropPct: z.number().min(-0.4).max(0),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...stressScenarioBaseSchema.shape,
      type: z.literal('prolongedBear'),
      params: z
        .object({
          durationYears: z.number().int().min(1).max(10),
          stockAnnualReturn: z.number().min(-0.2).max(0.05),
          bondAnnualReturn: z.number().min(-0.1).max(0.03),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...stressScenarioBaseSchema.shape,
      type: z.literal('highInflationSpike'),
      params: z
        .object({
          durationYears: z.number().int().min(1).max(10),
          inflationRate: z.number().min(0.03).max(0.2),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...stressScenarioBaseSchema.shape,
      type: z.literal('custom'),
      params: z
        .object({
          years: z
            .array(
              z
                .object({
                  yearOffset: z.number().int().positive(),
                  stocksAnnualReturn: z.number().min(-1).max(1),
                  bondsAnnualReturn: z.number().min(-1).max(1),
                  cashAnnualReturn: z.number().min(-1).max(1),
                })
                .strict(),
            )
            .min(0)
            .max(5),
        })
        .strict(),
    })
    .strict(),
]);

export const stressTestRequestSchema = z
  .object({
    config: simulationConfigSchema,
    scenarios: z.array(stressScenarioSchema).min(1).max(4),
    monthlyReturns: z.array(monthlyReturnsSchema).optional(),
    base: z
      .object({
        result: z.any(),
        monteCarlo: z.any().optional(),
      })
      .optional(),
    actualOverridesByMonth: z.record(z.string(), actualMonthOverrideSchema).optional(),
    seed: z.number().int().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const portfolioStart = value.config.coreParams.portfolioStart;
    const portfolioEnd = value.config.coreParams.portfolioEnd;
    
    value.scenarios.forEach((scenario, scenarioIndex) => {
      if (compareMonthYear(scenario.start, portfolioStart) < 0 || compareMonthYear(scenario.start, portfolioEnd) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scenarios', scenarioIndex, 'start'],
          message: 'start date must be within portfolio horizon',
        });
      }
      if (
        (scenario.type === 'prolongedBear' || scenario.type === 'highInflationSpike')
      ) {
        const scenarioEndYear = scenario.start.year + scenario.params.durationYears - 1;
        const scenarioEnd = { month: scenario.start.month, year: scenarioEndYear };
        if (compareMonthYear(scenarioEnd, portfolioEnd) > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenarios', scenarioIndex, 'params', 'durationYears'],
            message: 'scenario duration exceeds portfolio horizon',
          });
        }
      }
      if (scenario.type === 'custom') {
        const hasExceedingYear = scenario.params.years.some((entry) => {
          const entryEnd = { month: scenario.start.month, year: scenario.start.year + entry.yearOffset - 1 };
          return compareMonthYear(entryEnd, portfolioEnd) > 0;
        });
        if (hasExceedingYear) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['scenarios', scenarioIndex, 'params', 'years'],
            message: 'custom scenario year offsets exceed portfolio horizon',
          });
        }
      }
    });
  });

const themeColorTokensSchema = z
  .object({
    neutral50: z.string().min(1),
    neutral100: z.string().min(1),
    neutral200: z.string().min(1),
    neutral300: z.string().min(1),
    neutral400: z.string().min(1),
    neutral500: z.string().min(1),
    neutral600: z.string().min(1),
    neutral700: z.string().min(1),
    neutral800: z.string().min(1),
    neutral900: z.string().min(1),
    appBackground: z.string().min(1),
    surfacePrimary: z.string().min(1),
    surfaceSecondary: z.string().min(1),
    surfaceMuted: z.string().min(1),
    overlay: z.string().min(1),
    borderSubtle: z.string().min(1),
    borderPrimary: z.string().min(1),
    borderStrong: z.string().min(1),
    textPrimary: z.string().min(1),
    textSecondary: z.string().min(1),
    textMuted: z.string().min(1),
    textInverse: z.string().min(1),
    focusRing: z.string().min(1),
    interactivePrimary: z.string().min(1),
    interactivePrimaryHover: z.string().min(1),
    interactiveSecondary: z.string().min(1),
    interactiveSecondaryHover: z.string().min(1),
    positive: z.string().min(1),
    negative: z.string().min(1),
    warning: z.string().min(1),
    info: z.string().min(1),
    chartGrid: z.string().min(1),
    chartAxis: z.string().min(1),
    chartText: z.string().min(1),
    chartTooltipBackground: z.string().min(1),
    chartTooltipBorder: z.string().min(1),
    chartTooltipText: z.string().min(1),
    brandNavy: z.string().min(1),
    brandBlue: z.string().min(1),
    assetStocks: z.string().min(1),
    assetBonds: z.string().min(1),
    assetCash: z.string().min(1),
    mcBandOuter: z.string().min(1),
    mcBandInner: z.string().min(1),
    stressBase: z.string().min(1),
    stressScenarioA: z.string().min(1),
    stressScenarioB: z.string().min(1),
    stressScenarioC: z.string().min(1),
    stressScenarioD: z.string().min(1),
  })
  .strict();

const themeTypographySchema = z
  .object({
    fontSans: z.enum(['ibmPlexSans', 'ibmPlexMono', 'systemSans', 'systemMono', 'atkinsonHyperlegible']),
    fontMono: z.enum(['ibmPlexSans', 'ibmPlexMono', 'systemSans', 'systemMono', 'atkinsonHyperlegible']),
    fontSizeXs: z.string().min(1),
    fontSizeSm: z.string().min(1),
    fontSizeMd: z.string().min(1),
    fontSizeLg: z.string().min(1),
    fontSizeXl: z.string().min(1),
    fontWeightRegular: z.number().int().positive(),
    fontWeightMedium: z.number().int().positive(),
    fontWeightSemibold: z.number().int().positive(),
    letterSpacingWide: z.string().min(1),
  })
  .strict();

const themeSpacingSchema = z
  .object({
    xs: z.string().min(1),
    sm: z.string().min(1),
    md: z.string().min(1),
    lg: z.string().min(1),
    xl: z.string().min(1),
    xxl: z.string().min(1),
  })
  .strict();

const themeRadiusSchema = z
  .object({
    sm: z.string().min(1),
    md: z.string().min(1),
    lg: z.string().min(1),
    xl: z.string().min(1),
    pill: z.string().min(1),
  })
  .strict();

const themeBorderSchema = z
  .object({
    widthThin: z.string().min(1),
    widthBase: z.string().min(1),
    widthThick: z.string().min(1),
  })
  .strict();

const themeShadowSchema = z
  .object({
    panel: z.string().min(1),
    popover: z.string().min(1),
    focus: z.string().min(1),
  })
  .strict();

const themeMotionSchema = z
  .object({
    durationFastMs: z.number().int().nonnegative(),
    durationNormalMs: z.number().int().nonnegative(),
    durationSlowMs: z.number().int().nonnegative(),
    easingStandard: z.string().min(1),
  })
  .strict();

const themeStateSchema = z
  .object({
    editedCellBackground: z.string().min(1),
    preservedRowBackground: z.string().min(1),
    staleBackground: z.string().min(1),
    staleText: z.string().min(1),
    selectedCellOutline: z.string().min(1),
  })
  .strict();

const themeChartSchema = z
  .object({
    manualLine: z.string().min(1),
    manualAreaTop: z.string().min(1),
    manualAreaBottom: z.string().min(1),
    mcMedianLine: z.string().min(1),
    mcBandOuter: z.string().min(1),
    mcBandInner: z.string().min(1),
    compareSlotA: z.string().min(1),
    compareSlotB: z.string().min(1),
    compareSlotC: z.string().min(1),
    compareSlotD: z.string().min(1),
    compareSlotE: z.string().min(1),
    compareSlotF: z.string().min(1),
    compareSlotG: z.string().min(1),
    compareSlotH: z.string().min(1),
  })
  .strict();

const themeTokenRefSchema = z
  .object({
    ref: z.string().min(1),
  })
  .strict();

const themeTokenRefOrValueSchema = z.union([themeTokenRefSchema, z.string().min(1)]);

const themeTokenMapSchema = z.record(z.string().min(1), themeTokenRefOrValueSchema);

export const themeDefinitionSchema = z
  .object({
    id: z.nativeEnum(ThemeVariantId),
    familyId: z.nativeEnum(ThemeFamilyId),
    appearance: z.nativeEnum(ThemeAppearance),
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.string().min(1),
    tokenModelVersion: z.literal('2'),
    isHighContrast: z.boolean(),
    defaultForApp: z.boolean(),
    tokens: z
      .object({
        color: themeColorTokensSchema,
        typography: themeTypographySchema,
        spacing: themeSpacingSchema,
        radius: themeRadiusSchema,
        border: themeBorderSchema,
        shadow: themeShadowSchema,
        motion: themeMotionSchema,
        state: themeStateSchema,
        chart: themeChartSchema,
      })
      .strict(),
    semantic: themeTokenMapSchema,
    slots: themeTokenMapSchema,
    overrides: themeTokenMapSchema.optional(),
  })
  .strict();

const themeSlotCatalogItemSchema = z
  .object({
    path: z.string().min(1),
    category: z.string().min(1),
    description: z.string().min(1),
    fallback: themeTokenRefOrValueSchema,
  })
  .strict();

export const themesResponseSchema = z
  .object({
    tokenModelVersion: z.literal('2'),
    defaultSelection: z
      .object({
        familyId: z.nativeEnum(ThemeFamilyId),
        appearance: z.nativeEnum(ThemeAppearance),
      })
      .strict(),
    variants: z.array(themeDefinitionSchema).min(1),
    families: z.array(
      z
        .object({
          id: z.nativeEnum(ThemeFamilyId),
          name: z.string().min(1),
          description: z.string().min(1),
          version: z.string().min(1),
          isHighContrast: z.boolean(),
          defaultForApp: z.boolean(),
          supportedAppearances: z.array(z.nativeEnum(ThemeAppearance)).min(1),
        })
        .strict(),
    ),
    defaultThemeId: z.nativeEnum(ThemeId),
    themes: z.array(themeDefinitionSchema).min(1),
    catalog: z.array(
      z
        .object({
          id: z.nativeEnum(ThemeId),
          name: z.string().min(1),
          description: z.string().min(1),
          version: z.string().min(1),
          isHighContrast: z.boolean(),
          defaultForApp: z.boolean(),
        })
        .strict(),
    ),
    slotCatalog: z.array(themeSlotCatalogItemSchema),
    validationIssues: z.array(
      z
        .object({
          themeId: z.nativeEnum(ThemeVariantId),
          tokenPath: z.string().min(1),
          severity: z.literal('warning'),
          message: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();
