import {
  HistoricalEra,
  ReturnSource,
  type HistoricalRange,
  type MonthlyReturns,
  type ReturnAssumptions,
  type ReturnPhase,
  type SimulationConfig,
} from '@finapp/shared';

import { getHistoricalMonthsForSelection, type HistoricalMonth } from './historicalData';
import { monthsBetween } from './helpers/dates';
import { createSeededRandom, generateRandomMonthlyReturn } from './helpers/returns';

type ResolvedReturnPhase =
  | {
      id: string;
      source: ReturnSource.Manual;
      startMonthIndex: number;
      endMonthIndexExclusive: number;
      returnAssumptions: ReturnAssumptions;
    }
  | {
      id: string;
      source: ReturnSource.Historical;
      startMonthIndex: number;
      endMonthIndexExclusive: number;
      selectedHistoricalEra: HistoricalEra;
      customHistoricalRange: HistoricalRange | null;
      blockBootstrapEnabled: boolean;
      blockBootstrapLength: number;
    };

export type PreparedReturnPhaseSampler = {
  durationMonths: number;
  phases: ResolvedReturnPhase[];
  historicalPoolsByPhaseId: Record<string, HistoricalMonth[]>;
};

const cloneReturnAssumptions = (value: ReturnAssumptions): ReturnAssumptions => ({
  stocks: { ...value.stocks },
  bonds: { ...value.bonds },
  cash: { ...value.cash },
});

const cloneHistoricalRange = (value: HistoricalRange | null): HistoricalRange | null =>
  value === null
    ? null
    : {
        start: { ...value.start },
        end: { ...value.end },
      };

const resolveLegacyReturnSource = (config: SimulationConfig): ReturnSource =>
  config.returnsSource ??
  (config.simulationMode === 'manual' ? ReturnSource.Manual : ReturnSource.Historical);

const legacyReturnPhase = (config: SimulationConfig): ReturnPhase => {
  const source = resolveLegacyReturnSource(config);
  if (source === ReturnSource.Manual) {
    return {
      id: 'return-phase-1',
      start: { ...config.coreParams.portfolioStart },
      end: { ...config.coreParams.portfolioEnd },
      source,
      returnAssumptions: cloneReturnAssumptions(config.returnAssumptions),
    };
  }

  return {
    id: 'return-phase-1',
    start: { ...config.coreParams.portfolioStart },
    end: { ...config.coreParams.portfolioEnd },
    source,
    selectedHistoricalEra: config.selectedHistoricalEra,
    customHistoricalRange: cloneHistoricalRange(config.customHistoricalRange),
    blockBootstrapEnabled: config.blockBootstrapEnabled,
    blockBootstrapLength: config.blockBootstrapLength,
  };
};

export const getReturnPhases = (config: SimulationConfig): ReturnPhase[] => {
  if (Array.isArray(config.returnPhases) && config.returnPhases.length > 0) {
    return config.returnPhases.map((phase) => {
      if (phase.source === ReturnSource.Manual) {
        return {
          ...phase,
          start: { ...phase.start },
          end: { ...phase.end },
          returnAssumptions: cloneReturnAssumptions(phase.returnAssumptions),
        };
      }
      return {
        ...phase,
        start: { ...phase.start },
        end: { ...phase.end },
        customHistoricalRange: cloneHistoricalRange(phase.customHistoricalRange),
      };
    });
  }

  return [legacyReturnPhase(config)];
};

const resolvePhaseTimeline = (config: SimulationConfig): ResolvedReturnPhase[] => {
  const phases = getReturnPhases(config);
  const portfolioStart = config.coreParams.portfolioStart;
  const durationMonths = monthsBetween(portfolioStart, config.coreParams.portfolioEnd);

  return phases
    .map((phase) => {
      const startMonthIndex = Math.max(0, monthsBetween(portfolioStart, phase.start));
      const endMonthIndexExclusive = Math.min(durationMonths, monthsBetween(portfolioStart, phase.end));
      if (phase.source === ReturnSource.Manual) {
        return {
          id: phase.id,
          source: phase.source,
          startMonthIndex,
          endMonthIndexExclusive,
          returnAssumptions: cloneReturnAssumptions(phase.returnAssumptions),
        } satisfies ResolvedReturnPhase;
      }
      return {
        id: phase.id,
        source: phase.source,
        startMonthIndex,
        endMonthIndexExclusive,
        selectedHistoricalEra: phase.selectedHistoricalEra,
        customHistoricalRange: cloneHistoricalRange(phase.customHistoricalRange),
        blockBootstrapEnabled: phase.blockBootstrapEnabled,
        blockBootstrapLength: phase.blockBootstrapLength,
      } satisfies ResolvedReturnPhase;
    })
    .filter((phase) => phase.endMonthIndexExclusive > phase.startMonthIndex)
    .sort((left, right) => left.startMonthIndex - right.startMonthIndex);
};

