import { useMemo } from 'react';

import {
  AppMode,
  AssetClass,
  type MonthlySimulationRow,
  type MonteCarloPercentileCurves,
  SimulationMode,
} from '@finapp/shared';

import {
  CHART_HEIGHT,
  CHART_MARGIN,
  PLOT_HEIGHT,
  areaPath,
  inflationFactor,
  linePath,
  mouseIndexFromEvent,
  stressScenarioColors,
} from '../../lib/chartPrimitives';
import { getCompareSlotColorVar } from '../../lib/compareSlotColors';
import { formatCompactCurrency, formatCurrency, formatPeriodLabel } from '../../lib/format';
import {
  type WorkspaceSnapshot,
  useActiveSimulationResult,
  useAppStore,
  useCompareSimulationResults,
  useIsCompareActive,
} from '../../store/useAppStore';

type WithdrawalPoint = {
  monthIndex: number;
  year: number;
  totalNominal: number;
  totalReal: number;
  stocksNominal: number;
  bondsNominal: number;
  cashNominal: number;
  stocksReal: number;
  bondsReal: number;
  cashReal: number;
  requested: number;
  shortfall: number;
};

type MonteCarloBands = {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
};

type WithdrawalChartProps = {
  hoverIndex: number | null;
  onHoverChange: (index: number | null) => void;
  chartWidth: number;
};

const height = CHART_HEIGHT;
const margin = CHART_MARGIN;
const plotHeight = PLOT_HEIGHT;

const toDisplayBands = (
  curves: MonteCarloPercentileCurves,
  chartDisplayMode: 'nominal' | 'real',
  inflationRate: number,
): MonteCarloBands => {
  const toDisplayValue = (value: number, monthIndexOneBased: number) =>
    chartDisplayMode === 'real'
      ? value
      : value * inflationFactor(inflationRate, monthIndexOneBased);

  return {
    p10: curves.p10.map((value, index) => toDisplayValue(value, index + 1)),
    p25: curves.p25.map((value, index) => toDisplayValue(value, index + 1)),
    p50: curves.p50.map((value, index) => toDisplayValue(value, index + 1)),
    p75: curves.p75.map((value, index) => toDisplayValue(value, index + 1)),
    p90: curves.p90.map((value, index) => toDisplayValue(value, index + 1)),
  };
};

