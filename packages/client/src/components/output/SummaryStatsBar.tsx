import { useMemo } from 'react';

import { AppMode, SimulationMode } from '@finapp/shared';

import { useActiveSimulationResult, useAppStore, useCompareSimulationResults } from '../../store/useAppStore';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../../lib/format';
import { buildSummaryStats } from '../../lib/statistics';
import { StatCard } from './StatCard';

const inflationFactor = (inflationRate: number, monthIndexOneBased: number): number =>
  (1 + inflationRate) ** (monthIndexOneBased / 12);

export const SummaryStatsBar = () => {
  const result = useActiveSimulationResult();
  const compareResults = useCompareSimulationResults();
  const mode = useAppStore((state) => state.mode);
  const simulationStatus = useAppStore((state) => state.simulationResults.status);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const startingAge = useAppStore((state) => state.coreParams.startingAge);
  const retirementDuration = useAppStore((state) => state.coreParams.retirementDuration);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const startingPortfolio = useAppStore((state) => state.portfolio.stocks + state.portfolio.bonds + state.portfolio.cash);
  const activeRunInflationRate = result?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
  const activeRunRetirementDuration = result?.configSnapshot?.coreParams.retirementDuration ?? retirementDuration;
  const activeRunStartingAge = result?.configSnapshot?.coreParams.startingAge ?? startingAge;

  const stats = useMemo(() => {
    const rows = result?.result.rows ?? [];
    return buildSummaryStats(rows, activeRunInflationRate);
  }, [activeRunInflationRate, result]);

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
  const terminalMedianNominal = monteCarlo?.percentileCurves.total.p50[activeRunRetirementDuration * 12 - 1] ?? null;
  const terminalMedianReal =
    terminalMedianNominal === null
      ? null
      : terminalMedianNominal / inflationFactor(activeRunInflationRate, activeRunRetirementDuration * 12);
  const manualTerminalNominal = result?.result.rows[result.result.rows.length - 1]
    ? result.result.rows[result.result.rows.length - 1]!.endBalances.stocks +
      result.result.rows[result.result.rows.length - 1]!.endBalances.bonds +
      result.result.rows[result.result.rows.length - 1]!.endBalances.cash
    : 0;
  const manualTerminalReal =
    activeRunRetirementDuration <= 0
      ? manualTerminalNominal
      : manualTerminalNominal / inflationFactor(activeRunInflationRate, activeRunRetirementDuration * 12);
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
          : `Depleted in month ${stats.depletionMonthIndex + 1} (age ${activeRunStartingAge + Math.floor(stats.depletionMonthIndex / 12)})`
      : `${formatPercent(terminalPctOfStarting)} of starting`;

  if (mode === AppMode.Compare) {
    const resolveSlotResult = (workspace: (typeof compareResults)['leftWorkspace']) => {
      if (!workspace) {
        return null;
      }
      const preferred =
        simulationMode === SimulationMode.Manual
          ? workspace.simulationResults.manual
          : workspace.simulationResults.monteCarlo;
      return preferred ?? workspace.simulationResults.manual ?? workspace.simulationResults.monteCarlo;
    };
    const leftResult = resolveSlotResult(compareResults.leftWorkspace);
    const rightResult = resolveSlotResult(compareResults.rightWorkspace);
    const leftRows = leftResult?.result.rows ?? [];
    const rightRows = rightResult?.result.rows ?? [];
    const leftInflationRate = leftResult?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const rightInflationRate = rightResult?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const leftStats = buildSummaryStats(leftRows, leftInflationRate);
    const rightStats = buildSummaryStats(rightRows, rightInflationRate);
    const leftHas = leftRows.length > 0;
    const rightHas = rightRows.length > 0;

    const compareCard = (
      label: string,
      leftValue: number | null,
      rightValue: number | null,
      formatter: (value: number) => string,
    ) => {
      const delta =
        leftValue !== null && rightValue !== null ? rightValue - leftValue : null;
      return (
        <StatCard
          label={label}
          value={
            <div className="space-y-1.5">
              <p className="font-mono text-[18px] font-semibold leading-none" style={{ color: 'var(--theme-chart-manual-line)' }}>
                {leftValue === null ? 'A: —' : `A: ${formatter(leftValue)}`}
              </p>
              <p className="font-mono text-[18px] font-semibold leading-none" style={{ color: 'var(--theme-color-info)' }}>
                {rightValue === null ? 'B: —' : `B: ${formatter(rightValue)}`}
              </p>
            </div>
          }
          annotation={
            delta === null ? undefined : `Δ ${delta >= 0 ? '+' : '-'}${formatter(Math.abs(delta))}`
          }
          annotationClassName="font-mono text-[12px] font-semibold"
          annotationStyle={
            delta === null
              ? { color: 'var(--theme-color-text-secondary)' }
              : { color: delta >= 0 ? 'var(--theme-color-positive)' : 'var(--theme-color-negative)' }
          }
        />
      );
    };

    const leftTerminal = leftHas
      ? leftRows[leftRows.length - 1]!.endBalances.stocks +
        leftRows[leftRows.length - 1]!.endBalances.bonds +
        leftRows[leftRows.length - 1]!.endBalances.cash
      : null;
    const rightTerminal = rightHas
      ? rightRows[rightRows.length - 1]!.endBalances.stocks +
        rightRows[rightRows.length - 1]!.endBalances.bonds +
        rightRows[rightRows.length - 1]!.endBalances.cash
      : null;
    const leftDuration = leftResult?.configSnapshot?.coreParams.retirementDuration ?? retirementDuration;
    const rightDuration = rightResult?.configSnapshot?.coreParams.retirementDuration ?? retirementDuration;
    const leftInflation = leftResult?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const rightInflation = rightResult?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const leftTerminalReal =
      leftTerminal === null || leftDuration <= 0
        ? leftTerminal
        : leftTerminal / inflationFactor(leftInflation, leftDuration * 12);
    const rightTerminalReal =
      rightTerminal === null || rightDuration <= 0
        ? rightTerminal
        : rightTerminal / inflationFactor(rightInflation, rightDuration * 12);
    const leftMcPos = leftResult?.monteCarlo?.probabilityOfSuccess ?? null;
    const rightMcPos = rightResult?.monteCarlo?.probabilityOfSuccess ?? null;

    return (
      <section className="rounded-xl bg-brand-surface p-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
          {simulationMode === SimulationMode.MonteCarlo
            ? compareCard('Probability of Success', leftMcPos, rightMcPos, (value) => formatPercent(value))
            : null}
          {compareCard(
            'Total Drawdown (Nominal)',
            leftHas ? leftStats.totalDrawdownNominal : null,
            rightHas ? rightStats.totalDrawdownNominal : null,
            (value) => formatCompactCurrency(value),
          )}
          {compareCard(
            'Total Drawdown (Real)',
            leftHas ? leftStats.totalDrawdownReal : null,
            rightHas ? rightStats.totalDrawdownReal : null,
            (value) => formatCompactCurrency(value),
          )}
          {compareCard(
            'Median Monthly (Real)',
            leftHas ? leftStats.medianMonthlyReal : null,
            rightHas ? rightStats.medianMonthlyReal : null,
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            'Mean Monthly (Real)',
            leftHas ? leftStats.meanMonthlyReal : null,
            rightHas ? rightStats.meanMonthlyReal : null,
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            'Std. Deviation (Real)',
            leftHas ? leftStats.stdDevMonthlyReal : null,
            rightHas ? rightStats.stdDevMonthlyReal : null,
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            '25th Percentile (Real)',
            leftHas ? leftStats.p25MonthlyReal : null,
            rightHas ? rightStats.p25MonthlyReal : null,
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            '75th Percentile (Real)',
            leftHas ? leftStats.p75MonthlyReal : null,
            rightHas ? rightStats.p75MonthlyReal : null,
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            'Portfolio End (Real)',
            leftTerminalReal,
            rightTerminalReal,
            (value) => formatCompactCurrency(Math.round(value)),
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-brand-surface p-4">
      {simulationStatus === 'running' ? (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue" />
          <span>Updating summary metrics...</span>
        </div>
      ) : null}
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
