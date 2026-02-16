import { z } from 'zod';

import {
  AppMode,
  AssetClass,
  DrawdownStrategyType,
  HistoricalEra,
  SimulationMode,
  ThemeId,
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

const eventDateSchema = z
  .object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(3000),
  })
  .strict();

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
    selectedHistoricalEra: z.nativeEnum(HistoricalEra),
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
          type: z.literal(WithdrawalStrategyType.DynamicSwrAdaptive),
          params: z
            .object({
              fallbackExpectedRateOfReturn: z.number().min(-1).max(1),
              lookbackMonths: z.number().int().min(6).max(60),
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
  .strict();

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
    startYear: z.number().int().positive(),
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
    const retirementDuration = value.config.coreParams.retirementDuration;
    value.scenarios.forEach((scenario, scenarioIndex) => {
      if (scenario.startYear > retirementDuration) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scenarios', scenarioIndex, 'startYear'],
          message: 'startYear must be within retirement duration',
        });
      }
      if (
        (scenario.type === 'prolongedBear' || scenario.type === 'highInflationSpike') &&
        scenario.startYear + scenario.params.durationYears - 1 > retirementDuration
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scenarios', scenarioIndex, 'params', 'durationYears'],
          message: 'scenario duration exceeds retirement horizon',
        });
      }
      if (
        scenario.type === 'custom' &&
        scenario.params.years.some((entry) => scenario.startYear + entry.yearOffset - 1 > retirementDuration)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scenarios', scenarioIndex, 'params', 'years'],
          message: 'custom scenario year offsets exceed retirement horizon',
        });
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
  })
  .strict();

export const themeDefinitionSchema = z
  .object({
    id: z.nativeEnum(ThemeId),
    name: z.string().min(1),
    description: z.string().min(1),
    version: z.string().min(1),
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
  })
  .strict();

export const themesResponseSchema = z
  .object({
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
    validationIssues: z.array(
      z
        .object({
          themeId: z.nativeEnum(ThemeId),
          tokenPath: z.string().min(1),
          severity: z.literal('warning'),
          message: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();
