import { useMemo } from 'react';

import { AppMode, SimulationMode } from '@finapp/shared';

import {
  type WorkspaceSnapshot,
  useActiveSimulationResult,
  useAppStore,
  useCompareSimulationResults,
  useIsCompareActive,
  useTrackingOutputsStale,
} from '../../store/useAppStore';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../../lib/format';
import { buildSummaryStats } from '../../lib/statistics';
import { StatCard } from './StatCard';

const inflationFactor = (inflationRate: number, monthIndexOneBased: number): number =>
  (1 + inflationRate) ** (monthIndexOneBased / 12);

export const SummaryStatsBar = () => {
  const result = useActiveSimulationResult();
  const compareResults = useCompareSimulationResults();
  const isCompareActive = useIsCompareActive();
  const trackingOutputsStale = useTrackingOutputsStale();
  const simulationStatus = useAppStore((state) => state.simulationResults.status);
  const mode = useAppStore((state) => state.mode);
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

  const statsForDisplay = useMemo(() => {
    if (simulationMode !== SimulationMode.MonteCarlo || !result?.monteCarlo?.withdrawalStatsReal) {
      return stats;
    }
    return {
      ...stats,
      medianMonthlyReal: result.monteCarlo.withdrawalStatsReal.medianMonthly,
      meanMonthlyReal: result.monteCarlo.withdrawalStatsReal.meanMonthly,
      stdDevMonthlyReal: result.monteCarlo.withdrawalStatsReal.stdDevMonthly,
      p25MonthlyReal: result.monteCarlo.withdrawalStatsReal.p25Monthly,
      p75MonthlyReal: result.monteCarlo.withdrawalStatsReal.p75Monthly,
    };
  }, [result, simulationMode, stats]);

  const hasResult = Boolean(result);
  const drawdownRealPctOfNominal =
    statsForDisplay.totalDrawdownNominal > 0
      ? statsForDisplay.totalDrawdownReal / statsForDisplay.totalDrawdownNominal
      : 0;
  const meanVsMedian = statsForDisplay.meanMonthlyReal - statsForDisplay.medianMonthlyReal;
  const p25PctOfMedian =
    statsForDisplay.medianMonthlyReal > 0
      ? statsForDisplay.p25MonthlyReal / statsForDisplay.medianMonthlyReal
      : 0;
  const p75PctOfMedian =
    statsForDisplay.medianMonthlyReal > 0
      ? statsForDisplay.p75MonthlyReal / statsForDisplay.medianMonthlyReal
      : 0;

  const monteCarlo = result?.monteCarlo;
  const showPoS = simulationMode === SimulationMode.MonteCarlo;
  const pos = monteCarlo?.probabilityOfSuccess ?? null;
  const posClassName =
    pos === null ? undefined : pos >= 0.9 ? 'theme-text-positive' : pos >= 0.75 ? 'theme-text-warning' : 'theme-text-negative';
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

  if (isCompareActive) {
    const resolveSlotResult = (workspace: WorkspaceSnapshot | undefined) => {
      if (!workspace) {
        return null;
      }
      const preferred =
        simulationMode === SimulationMode.Manual
          ? workspace.simulationResults.manual
          : workspace.simulationResults.monteCarlo;
      return preferred ?? workspace.simulationResults.manual ?? workspace.simulationResults.monteCarlo;
    };
    const slotEntries = compareResults.slotOrder.map((slotId) => {
      const resultForSlot = resolveSlotResult(compareResults.slots[slotId]);
      const rows = resultForSlot?.result.rows ?? [];
      const slotInflationRate = resultForSlot?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
      const rawStatsForSlot = buildSummaryStats(rows, slotInflationRate);
      const statsForSlot =
        simulationMode === SimulationMode.MonteCarlo && resultForSlot?.monteCarlo?.withdrawalStatsReal
          ? {
              ...rawStatsForSlot,
              medianMonthlyReal: resultForSlot.monteCarlo.withdrawalStatsReal.medianMonthly,
              meanMonthlyReal: resultForSlot.monteCarlo.withdrawalStatsReal.meanMonthly,
              stdDevMonthlyReal: resultForSlot.monteCarlo.withdrawalStatsReal.stdDevMonthly,
              p25MonthlyReal: resultForSlot.monteCarlo.withdrawalStatsReal.p25Monthly,
              p75MonthlyReal: resultForSlot.monteCarlo.withdrawalStatsReal.p75Monthly,
            }
          : rawStatsForSlot;
      const terminalNominal =
        rows.length > 0
          ? rows[rows.length - 1]!.endBalances.stocks +
            rows[rows.length - 1]!.endBalances.bonds +
            rows[rows.length - 1]!.endBalances.cash
          : null;
      const slotDuration = resultForSlot?.configSnapshot?.coreParams.retirementDuration ?? retirementDuration;
      const terminalReal =
        terminalNominal === null || slotDuration <= 0
          ? terminalNominal
          : terminalNominal / inflationFactor(slotInflationRate, slotDuration * 12);
      return {
        slotId,
        result: resultForSlot,
        rows,
        hasRows: rows.length > 0,
        stats: statsForSlot,
        terminalReal,
        pos: resultForSlot?.monteCarlo?.probabilityOfSuccess ?? null,
      };
    });
    const baselineSlotId = compareResults.slotOrder.includes(compareResults.baselineSlotId)
      ? compareResults.baselineSlotId
      : (compareResults.slotOrder[0] ?? 'A');
    const baselineEntry = slotEntries.find((entry) => entry.slotId === baselineSlotId) ?? null;

    const compareCard = (
      label: string,
      valueForSlot: (entry: (typeof slotEntries)[number]) => number | null,
      formatter: (value: number) => string,
    ) => {
      return (
        <StatCard
          label={label}
          value={
            <div className="space-y-1">
              {slotEntries.map((entry) => {
                const value = valueForSlot(entry);
                const baselineValue = baselineEntry ? valueForSlot(baselineEntry) : null;
                const delta = value !== null && baselineValue !== null ? value - baselineValue : null;
                return (
                  <p key={`${label}-${entry.slotId}`} className="font-mono text-[14px] font-semibold leading-none text-slate-700">
                    {entry.slotId}: {value === null ? '—' : formatter(value)}
                    <span
                      className="ml-1 text-[11px]"
                      style={{
                        color:
                          delta === null
                            ? 'var(--theme-color-text-secondary)'
                            : delta >= 0
                              ? 'var(--theme-color-positive)'
                              : 'var(--theme-color-negative)',
                      }}
                    >
                      {delta === null ? '' : `(${delta >= 0 ? '+' : '-'}${formatter(Math.abs(delta))})`}
                    </span>
                  </p>
                );
              })}
            </div>
          }
          annotation={`Baseline: ${baselineSlotId}`}
          annotationClassName="font-mono text-[11px]"
        />
      );
    };

    return (
      <section
        className="theme-summary-shell rounded-xl p-4"
        style={
          mode === AppMode.Tracking && trackingOutputsStale
            ? { opacity: 0.58, filter: 'saturate(0.78)' }
            : undefined
        }
      >
        <div className="theme-summary-muted mb-2 text-xs">Compare metrics across {slotEntries.length} active portfolios.</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {simulationMode === SimulationMode.MonteCarlo
            ? compareCard('Probability of Success', (entry) => entry.pos, (value) => formatPercent(value))
            : null}
          {compareCard(
            'Total Drawdown (Nominal)',
            (entry) => (entry.hasRows ? entry.stats.totalDrawdownNominal : null),
            (value) => formatCompactCurrency(value),
          )}
          {compareCard(
            'Total Drawdown (Real)',
            (entry) => (entry.hasRows ? entry.stats.totalDrawdownReal : null),
            (value) => formatCompactCurrency(value),
          )}
          {compareCard(
            'Median Monthly (Real)',
            (entry) => (entry.hasRows ? entry.stats.medianMonthlyReal : null),
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            'Mean Monthly (Real)',
            (entry) => (entry.hasRows ? entry.stats.meanMonthlyReal : null),
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            'Std. Deviation (Real)',
            (entry) => (entry.hasRows ? entry.stats.stdDevMonthlyReal : null),
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            '25th Percentile (Real)',
            (entry) => (entry.hasRows ? entry.stats.p25MonthlyReal : null),
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            '75th Percentile (Real)',
            (entry) => (entry.hasRows ? entry.stats.p75MonthlyReal : null),
            (value) => formatCurrency(Math.round(value)),
          )}
          {compareCard(
            'Portfolio End (Real)',
            (entry) => entry.terminalReal,
            (value) => formatCompactCurrency(Math.round(value)),
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="theme-summary-shell rounded-xl p-4"
      style={
        mode === AppMode.Tracking && trackingOutputsStale
          ? { opacity: 0.58, filter: 'saturate(0.78)' }
          : undefined
      }
    >
      {simulationStatus === 'running' ? (
        <div className="theme-summary-muted mb-2 flex items-center gap-2 text-xs">
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
          value={hasResult ? formatCompactCurrency(statsForDisplay.totalDrawdownNominal) : '—'}
        />
        <StatCard
          label={simulationMode === SimulationMode.MonteCarlo ? 'Total Drawdown (Real) median' : 'Total Drawdown (Real)'}
          value={hasResult ? formatCompactCurrency(statsForDisplay.totalDrawdownReal) : '—'}
          annotation={hasResult ? `${formatPercent(drawdownRealPctOfNominal)} of nominal` : undefined}
        />
        <StatCard
          label="Median Monthly (Real)"
          value={hasResult ? formatCurrency(Math.round(statsForDisplay.medianMonthlyReal)) : '—'}
          annotation={hasResult ? `${formatCurrency(Math.round(statsForDisplay.medianMonthlyReal * 12))} / year` : undefined}
        />
        <StatCard
          label="Mean Monthly (Real)"
          value={hasResult ? formatCurrency(Math.round(statsForDisplay.meanMonthlyReal)) : '—'}
          annotation={hasResult ? `${meanVsMedian >= 0 ? '+' : '-'}${formatCurrency(Math.round(Math.abs(meanVsMedian)))} vs median` : undefined}
          valueClassName={meanVsMedian >= 0 ? 'theme-text-positive' : 'theme-text-negative'}
        />
        <StatCard
          label="Std. Deviation (Real)"
          value={hasResult ? formatCurrency(Math.round(statsForDisplay.stdDevMonthlyReal)) : '—'}
        />
        <StatCard
          label="25th Percentile (Real)"
          value={hasResult ? formatCurrency(Math.round(statsForDisplay.p25MonthlyReal)) : '—'}
          annotation={hasResult ? `${formatPercent(p25PctOfMedian)} of median` : undefined}
        />
        <StatCard
          label="75th Percentile (Real)"
          value={hasResult ? formatCurrency(Math.round(statsForDisplay.p75MonthlyReal)) : '—'}
          annotation={hasResult ? `${formatPercent(p75PctOfMedian)} of median` : undefined}
        />
        <StatCard
          label="Portfolio End (Real)"
          value={hasResult ? formatCompactCurrency(Math.round(terminalDisplayValue)) : '—'}
          annotation={terminalAnnotation}
          valueClassName={terminalDepleted ? 'theme-text-negative' : 'theme-text-positive'}
          className={terminalDepleted ? 'theme-summary-terminal-depleted' : ''}
        />
      </div>
    </section>
  );
};
