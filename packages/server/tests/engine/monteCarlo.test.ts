import { describe, expect, it } from 'vitest';

import { HistoricalEra, SimulationMode, type StressScenario, WithdrawalStrategyType } from '@finapp/shared';

import { runMonteCarlo } from '../../src/engine/monteCarlo';
import { returnsWithStressTransform } from '../../src/engine/stressTransforms';
import { createBaseConfig } from '../fixtures';

describe('runMonteCarlo', () => {
  it('is deterministic with the same seed', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.selectedHistoricalEra = HistoricalEra.FullHistory;

    const a = await runMonteCarlo(config, { runs: 200, seed: 123 });
    const b = await runMonteCarlo(config, { runs: 200, seed: 123 });

    expect(a.monteCarlo.probabilityOfSuccess).toBe(b.monteCarlo.probabilityOfSuccess);
    expect(a.monteCarlo.percentileCurves.total.p50).toEqual(b.monteCarlo.percentileCurves.total.p50);
    expect(a.monteCarlo.percentileCurves.stocks.p50).toEqual(b.monteCarlo.percentileCurves.stocks.p50);
    expect(a.monteCarlo.withdrawalStatsReal).toEqual(b.monteCarlo.withdrawalStatsReal);
    expect(a.representativePath.summary.terminalPortfolioValue).toBe(
      b.representativePath.summary.terminalPortfolioValue,
    );
  });

  it('aggregates percentiles independently for each asset class', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const result = await runMonteCarlo(config, { runs: 300, seed: 21 });
    const month = 12;
    expect(result.monteCarlo.percentileCurves.stocks.p10[month]).toBeLessThanOrEqual(
      result.monteCarlo.percentileCurves.stocks.p50[month] ?? 0,
    );
    expect(result.monteCarlo.percentileCurves.stocks.p50[month]).toBeLessThanOrEqual(
      result.monteCarlo.percentileCurves.stocks.p90[month] ?? 0,
    );
    expect(result.monteCarlo.percentileCurves.bonds.p10[month]).toBeLessThanOrEqual(
      result.monteCarlo.percentileCurves.bonds.p50[month] ?? 0,
    );
    expect(result.monteCarlo.percentileCurves.cash.p10[month]).toBeLessThanOrEqual(
      result.monteCarlo.percentileCurves.cash.p90[month] ?? 0,
    );
  });

  it('returns 100% probability when withdrawals are disabled', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.withdrawalStrategy = {
      type: WithdrawalStrategyType.ConstantDollar,
      params: { initialWithdrawalRate: 0 },
    };
    config.spendingPhases = [
      {
        ...config.spendingPhases[0]!,
        minMonthlySpend: 0,
        maxMonthlySpend: 0,
      },
    ];

    const result = await runMonteCarlo(config, { runs: 200, seed: 7 });
    expect(result.monteCarlo.probabilityOfSuccess).toBe(1);
    expect(result.monteCarlo.withdrawalStatsReal?.medianMonthly).toBe(0);
    expect(result.monteCarlo.withdrawalStatsReal?.meanMonthly).toBe(0);
    expect(result.monteCarlo.withdrawalStatsReal?.stdDevMonthly).toBe(0);
  });

  it('produces ordered withdrawal quantiles for MC summary stats', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const result = await runMonteCarlo(config, { runs: 300, seed: 1234 });
    const stats = result.monteCarlo.withdrawalStatsReal;

    expect(stats).toBeDefined();
    expect(stats!.p25Monthly).toBeLessThanOrEqual(stats!.medianMonthly);
    expect(stats!.medianMonthly).toBeLessThanOrEqual(stats!.p75Monthly);
    expect(stats!.stdDevMonthly).toBeGreaterThanOrEqual(0);
  });

  it('returns 0% probability when starting portfolio is zero', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.portfolio = { stocks: 0, bonds: 0, cash: 0 };

    const result = await runMonteCarlo(config, { runs: 200, seed: 7 });
    expect(result.monteCarlo.probabilityOfSuccess).toBe(0);
  });

  it('treats empty spending phases as no clamp bounds', async () => {
    const configWithoutPhases = createBaseConfig();
    configWithoutPhases.simulationMode = SimulationMode.MonteCarlo;
    configWithoutPhases.spendingPhases = [];

    const configWithWidePhase = createBaseConfig();
    configWithWidePhase.simulationMode = SimulationMode.MonteCarlo;
    configWithWidePhase.spendingPhases = [
      {
        id: 'wide',
        name: 'Wide',
        startYear: 1,
        endYear: configWithWidePhase.coreParams.retirementDuration,
        minMonthlySpend: 0,
        maxMonthlySpend: 1_000_000_000,
      },
    ];

    const withoutPhases = await runMonteCarlo(configWithoutPhases, { runs: 300, seed: 101 });
    const withWidePhase = await runMonteCarlo(configWithWidePhase, { runs: 300, seed: 101 });

    expect(withoutPhases.monteCarlo.probabilityOfSuccess).toBe(withWidePhase.monteCarlo.probabilityOfSuccess);
    expect(withoutPhases.representativePath.summary.terminalPortfolioValue).toBe(
      withWidePhase.representativePath.summary.terminalPortfolioValue,
    );
  });

  it('completes 1000 runs under performance target', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const start = Date.now();
    await runMonteCarlo(config, { runs: 1000, seed: 99 });
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(3000);
  });

  it('uses drawdown and shortfall as deterministic tie-breakers for representative path', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const result = await runMonteCarlo(config, { runs: 600, seed: 777 });
    const terminals = result.monteCarlo.terminalValues;
    const sortedTerminals = [...terminals].sort((a, b) => a - b);
    const medianIndex = (sortedTerminals.length - 1) * 0.5;
    const lower = Math.floor(medianIndex);
    const upper = Math.ceil(medianIndex);
    const medianTerminal =
      lower === upper
        ? (sortedTerminals[lower] ?? 0)
        : (sortedTerminals[lower] ?? 0) +
          ((sortedTerminals[upper] ?? 0) - (sortedTerminals[lower] ?? 0)) * (medianIndex - lower);
    const representativeTerminal = result.representativePath.summary.terminalPortfolioValue;
    const representativeTerminalDelta = Math.abs(representativeTerminal - medianTerminal);

    const minTerminalDelta = terminals.reduce((min, value) => {
      const delta = Math.abs(value - medianTerminal);
      return Math.min(min, delta);
    }, Number.POSITIVE_INFINITY);
    expect(representativeTerminalDelta).toBe(minTerminalDelta);

    const rerun = await runMonteCarlo(config, { runs: 600, seed: 777 });
    expect(rerun.representativePath.summary.totalWithdrawn).toBe(
      result.representativePath.summary.totalWithdrawn,
    );
    expect(rerun.representativePath.summary.totalShortfall).toBe(
      result.representativePath.summary.totalShortfall,
    );
  });

  it('block bootstrap is deterministic with the same seed', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.blockBootstrapEnabled = true;
    config.blockBootstrapLength = 12;

    const a = await runMonteCarlo(config, { runs: 200, seed: 42 });
    const b = await runMonteCarlo(config, { runs: 200, seed: 42 });

    expect(a.monteCarlo.probabilityOfSuccess).toBe(b.monteCarlo.probabilityOfSuccess);
    expect(a.monteCarlo.percentileCurves.total.p50).toEqual(b.monteCarlo.percentileCurves.total.p50);
    expect(a.representativePath.summary.terminalPortfolioValue).toBe(
      b.representativePath.summary.terminalPortfolioValue,
    );
  });

  it('block bootstrap produces different results from i.i.d. with the same seed', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;

    const iidConfig = { ...config, blockBootstrapEnabled: false };
    const blockConfig = { ...config, blockBootstrapEnabled: true, blockBootstrapLength: 12 };

    const iidResult = await runMonteCarlo(iidConfig, { runs: 200, seed: 55 });
    const blockResult = await runMonteCarlo(blockConfig, { runs: 200, seed: 55 });

    const iidP50 = iidResult.monteCarlo.percentileCurves.total.p50;
    const blockP50 = blockResult.monteCarlo.percentileCurves.total.p50;

    expect(iidP50).not.toEqual(blockP50);
  });

  it('block bootstrap with blockLength=1 runs without error', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.blockBootstrapEnabled = true;
    config.blockBootstrapLength = 1;

    const result = await runMonteCarlo(config, { runs: 50, seed: 99 });
    expect(result.monteCarlo.simulationCount).toBe(50);
    expect(result.monteCarlo.percentileCurves.total.p50.length).toBe(
      config.coreParams.retirementDuration * 12,
    );
  });

  it('runs Monte Carlo using custom historical month-year range', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.selectedHistoricalEra = HistoricalEra.Custom;
    config.customHistoricalRange = {
      start: { year: 2000, month: 1 },
      end: { year: 2000, month: 12 },
    };

    const result = await runMonteCarlo(config, { runs: 80, seed: 314 });
    expect(result.monteCarlo.simulationCount).toBe(80);
    expect(result.monteCarlo.historicalSummary.selectedEra.key).toBe(HistoricalEra.Custom);
    expect(result.monteCarlo.historicalSummary.byAsset.stocks.sampleSizeMonths).toBe(12);
  });

  it('matches callback transforms when using descriptor-based stress transforms', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    const scenario: StressScenario = {
      id: 'crash',
      label: 'Crash',
      type: 'stockCrash',
      startYear: 2,
      params: { dropPct: -0.35 },
    };
    const descriptor = {
      projectedStartMonth: 1,
      scenario,
    };

    const callbackResult = await runMonteCarlo(config, {
      runs: 160,
      seed: 222,
      transformReturns: (returns) => returnsWithStressTransform(descriptor, returns),
    });

    const descriptorResult = await runMonteCarlo(config, {
      runs: 160,
      seed: 222,
      stressTransform: descriptor,
    });

    expect(descriptorResult.monteCarlo.percentileCurves.total.p50).toEqual(
      callbackResult.monteCarlo.percentileCurves.total.p50,
    );
    expect(descriptorResult.monteCarlo.percentileCurves.total.p10).toEqual(
      callbackResult.monteCarlo.percentileCurves.total.p10,
    );
    expect(descriptorResult.monteCarlo.probabilityOfSuccess).toBe(
      callbackResult.monteCarlo.probabilityOfSuccess,
    );
    expect(descriptorResult.representativePath.summary).toEqual(callbackResult.representativePath.summary);
  });
});