export const WithdrawalChart = ({ hoverIndex, onHoverChange, chartWidth }: WithdrawalChartProps) => {
  const result = useActiveSimulationResult();
  const compareResults = useCompareSimulationResults();
  const isCompareActive = useIsCompareActive();
  const chartDisplayMode = useAppStore((state) => state.ui.chartDisplayMode);
  const chartBreakdownEnabled = useAppStore((state) => state.ui.chartBreakdownEnabled);
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const birthDate = useAppStore((state) => state.coreParams.birthDate);
  const portfolioStart = useAppStore((state) => state.coreParams.portfolioStart);
  const stressResult = useAppStore((state) => state.stress.result);
  const activeRunInflationRate = result?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
  const activeRunBirthDate = result?.configSnapshot?.coreParams.birthDate ?? birthDate;
  const activeRunPortfolioStart = result?.configSnapshot?.coreParams.portfolioStart ?? portfolioStart;

  const points = useMemo<WithdrawalPoint[]>(() => {
    const rows =
      mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo
        ? (useAppStore.getState().simulationResults.reforecast?.result.rows ?? result?.result.rows ?? [])
        : (result?.result.rows ?? []);
    return rows.map((row) => {
      const factor = inflationFactor(activeRunInflationRate, row.monthIndex);
      const stocksNominal = row.withdrawals.byAsset[AssetClass.Stocks];
      const bondsNominal = row.withdrawals.byAsset[AssetClass.Bonds];
      const cashNominal = row.withdrawals.byAsset[AssetClass.Cash];
      return {
        monthIndex: row.monthIndex,
        year: row.year,
        totalNominal: row.withdrawals.actual,
        totalReal: row.withdrawals.actual / factor,
        stocksNominal,
        bondsNominal,
        cashNominal,
        stocksReal: stocksNominal / factor,
        bondsReal: bondsNominal / factor,
        cashReal: cashNominal / factor,
        requested: row.withdrawals.requested,
        shortfall: row.withdrawals.shortfall,
      };
    });
  }, [activeRunInflationRate, mode, result, simulationMode]);

  const mcWithdrawalBands = useMemo<MonteCarloBands | null>(() => {
    if (simulationMode !== SimulationMode.MonteCarlo) {
      return null;
    }
    const curves = result?.monteCarlo?.withdrawalPercentileCurvesReal;
    if (!curves) {
      return null;
    }
    return toDisplayBands(curves, chartDisplayMode, activeRunInflationRate);
  }, [activeRunInflationRate, chartDisplayMode, result, simulationMode]);

  const mcWithdrawalP50Series = useMemo<number[]>(() => {
    if (mcWithdrawalBands) {
      return mcWithdrawalBands.p50;
    }
    const series = result?.monteCarlo?.withdrawalP50SeriesReal ?? [];
    return series.map((value, index) => {
      if (chartDisplayMode === 'real') {
        return value;
      }
      return value * inflationFactor(activeRunInflationRate, index + 1);
    });
  }, [activeRunInflationRate, chartDisplayMode, mcWithdrawalBands, result]);

  // Compare mode
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

    const slotSeries = compareResults.slotOrder.map((slotId) => {
      const resultForSlot = resolveSlotResult(compareResults.slots[slotId]);
      const rows = resultForSlot?.result.rows ?? [];
      const slotInflationRate = resultForSlot?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
      const slotBands =
        simulationMode === SimulationMode.MonteCarlo && resultForSlot?.monteCarlo?.withdrawalPercentileCurvesReal
          ? toDisplayBands(resultForSlot.monteCarlo.withdrawalPercentileCurvesReal, chartDisplayMode, slotInflationRate)
          : null;
      const withdrawals =
        slotBands?.p50 ??
        (simulationMode === SimulationMode.MonteCarlo &&
        (resultForSlot?.monteCarlo?.withdrawalP50SeriesReal?.length ?? 0) > 0
          ? resultForSlot!.monteCarlo!.withdrawalP50SeriesReal!.map((value: number, index: number) =>
              chartDisplayMode === 'real'
                ? value
                : value * inflationFactor(slotInflationRate, index + 1),
            )
          : rows.map((row: MonthlySimulationRow) => {
              const nominal = row.withdrawals.actual;
              return chartDisplayMode === 'real'
                ? nominal / inflationFactor(slotInflationRate, row.monthIndex)
                : nominal;
            }));
      return {
        slotId,
        color: getCompareSlotColorVar(slotId),
        rows,
        withdrawals,
        inflationRate: slotInflationRate,
        result: resultForSlot,
        bands: slotBands,
      };
    });

    const baselineSlotId = compareResults.slotOrder.includes(compareResults.baselineSlotId)
      ? compareResults.baselineSlotId
      : (compareResults.slotOrder[0] ?? 'A');
    const baselineSeries = slotSeries.find((entry) => entry.slotId === baselineSlotId) ?? slotSeries[0] ?? null;
    const baselineBands =
      simulationMode === SimulationMode.MonteCarlo && !chartBreakdownEnabled
        ? baselineSeries?.bands ?? null
        : null;

    if (slotSeries.every((entry) => entry.withdrawals.length === 0)) {
      return (
        <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface">
          <p className="text-sm text-slate-500">Run compare simulation to see withdrawal projections.</p>
        </div>
      );
    }

    const width = chartWidth;
    const maxCount = Math.max(1, ...slotSeries.map((entry) => entry.withdrawals.length));
    const plotWidth = width - margin.left - margin.right;
    const xAt = (index: number): number => margin.left + (index / Math.max(maxCount - 1, 1)) * plotWidth;

    const compareStressEntries = slotSeries.flatMap((entry, slotIndex) => {
      const slotStressScenarios = compareResults.slots[entry.slotId]?.stress.result?.scenarios ?? [];
      return slotStressScenarios.map((scenario, scenarioIndex) => {
        const curve = scenario.result.rows.map((row) => {
          const nominal = row.withdrawals.actual;
          return chartDisplayMode === 'real'
            ? nominal / inflationFactor(entry.inflationRate, row.monthIndex)
            : nominal;
        });
        return {
          key: `${scenario.scenarioId}-${entry.slotId}`,
          label: `${scenario.scenarioLabel} (${entry.slotId})`,
          color: stressScenarioColors[scenarioIndex] ?? 'var(--theme-color-text-muted)',
          slotIndex,
          curve,
          rows: scenario.result.rows,
          inflationRate: entry.inflationRate,
        };
      });
    });

    const maxY = Math.max(
      1,
      ...slotSeries.flatMap((entry) => entry.withdrawals),
      ...(baselineBands?.p90 ?? []),
      ...compareStressEntries.flatMap((entry) => entry.curve),
    );
    const yAt = (value: number): number => margin.top + plotHeight - (value / maxY) * plotHeight;
    const yTicks = 6;
    const xTicks = Math.min(8, maxCount);
    const localCount = Math.max(maxCount - 1, 1);
    const activeHoverIndex = hoverIndex === null ? null : Math.max(0, Math.min(hoverIndex, maxCount - 1));
    const hoverX = activeHoverIndex === null ? null : xAt(activeHoverIndex);
    const hoverYear = activeHoverIndex === null ? null : Math.floor(activeHoverIndex / 12) + 1;

    type CompareTooltipEntry = {
      label: string;
      color: string;
      withdrawal: number;
      dashed: boolean;
    };
    const tooltipEntries: CompareTooltipEntry[] =
      activeHoverIndex === null
        ? []
        : slotSeries.reduce<CompareTooltipEntry[]>((acc, entry) => {
            const w = entry.withdrawals[activeHoverIndex];
            if (w === undefined) {
              return acc;
            }
            acc.push({
              label: `Portfolio ${entry.slotId}`,
              color: entry.color,
              withdrawal: w,
              dashed: false,
            });
            return acc;
          }, []);
    const stressTooltipEntries: CompareTooltipEntry[] =
      activeHoverIndex === null
        ? []
        : compareStressEntries.reduce<CompareTooltipEntry[]>((acc, entry) => {
            const row = entry.rows[activeHoverIndex];
            if (!row) {
              return acc;
            }
            const withdrawal =
              chartDisplayMode === 'real'
                ? row.withdrawals.actual / inflationFactor(entry.inflationRate, row.monthIndex)
                : row.withdrawals.actual;
            acc.push({
              label: entry.label,
              color: entry.color,
              withdrawal,
              dashed: entry.slotIndex > 0,
            });
            return acc;
          }, []);
    const baselinePercentileTooltip =
      activeHoverIndex === null || !baselineBands
        ? null
        : {
            p10: baselineBands.p10[activeHoverIndex] ?? null,
            p25: baselineBands.p25[activeHoverIndex] ?? null,
            p50: baselineBands.p50[activeHoverIndex] ?? null,
            p75: baselineBands.p75[activeHoverIndex] ?? null,
            p90: baselineBands.p90[activeHoverIndex] ?? null,
          };

    return (
      <div className="space-y-2">
        <div className="relative overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full bg-white"
          onMouseLeave={() => onHoverChange(null)}
          onMouseMove={(event) => onHoverChange(mouseIndexFromEvent(event, width, plotWidth, localCount))}
        >
          {Array.from({ length: yTicks + 1 }, (_, index) => {
            const value = (maxY / yTicks) * (yTicks - index);
            const y = yAt(value);
            return (
              <g key={`wy-${index}`}>
                <line x1={margin.left} y1={y} x2={margin.left + plotWidth} y2={y} stroke="var(--theme-color-chart-grid)" strokeDasharray="4 4" />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--theme-color-chart-text)">
                  {formatCompactCurrency(Math.round(value))}
                </text>
              </g>
            );
          })}
          {Array.from({ length: xTicks }, (_, index) => {
            const ratio = xTicks <= 1 ? 0 : index / (xTicks - 1);
            const localIndex = Math.round(ratio * (maxCount - 1));
            const x = xAt(localIndex);
            return (
              <g key={`wx-${index}`}>
                <line x1={x} y1={margin.top + plotHeight} x2={x} y2={margin.top + plotHeight + 5} stroke="var(--theme-color-chart-axis)" />
                <text x={x} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--theme-color-chart-text)">
                  Y{Math.floor(localIndex / 12) + 1}
                </text>
              </g>
            );
          })}
          <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-axis)" />
          <line x1={margin.left} x2={margin.left + plotWidth} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-axis)" />
          {baselineBands && baselineSeries ? (
            <>
              <path
                d={areaPath(
                  Array.from({ length: baselineBands.p10.length }, (_, index) => xAt(index)),
                  baselineBands.p90.map(yAt),
                  baselineBands.p10.map(yAt),
                )}
                fill={baselineSeries.color}
                fillOpacity={0.12}
              />
              <path
                d={areaPath(
                  Array.from({ length: baselineBands.p25.length }, (_, index) => xAt(index)),
                  baselineBands.p75.map(yAt),
                  baselineBands.p25.map(yAt),
                )}
                fill={baselineSeries.color}
                fillOpacity={0.2}
              />
            </>
          ) : null}
          {slotSeries.map((entry, index) => (
            <path
              key={`wc-slot-${entry.slotId}`}
              d={linePath(entry.withdrawals.map((value: number, valueIndex: number) => ({ x: xAt(valueIndex), y: yAt(value) })))}
              fill="none"
              stroke={entry.color}
              strokeWidth={index === 0 ? 2.8 : 2.2}
            />
          ))}
          {!chartBreakdownEnabled
            ? compareStressEntries.map((entry) => (
                <path
                  key={`wc-stress-${entry.key}`}
                  d={linePath(entry.curve.map((value, valueIndex) => ({ x: xAt(valueIndex), y: yAt(value) })))}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={2}
                  strokeDasharray={entry.slotIndex > 0 ? '2 4' : undefined}
                  opacity={0.92}
                />
              ))
            : null}
          {hoverX !== null ? (
            <line x1={hoverX} y1={margin.top} x2={hoverX} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-text)" strokeDasharray="4 4" />
          ) : null}
        </svg>
        {hoverX !== null && (tooltipEntries.length > 0 || stressTooltipEntries.length > 0) ? (
          <div
            className="pointer-events-none absolute z-30 w-[300px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
            style={{
              left: `calc(${((hoverX - margin.left) / Math.max(plotWidth, 1)) * 100}% + ${hoverX > width * 0.72 ? -310 : 14}px)`,
              top: 10,
            }}
          >
            <p className="font-semibold text-slate-800">{hoverYear === null ? '—' : `Year ${hoverYear}`}</p>
            {baselinePercentileTooltip && baselineSeries ? (
              <div className="mt-2 rounded border border-slate-100 bg-slate-50 px-2 py-1">
                <p className="font-medium text-slate-700">Baseline {baselineSeries.slotId} Percentiles</p>
                <p className="mt-1 flex items-center justify-between gap-2"><span>p10</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(baselinePercentileTooltip.p10 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p25</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(baselinePercentileTooltip.p25 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p50</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(baselinePercentileTooltip.p50 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p75</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(baselinePercentileTooltip.p75 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p90</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(baselinePercentileTooltip.p90 ?? 0))}</span></p>
              </div>
            ) : null}
            <div className="mt-2 space-y-2 text-slate-600">
              {[...tooltipEntries, ...stressTooltipEntries].map((entry) => (
                <div key={entry.label} className="rounded border border-slate-100 bg-slate-50 px-2 py-1">
                  <p className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
                    <span
                      className="inline-block h-[2px] w-4 border-t-2"
                      style={{
                        borderTopColor: entry.color,
                        borderTopStyle: entry.dashed ? 'dashed' : 'solid',
                      }}
                    />
                    <span>{entry.label}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>Withdrawal</span>
                    <span className="font-mono text-slate-800">{formatCurrency(Math.round(entry.withdrawal))}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </div>
        <div className="rounded-md border border-brand-border bg-white/95 px-3 py-2 text-xs text-slate-700">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {slotSeries.map((entry) => (
              <div key={`wl-${entry.slotId}`} className="flex items-center gap-2">
                <span className="h-[2px] w-4" style={{ backgroundColor: entry.color }} />
                <span>Portfolio {entry.slotId}</span>
              </div>
            ))}
            {!chartBreakdownEnabled
              ? compareStressEntries.map((entry) => (
                  <div key={`legend-stress-${entry.key}`} className="flex items-center gap-2">
                    <span
                      className="inline-block w-4 border-t-2"
                      style={{
                        borderTopColor: entry.color,
                        borderTopStyle: entry.slotIndex > 0 ? 'dashed' : 'solid',
                      }}
                    />
                    <span className="max-w-[220px] truncate">{entry.label}</span>
                  </div>
                ))
              : null}
            {baselineSeries && baselineBands ? (
              <>
                <span className="text-[10px] font-semibold text-slate-500">Baseline Bands ({baselineSeries.slotId})</span>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-4 rounded" style={{ backgroundColor: baselineSeries.color, opacity: 0.2 }} />
                  <span>25-75</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-4 rounded" style={{ backgroundColor: baselineSeries.color, opacity: 0.12 }} />
                  <span>10-90</span>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (points.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface">
        <p className="text-sm text-slate-500">Run a simulation to see your withdrawal projection.</p>
      </div>
    );
  }

  // Check if all withdrawals are zero
  const useMcBands =
    simulationMode === SimulationMode.MonteCarlo &&
    !chartBreakdownEnabled &&
    mcWithdrawalBands !== null;
  const useMcMedianSeries =
    simulationMode === SimulationMode.MonteCarlo &&
    !chartBreakdownEnabled &&
    mcWithdrawalP50Series.length > 0;
  const allZero = useMcMedianSeries
    ? mcWithdrawalP50Series.every((value) => value === 0)
    : points.every((p) => p.totalNominal === 0);
  if (allZero) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface">
        <p className="text-sm text-slate-500">No withdrawals in this simulation.</p>
      </div>
    );
  }

  // Single simulation mode
  const totalMonths = points.length;
  const width = chartWidth;
  const plotWidth = width - margin.left - margin.right;
  const start = 0;
  const end = Math.max(totalMonths - 1, 1);
  const getVal = (point: WithdrawalPoint) => {
    if (chartDisplayMode === 'real') {
      return {
        total: point.totalReal,
        stocks: point.stocksReal,
        bonds: point.bondsReal,
        cash: point.cashReal,
      };
    }
    return {
      total: point.totalNominal,
      stocks: point.stocksNominal,
      bonds: point.bondsNominal,
      cash: point.cashNominal,
    };
  };
  const visible = points.slice(start, end + 1);
  const visibleSeries = useMcMedianSeries
    ? mcWithdrawalP50Series.slice(start, end + 1)
    : visible.map((point) => getVal(point).total);
  const visibleBands =
    useMcBands && mcWithdrawalBands
      ? {
          p10: mcWithdrawalBands.p10.slice(start, end + 1),
          p25: mcWithdrawalBands.p25.slice(start, end + 1),
          p50: mcWithdrawalBands.p50.slice(start, end + 1),
          p75: mcWithdrawalBands.p75.slice(start, end + 1),
          p90: mcWithdrawalBands.p90.slice(start, end + 1),
        }
      : null;
  const localCount = Math.max(visible.length - 1, 1);
  const xAt = (index: number): number => margin.left + (index / localCount) * plotWidth;

  const boundaryMonth = mode === AppMode.Tracking ? lastEditedMonthIndex : null;

  // Stress withdrawal curves
  const stressWithdrawalCurves = (stressResult?.scenarios ?? []).map((scenario) =>
    scenario.result.rows.map((row) => {
      const nominal = row.withdrawals.actual;
      if (chartDisplayMode === 'real') {
        return nominal / inflationFactor(activeRunInflationRate, row.monthIndex);
      }
      return nominal;
    }),
  );
  const visibleStressCurves = stressWithdrawalCurves.map((curve) => curve.slice(start, end + 1));

  const maxFromPoints = Math.max(...visibleSeries, 1);
  const maxFromBands = Math.max(1, ...(visibleBands?.p90 ?? []));
  const maxFromStress = Math.max(1, ...visibleStressCurves.flatMap((curve) => curve));
  const maxY = Math.max(maxFromPoints, maxFromBands, maxFromStress, 1);
  const yAt = (value: number): number => margin.top + plotHeight - (value / maxY) * plotHeight;

  const xValues = visible.map((_, index) => xAt(index));

  // Breakdown stacked areas
  const stocks = visible.map((point) => getVal(point).stocks);
  const bonds = visible.map((point) => getVal(point).bonds);
  const cash = visible.map((point) => getVal(point).cash);

  const stocksUpper = stocks.map(yAt);
  const stocksLower = stocks.map(() => yAt(0));
  const bondsUpper = stocks.map((stock, index) => yAt(stock + (bonds[index] ?? 0)));
  const bondsLower = stocks.map((stock) => yAt(stock));
  const cashUpper = stocks.map((stock, index) => yAt(stock + (bonds[index] ?? 0) + (cash[index] ?? 0)));
  const cashLower = stocks.map((stock, index) => yAt(stock + (bonds[index] ?? 0)));

  const totalLine = linePath(visibleSeries.map((value, index) => ({ x: xAt(index), y: yAt(value) })));
  const stressPaths = visibleStressCurves.map((curve) =>
    linePath(curve.map((value, index) => ({ x: xAt(index), y: yAt(value) }))),
  );

  const boundaryLocalIndex =
    boundaryMonth === null ? null : Math.max(0, Math.min(boundaryMonth - 1 - start, visible.length - 1));
  const boundaryX = boundaryLocalIndex === null ? null : xAt(boundaryLocalIndex);

  const yTicks = 6;
  const xTicks = Math.min(8, visible.length);
  const activeHoverIndex = hoverIndex === null ? null : Math.max(0, Math.min(hoverIndex, visible.length - 1));
  const hoverPoint = activeHoverIndex === null ? null : visible[activeHoverIndex];
  const hoverVal = hoverPoint ? getVal(hoverPoint) : null;
  const hoverX = activeHoverIndex === null ? null : xAt(activeHoverIndex);
  const hoverSeriesValue = activeHoverIndex === null ? null : visibleSeries[activeHoverIndex] ?? null;
  const hoverBands =
    activeHoverIndex === null || !visibleBands
      ? null
      : {
          p10: visibleBands.p10[activeHoverIndex] ?? null,
          p25: visibleBands.p25[activeHoverIndex] ?? null,
          p50: visibleBands.p50[activeHoverIndex] ?? null,
          p75: visibleBands.p75[activeHoverIndex] ?? null,
          p90: visibleBands.p90[activeHoverIndex] ?? null,
        };
  const hoverY = hoverSeriesValue === null ? null : yAt(hoverSeriesValue);

  const isMC = simulationMode === SimulationMode.MonteCarlo;

  return (
    <div className="relative overflow-visible">
      <div className="overflow-hidden rounded-lg">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full bg-white"
          onMouseLeave={() => onHoverChange(null)}
          onMouseMove={(event) => onHoverChange(mouseIndexFromEvent(event, width, plotWidth, localCount))}
        >
          {Array.from({ length: yTicks + 1 }, (_, index) => {
            const value = (maxY / yTicks) * (yTicks - index);
            const y = yAt(value);
            return (
              <g key={`wy-${index}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="var(--theme-color-chart-grid)"
                  strokeDasharray="4 4"
                />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--theme-color-chart-text)">
                  {formatCompactCurrency(Math.round(value))}
                </text>
              </g>
            );
          })}

          {Array.from({ length: xTicks }, (_, index) => {
            const ratio = xTicks <= 1 ? 0 : index / (xTicks - 1);
            const localIndex = Math.round(ratio * (visible.length - 1));
            const point = visible[localIndex];
            if (!point) {
              return null;
            }
            const x = xAt(localIndex);
            return (
              <g key={`wx-${index}`}>
                <line x1={x} y1={margin.top + plotHeight} x2={x} y2={margin.top + plotHeight + 5} stroke="var(--theme-color-chart-axis)" />
                <text x={x} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--theme-color-chart-text)">
                  Y{point.year}
                </text>
              </g>
            );
          })}

          <line
            x1={margin.left}
            y1={margin.top + plotHeight}
            x2={margin.left + plotWidth}
            y2={margin.top + plotHeight}
            stroke="var(--theme-color-chart-axis)"
          />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-axis)" />

          {chartBreakdownEnabled ? (
            <>
              <path d={areaPath(xValues, cashUpper, cashLower)} fill="var(--theme-color-asset-cash)" fillOpacity={0.66} />
              <path d={areaPath(xValues, bondsUpper, bondsLower)} fill="var(--theme-color-asset-bonds)" fillOpacity={0.66} />
              <path d={areaPath(xValues, stocksUpper, stocksLower)} fill="var(--theme-color-asset-stocks)" fillOpacity={0.66} />
            </>
          ) : visibleBands ? (
            <>
              <path d={areaPath(xValues, visibleBands.p10.map(yAt), visibleBands.p90.map(yAt))} fill="var(--theme-chart-mc-band-outer)" />
              <path d={areaPath(xValues, visibleBands.p25.map(yAt), visibleBands.p75.map(yAt))} fill="var(--theme-chart-mc-band-inner)" />
              <path d={linePath(visibleBands.p50.map((value, index) => ({ x: xAt(index), y: yAt(value) })))} fill="none" stroke="var(--theme-chart-mc-median-line)" strokeWidth="2.5" />
            </>
          ) : (
            <>
              <path
                d={`${totalLine} L ${xAt(visible.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`}
                fill="url(#withdrawalFill)"
              />
              <path d={totalLine} fill="none" stroke="var(--theme-chart-manual-line)" strokeWidth="2.5" />
            </>
          )}

          {!chartBreakdownEnabled
            ? stressPaths.map((path, index) => (
                <path
                  key={`wstress-${index}`}
                  d={path}
                  fill="none"
                  stroke={stressScenarioColors[index] ?? 'var(--theme-color-text-muted)'}
                  strokeWidth="2"
                  strokeDasharray="2 4"
                  opacity={0.95}
                />
              ))
            : null}

          <defs>
            <linearGradient id="withdrawalFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--theme-chart-manual-area-top)" />
              <stop offset="100%" stopColor="var(--theme-chart-manual-area-bottom)" />
            </linearGradient>
          </defs>

          {visibleBands ? (
            <g transform={`translate(${margin.left + plotWidth - 120}, ${margin.top + 8})`}>
              <rect x={0} y={0} width={116} height={52} rx={6} fill="var(--theme-color-overlay)" stroke="var(--theme-color-border-primary)" />
              <text x={10} y={16} fontSize="10" fill="var(--theme-color-text-secondary)">10-90%</text>
              <rect x={70} y={9} width={30} height={8} fill="var(--theme-chart-mc-band-outer)" />
              <text x={10} y={31} fontSize="10" fill="var(--theme-color-text-secondary)">25-75%</text>
              <rect x={70} y={24} width={30} height={8} fill="var(--theme-chart-mc-band-inner)" />
              <text x={10} y={46} fontSize="10" fill="var(--theme-color-text-secondary)">Median</text>
              <line x1={70} y1={42} x2={100} y2={42} stroke="var(--theme-chart-mc-median-line)" strokeWidth="2" />
            </g>
          ) : null}

          {hoverX !== null ? (
            <line x1={hoverX} y1={margin.top} x2={hoverX} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-text)" strokeDasharray="4 4" />
          ) : null}
          {boundaryX !== null && mode === AppMode.Tracking ? (
            <>
              <line x1={boundaryX} y1={margin.top} x2={boundaryX} y2={margin.top + plotHeight} stroke="var(--theme-color-info)" strokeDasharray="5 4" />
              <text x={boundaryX + 6} y={margin.top + 16} fontSize="10" fill="var(--theme-color-info)">
                Actuals {'->'} Simulated
              </text>
            </>
          ) : null}
          {hoverX !== null && hoverY !== null ? (
            <circle
              cx={hoverX}
              cy={hoverY}
              r={5}
              fill={visibleBands ? 'var(--theme-chart-mc-median-line)' : 'var(--theme-chart-manual-line)'}
            />
          ) : null}
        </svg>
      </div>

      {isMC && !visibleBands ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-brand-border bg-white/95 px-2 py-1 text-[10px] text-slate-500">
          {useMcMedianSeries ? '(median across runs)' : '(representative path)'}
        </div>
      ) : null}

      {!chartBreakdownEnabled && stressPaths.length > 0 ? (
        <div className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-700 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-block h-[2px] w-5 bg-brand-navy" />
            <span>Base</span>
          </div>
          {stressResult?.scenarios.map((scenario, index) => (
            <div key={scenario.scenarioId} className="flex items-center gap-2">
              <span
                className="inline-block w-5 border-t-2 border-dotted"
                style={{
                  borderTopColor: stressScenarioColors[index] ?? 'var(--theme-color-text-muted)',
                }}
              />
              <span className="max-w-[160px] truncate">{scenario.scenarioLabel}</span>
            </div>
          ))}
        </div>
      ) : null}

      {hoverPoint && hoverX !== null && hoverSeriesValue !== null ? (
        <div
          className="pointer-events-none absolute z-30 w-[260px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
          style={{
            left: `calc(${((hoverX - margin.left) / Math.max(plotWidth, 1)) * 100}% + ${hoverX > width * 0.72 ? -270 : 14}px)`,
            top: 10,
          }}
        >
          <p className="font-semibold text-slate-800">{formatPeriodLabel(hoverPoint.monthIndex, activeRunBirthDate, activeRunPortfolioStart)}</p>
          <div className="mt-2 space-y-1 text-slate-600">
            <p className="flex items-center justify-between gap-2">
              <span>Withdrawal</span>
              <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverSeriesValue))}</span>
            </p>
            {hoverBands ? (
              <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1">
                <p className="font-medium text-slate-700">Percentiles</p>
                <p className="mt-1 flex items-center justify-between gap-2"><span>p10</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p10 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p25</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p25 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p50</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p50 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p75</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p75 ?? 0))}</span></p>
                <p className="flex items-center justify-between gap-2"><span>p90</span><span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p90 ?? 0))}</span></p>
              </div>
            ) : null}
            {chartBreakdownEnabled && hoverVal ? (
              <>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--theme-color-asset-stocks)' }} />Stocks</span>
                  <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverVal.stocks))}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--theme-color-asset-bonds)' }} />Bonds</span>
                  <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverVal.bonds))}</span>
                </p>
                <p className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--theme-color-asset-cash)' }} />Cash</span>
                  <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverVal.cash))}</span>
                </p>
              </>
            ) : null}
            {!useMcMedianSeries && hoverPoint.shortfall > 0 ? (
              <p className="flex items-center justify-between gap-2 text-red-600">
                <span>Shortfall</span>
                <span className="font-mono">{formatCurrency(Math.round(
                  chartDisplayMode === 'real'
                    ? hoverPoint.shortfall / inflationFactor(activeRunInflationRate, hoverPoint.monthIndex)
                    : hoverPoint.shortfall
                ))}</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
