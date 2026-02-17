import { describe, expect, it } from 'vitest';

import { HistoricalEra, SimulationMode, WithdrawalStrategyType } from '@finapp/shared';

import { runMonteCarlo } from '../../src/engine/monteCarlo';
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
  });

  it('returns 0% probability when starting portfolio is zero', async () => {
    const config = createBaseConfig();
    config.simulationMode = SimulationMode.MonteCarlo;
    config.portfolio = { stocks: 0, bonds: 0, cash: 0 };

    const result = await runMonteCarlo(config, { runs: 200, seed: 7 });
    expect(result.monteCarlo.probabilityOfSuccess).toBe(0);
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
});
