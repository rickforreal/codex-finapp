import { useMemo } from 'react';

import { SimulationMode } from '@finapp/shared';

import { useActiveSimulationResult, useAppStore } from '../../store/useAppStore';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../../lib/format';
import { buildSummaryStats } from '../../lib/statistics';
import { StatCard } from './StatCard';

const inflationFactor = (inflationRate: number, monthIndexOneBased: number): number =>
  (1 + inflationRate) ** (monthIndexOneBased / 12);

export const SummaryStatsBar = () => {
  const result = useActiveSimulationResult();
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const startingAge = useAppStore((state) => state.coreParams.startingAge);
  const retirementDuration = useAppStore((state) => state.coreParams.retirementDuration);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const startingPortfolio = useAppStore((state) => state.portfolio.stocks + state.portfolio.bonds + state.portfolio.cash);

  const stats = useMemo(() => {
    const rows = result?.result.rows ?? [];
    return buildSummaryStats(rows, inflationRate);
  }, [inflationRate, result]);

  const hasResult = Boolean(result);
  const drawdownRealPctOfNominal =
    stats.totalDrawdownNominal > 0 ? stats.totalDrawdownReal / stats.totalDrawdownNominal : 0;
  const meanVsMedian = stats.meanMonthlyReal - stats.medianMonthlyReal;
  const p25PctOfMedian = stats.medianMonthlyReal > 0 ? stats.p25MonthlyReal / stats.medianMonthlyReal : 0;
  const p75PctOfMedian = stats.medianMonthlyReal > 0 ? stats.p75MonthlyReal / stats.medianMonthlyReal : 0;

  const monteCarlo = result?.monteCarlo;
  const showPoS = simulationMode === SimulationMode.MonteCarlo;
  const pos = monteCarlo?.probabilityOfSuccess ?? null;
  const posClassName =
    pos === null ? undefined : pos >= 0.9 ? 'text-emerald-700' : pos >= 0.75 ? 'text-amber-700' : 'text-rose-700';
  const terminalMedianNominal = monteCarlo?.percentileCurves.total.p50[retirementDuration * 12 - 1] ?? null;
  const terminalMedianReal =
    terminalMedianNominal === null
      ? null
      : terminalMedianNominal / inflationFactor(inflationRate, retirementDuration * 12);
  const manualTerminalNominal = result?.result.rows[result.result.rows.length - 1]
    ? result.result.rows[result.result.rows.length - 1]!.endBalances.stocks +
      result.result.rows[result.result.rows.length - 1]!.endBalances.bonds +
      result.result.rows[result.result.rows.length - 1]!.endBalances.cash
    : 0;
  const manualTerminalReal =
    retirementDuration <= 0
      ? manualTerminalNominal
      : manualTerminalNominal / inflationFactor(inflationRate, retirementDuration * 12);
  const terminalDisplayValue =
    simulationMode === SimulationMode.MonteCarlo
      ? (terminalMedianReal ?? 0)
      : manualTerminalReal;
  const terminalDepleted = hasResult && terminalDisplayValue <= 0;
  const terminalPctOfStarting = startingPortfolio > 0 ? terminalDisplayValue / startingPortfolio : 0;
  const terminalAnnotation = !hasResult
    ? undefined
    : terminalDepleted
      ? simulationMode === SimulationMode.MonteCarlo
        ? 'Median terminal portfolio depleted'
        : stats.depletionMonthIndex === null
          ? 'Depleted before end of horizon'
          : `Depleted in month ${stats.depletionMonthIndex + 1} (age ${startingAge + Math.floor(stats.depletionMonthIndex / 12)})`
      : `${formatPercent(terminalPctOfStarting)} of starting`;

  return (
    <section className="rounded-xl bg-brand-surface p-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {showPoS ? (
          <StatCard
            label="Probability of Success"
            value={pos === null ? '—' : formatPercent(pos)}
            annotation={
              monteCarlo
                ? `${monteCarlo.successCount.toLocaleString()} of ${monteCarlo.simulationCount.toLocaleString()} simulations survived`
                : undefined
            }
            valueClassName={posClassName}
          />
        ) : null}
        <StatCard
          label={simulationMode === SimulationMode.MonteCarlo ? 'Total Drawdown (Nominal) median' : 'Total Drawdown (Nominal)'}
          value={hasResult ? formatCompactCurrency(stats.totalDrawdownNominal) : '—'}
        />
        <StatCard
          label={simulationMode === SimulationMode.MonteCarlo ? 'Total Drawdown (Real) median' : 'Total Drawdown (Real)'}
          value={hasResult ? formatCompactCurrency(stats.totalDrawdownReal) : '—'}
          annotation={hasResult ? `${formatPercent(drawdownRealPctOfNominal)} of nominal` : undefined}
        />
        <StatCard
          label="Median Monthly (Real)"
          value={hasResult ? formatCurrency(Math.round(stats.medianMonthlyReal)) : '—'}
          annotation={hasResult ? `${formatCurrency(Math.round(stats.medianMonthlyReal * 12))} / year` : undefined}
        />
        <StatCard
          label="Mean Monthly (Real)"
          value={hasResult ? formatCurrency(Math.round(stats.meanMonthlyReal)) : '—'}
          annotation={hasResult ? `${meanVsMedian >= 0 ? '+' : '-'}${formatCurrency(Math.round(Math.abs(meanVsMedian)))} vs median` : undefined}
          valueClassName={meanVsMedian >= 0 ? 'text-emerald-700' : 'text-rose-700'}
        />
        <StatCard
          label="Std. Deviation (Real)"
          value={hasResult ? formatCurrency(Math.round(stats.stdDevMonthlyReal)) : '—'}
        />
        <StatCard
          label="25th Percentile (Real)"
          value={hasResult ? formatCurrency(Math.round(stats.p25MonthlyReal)) : '—'}
          annotation={hasResult ? `${formatPercent(p25PctOfMedian)} of median` : undefined}
        />
        <StatCard
          label="75th Percentile (Real)"
          value={hasResult ? formatCurrency(Math.round(stats.p75MonthlyReal)) : '—'}
          annotation={hasResult ? `${formatPercent(p75PctOfMedian)} of median` : undefined}
        />
        <StatCard
          label="Portfolio End (Real)"
          value={hasResult ? formatCompactCurrency(Math.round(terminalDisplayValue)) : '—'}
          annotation={terminalAnnotation}
          valueClassName={terminalDepleted ? 'text-rose-700' : 'text-emerald-700'}
          className={terminalDepleted ? 'border-rose-200 bg-rose-50' : ''}
        />
      </div>
    </section>
  );
};