const sampleManualPhase = (
  target: MonthlyReturns[],
  phase: Extract<ResolvedReturnPhase, { source: ReturnSource.Manual }>,
  random: () => number,
): void => {
  for (let monthIndex = phase.startMonthIndex; monthIndex < phase.endMonthIndexExclusive; monthIndex += 1) {
    target[monthIndex] = {
      stocks: generateRandomMonthlyReturn(
        phase.returnAssumptions.stocks.expectedReturn,
        phase.returnAssumptions.stocks.stdDev,
        random,
      ),
      bonds: generateRandomMonthlyReturn(
        phase.returnAssumptions.bonds.expectedReturn,
        phase.returnAssumptions.bonds.stdDev,
        random,
      ),
      cash: generateRandomMonthlyReturn(
        phase.returnAssumptions.cash.expectedReturn,
        phase.returnAssumptions.cash.stdDev,
        random,
      ),
    };
  }
};

const sampleHistoricalPhase = (
  target: MonthlyReturns[],
  phase: Extract<ResolvedReturnPhase, { source: ReturnSource.Historical }>,
  random: () => number,
  pool: HistoricalMonth[],
): void => {
  const poolSize = pool.length;
  if (poolSize === 0) {
    throw new Error(`No historical data rows available for return phase ${phase.id}`);
  }

  if (!phase.blockBootstrapEnabled) {
    for (let monthIndex = phase.startMonthIndex; monthIndex < phase.endMonthIndexExclusive; monthIndex += 1) {
      const sampled = pool[Math.floor(random() * poolSize)] ?? pool[poolSize - 1];
      target[monthIndex] = sampled?.returns ?? { stocks: 0, bonds: 0, cash: 0 };
    }
    return;
  }

  let monthIndex = phase.startMonthIndex;
  while (monthIndex < phase.endMonthIndexExclusive) {
    const blockStart = Math.floor(random() * poolSize);
    const remaining = phase.endMonthIndexExclusive - monthIndex;
    const take = Math.min(phase.blockBootstrapLength, remaining);
    for (let offset = 0; offset < take; offset += 1) {
      const sampled = pool[(blockStart + offset) % poolSize];
      target[monthIndex + offset] = sampled?.returns ?? { stocks: 0, bonds: 0, cash: 0 };
    }
    monthIndex += take;
  }
};

export const prepareReturnPhaseSampler = async (
  config: SimulationConfig,
): Promise<PreparedReturnPhaseSampler> => {
  const durationMonths = monthsBetween(config.coreParams.portfolioStart, config.coreParams.portfolioEnd);
  const phases = resolvePhaseTimeline(config);
  const historicalPoolsByPhaseId: Record<string, HistoricalMonth[]> = {};

  await Promise.all(
    phases
      .filter((phase): phase is Extract<ResolvedReturnPhase, { source: ReturnSource.Historical }> => phase.source === ReturnSource.Historical)
      .map(async (phase) => {
        const pool = await getHistoricalMonthsForSelection(
          phase.selectedHistoricalEra,
          phase.customHistoricalRange,
        );
        historicalPoolsByPhaseId[phase.id] = pool;
      }),
  );

  return {
    durationMonths,
    phases,
    historicalPoolsByPhaseId,
  };
};

export const sampleMonthlyReturnsForPreparedPhases = (
  prepared: PreparedReturnPhaseSampler,
  seed?: number,
): MonthlyReturns[] => {
  const random = seed === undefined ? Math.random : createSeededRandom(seed);
  const series: MonthlyReturns[] = Array.from({ length: prepared.durationMonths }, () => ({
    stocks: 0,
    bonds: 0,
    cash: 0,
  }));

  for (const phase of prepared.phases) {
    if (phase.source === ReturnSource.Manual) {
      sampleManualPhase(series, phase, random);
      continue;
    }
    const pool = prepared.historicalPoolsByPhaseId[phase.id] ?? [];
    sampleHistoricalPhase(series, phase, random, pool);
  }

  return series;
};

export const allManualReturnPhaseStdDevZero = (config: SimulationConfig): boolean => {
  const phases = getReturnPhases(config);
  if (phases.length === 0) {
    return false;
  }
  return phases.every((phase) =>
    phase.source === ReturnSource.Manual
      ? phase.returnAssumptions.stocks.stdDev <= 0 &&
        phase.returnAssumptions.bonds.stdDev <= 0 &&
        phase.returnAssumptions.cash.stdDev <= 0
      : false,
  );
};

export const hasHistoricalReturnPhase = (config: SimulationConfig): boolean =>
  getReturnPhases(config).some((phase) => phase.source === ReturnSource.Historical);
