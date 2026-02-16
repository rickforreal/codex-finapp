import { useEffect, useMemo, useRef, useState } from 'react';

import { AppMode, AssetClass, SimulationMode } from '@finapp/shared';

import { formatCompactCurrency, formatCurrency, formatPeriodLabel } from '../../lib/format';
import { useActiveSimulationResult, useAppStore } from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';

type ChartPoint = {
  monthIndex: number;
  year: number;
  withdrawalNominal: number;
  withdrawalReal: number;
  stocksNominal: number;
  bondsNominal: number;
  cashNominal: number;
  stocksReal: number;
  bondsReal: number;
  cashReal: number;
};

type MonteCarloBands = {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
};

type StressTooltipPoint = {
  scenarioId: string;
  scenarioLabel: string;
  color: string;
  portfolio: number;
  withdrawal: number;
};

const height = 360;
const margin = { top: 20, right: 10, bottom: 44, left: 56 };
const plotHeight = height - margin.top - margin.bottom;
const stressScenarioColors = ['#E67E22', '#8E44AD', '#16A085', '#2C3E80'];

const inflationFactor = (inflationRate: number, monthIndex: number): number => (1 + inflationRate) ** (monthIndex / 12);

const linePath = (points: Array<{ x: number; y: number }>): string => {
  if (points.length === 0) {
    return '';
  }
  const [first, ...rest] = points;
  if (!first) {
    return '';
  }
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')}`;
};

const areaPath = (xValues: number[], upper: number[], lower: number[]): string => {
  if (xValues.length === 0) {
    return '';
  }
  const top = xValues.map((x, index) => `${x} ${upper[index] ?? 0}`).join(' L ');
  const bottom = [...xValues]
    .reverse()
    .map((x, reverseIndex) => {
      const sourceIndex = xValues.length - 1 - reverseIndex;
      return `${x} ${lower[sourceIndex] ?? 0}`;
    })
    .join(' L ');
  return `M ${top} L ${bottom} Z`;
};

export const PortfolioChart = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(1200);
  const result = useActiveSimulationResult();
  const chartDisplayMode = useAppStore((state) => state.ui.chartDisplayMode);
  const chartBreakdownEnabled = useAppStore((state) => state.ui.chartBreakdownEnabled);
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const mcStale = useAppStore((state) => state.simulationResults.mcStale);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const setChartDisplayMode = useAppStore((state) => state.setChartDisplayMode);
  const setChartBreakdownEnabled = useAppStore((state) => state.setChartBreakdownEnabled);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const startingAge = useAppStore((state) => state.coreParams.startingAge);
  const stressResult = useAppStore((state) => state.stress.result);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const BreakdownLabelToggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (next: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition ${
        checked ? 'text-blue-500' : 'text-slate-500 hover:text-slate-700'
      }`}
      aria-pressed={checked}
    >
      <span className="text-base leading-none">◷</span>
      <span>Breakdown</span>
    </button>
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const nextWidth = Math.max(1200, Math.round(entry.contentRect.width));
      setChartWidth(nextWidth);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const points = useMemo<ChartPoint[]>(() => {
    const rows =
      mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo
        ? (useAppStore.getState().simulationResults.reforecast?.result.rows ?? result?.result.rows ?? [])
        : (result?.result.rows ?? []);
    return rows.map((row) => {
      const factor = inflationFactor(inflationRate, row.monthIndex);
      const stocksNominal = row.endBalances[AssetClass.Stocks];
      const bondsNominal = row.endBalances[AssetClass.Bonds];
      const cashNominal = row.endBalances[AssetClass.Cash];
      return {
        monthIndex: row.monthIndex,
        year: row.year,
        withdrawalNominal: row.withdrawals.actual,
        withdrawalReal: row.withdrawals.actual / factor,
        stocksNominal,
        bondsNominal,
        cashNominal,
        stocksReal: stocksNominal / factor,
        bondsReal: bondsNominal / factor,
        cashReal: cashNominal / factor,
      };
    });
  }, [inflationRate, result]);

  const monteCarloBands = useMemo<MonteCarloBands | null>(() => {
    if (simulationMode !== SimulationMode.MonteCarlo || !result?.monteCarlo) {
      return null;
    }

    const toDisplayValue = (value: number, monthIndexOneBased: number) =>
      chartDisplayMode === 'real' ? value / inflationFactor(inflationRate, monthIndexOneBased) : value;

    return {
      p10: result.monteCarlo.percentileCurves.total.p10.map((value, index) => toDisplayValue(value, index + 1)),
      p25: result.monteCarlo.percentileCurves.total.p25.map((value, index) => toDisplayValue(value, index + 1)),
      p50: result.monteCarlo.percentileCurves.total.p50.map((value, index) => toDisplayValue(value, index + 1)),
      p75: result.monteCarlo.percentileCurves.total.p75.map((value, index) => toDisplayValue(value, index + 1)),
      p90: result.monteCarlo.percentileCurves.total.p90.map((value, index) => toDisplayValue(value, index + 1)),
    };
  }, [chartDisplayMode, inflationRate, result, simulationMode]);

  if (points.length === 0) {
    return (
      <section className="rounded-xl border border-brand-border bg-white p-4 shadow-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="ml-auto flex items-center gap-4">
            <SegmentedToggle
              value="real"
              onChange={() => undefined}
              options={[
                { label: 'Nominal', value: 'nominal' },
                { label: 'Real', value: 'real' },
              ]}
            />
            <BreakdownLabelToggle checked={false} onChange={() => undefined} />
          </div>
        </div>
        <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface">
          <p className="text-sm text-slate-500">Run a simulation to see your portfolio projection.</p>
        </div>
      </section>
    );
  }

  const totalMonths = points.length;
  const width = chartWidth;
  const plotWidth = width - margin.left - margin.right;
  const start = 0;
  const end = Math.max(totalMonths - 1, 1);
  const visible = points.slice(start, end + 1);
  const localCount = Math.max(visible.length - 1, 1);
  const xAt = (index: number): number => margin.left + (index / localCount) * plotWidth;

  const getSeries = (point: ChartPoint) => {
    if (chartDisplayMode === 'real') {
      return {
        stocks: point.stocksReal,
        bonds: point.bondsReal,
        cash: point.cashReal,
        total: point.stocksReal + point.bondsReal + point.cashReal,
        withdrawal: point.withdrawalReal,
      };
    }
    return {
      stocks: point.stocksNominal,
      bonds: point.bondsNominal,
      cash: point.cashNominal,
      total: point.stocksNominal + point.bondsNominal + point.cashNominal,
      withdrawal: point.withdrawalNominal,
    };
  };

  const visibleBands =
    monteCarloBands === null
      ? null
      : {
          p10: monteCarloBands.p10.slice(start, end + 1),
          p25: monteCarloBands.p25.slice(start, end + 1),
          p50: monteCarloBands.p50.slice(start, end + 1),
          p75: monteCarloBands.p75.slice(start, end + 1),
          p90: monteCarloBands.p90.slice(start, end + 1),
        };
  const boundaryMonth = mode === AppMode.Tracking ? lastEditedMonthIndex : null;

  const maxFromPoints = Math.max(...visible.map((point) => getSeries(point).total), 1);
  const maxFromBands = visibleBands ? Math.max(...visibleBands.p90, 1) : 1;
  const stressScenarioCurves = (stressResult?.scenarios ?? []).map((scenario) =>
    scenario.result.rows.map((row) => {
      const nominal = row.endBalances.stocks + row.endBalances.bonds + row.endBalances.cash;
      if (chartDisplayMode === 'real') {
        return nominal / inflationFactor(inflationRate, row.monthIndex);
      }
      return nominal;
    }),
  );
  const visibleStressCurves = stressScenarioCurves.map((curve) => curve.slice(start, end + 1));
  const maxFromStress = Math.max(1, ...visibleStressCurves.flatMap((curve) => curve));
  const mcFocusedCeiling =
    visibleBands && !chartBreakdownEnabled
      ? Math.max(1, Math.max(...visibleBands.p75, ...visibleBands.p50, maxFromPoints) * 1.15)
      : null;
  const maxY =
    simulationMode === SimulationMode.MonteCarlo && mcFocusedCeiling !== null
      ? Math.max(1, mcFocusedCeiling)
      : Math.max(maxFromPoints, maxFromBands, maxFromStress, 1);
  const yAt = (value: number): number => margin.top + plotHeight - (value / maxY) * plotHeight;

  const xValues = visible.map((_, index) => xAt(index));
  const stocks = visible.map((point) => getSeries(point).stocks);
  const bonds = visible.map((point) => getSeries(point).bonds);
  const cash = visible.map((point) => getSeries(point).cash);

  const stocksUpper = stocks.map(yAt);
  const stocksLower = stocks.map(() => yAt(0));
  const bondsUpper = stocks.map((stock, index) => yAt(stock + (bonds[index] ?? 0)));
  const bondsLower = stocks.map((stock) => yAt(stock));
  const cashUpper = stocks.map((stock, index) => yAt(stock + (bonds[index] ?? 0) + (cash[index] ?? 0)));
  const cashLower = stocks.map((stock, index) => yAt(stock + (bonds[index] ?? 0)));

  const manualLine = linePath(visible.map((point, index) => ({ x: xAt(index), y: yAt(getSeries(point).total) })));
  const mcMedianLine = linePath(
    (visibleBands?.p50 ?? []).map((value, index) => ({ x: xAt(index), y: yAt(value) })),
  );
  const stressPaths = visibleStressCurves.map((curve) =>
    linePath(curve.map((value, index) => ({ x: xAt(index), y: yAt(value) }))),
  );
  const boundaryLocalIndex =
    boundaryMonth === null ? null : Math.max(0, Math.min(boundaryMonth - 1 - start, visible.length - 1));
  const boundaryX = boundaryLocalIndex === null ? null : xAt(boundaryLocalIndex);
  const rightBandStartLocal =
    boundaryMonth === null ? 0 : Math.max(0, Math.min(boundaryMonth - start, visible.length - 1));
  const rightBandX = xValues.slice(rightBandStartLocal);
  const rightBandP10 = visibleBands?.p10.slice(rightBandStartLocal) ?? [];
  const rightBandP25 = visibleBands?.p25.slice(rightBandStartLocal) ?? [];
  const rightBandP50 = visibleBands?.p50.slice(rightBandStartLocal) ?? [];
  const rightBandP75 = visibleBands?.p75.slice(rightBandStartLocal) ?? [];
  const rightBandP90 = visibleBands?.p90.slice(rightBandStartLocal) ?? [];
  const leftRealizedLine = linePath(
    visible
      .filter((point) => (boundaryMonth === null ? true : point.monthIndex <= boundaryMonth))
      .map((point, index, all) => {
        const sourceIndex = visible.findIndex((candidate) => candidate.monthIndex === point.monthIndex);
        const localIndex = sourceIndex >= 0 ? sourceIndex : Math.min(index, all.length - 1);
        return { x: xAt(localIndex), y: yAt(getSeries(point).total) };
      }),
  );

  const yTicks = 6;
  const xTicks = Math.min(8, visible.length);
  const activeHoverIndex = hoverIndex === null ? null : Math.max(0, Math.min(hoverIndex, visible.length - 1));
  const hoverPoint = activeHoverIndex === null ? null : visible[activeHoverIndex];
  const hoverSeries = hoverPoint ? getSeries(hoverPoint) : null;
  const hoverBands = activeHoverIndex === null || !visibleBands
    ? null
    : {
        p10: visibleBands.p10[activeHoverIndex] ?? 0,
        p25: visibleBands.p25[activeHoverIndex] ?? 0,
        p50: visibleBands.p50[activeHoverIndex] ?? 0,
        p75: visibleBands.p75[activeHoverIndex] ?? 0,
        p90: visibleBands.p90[activeHoverIndex] ?? 0,
      };
  const hoverMonthIndex = hoverPoint?.monthIndex ?? null;
  const stressTooltipPoints: StressTooltipPoint[] =
    hoverMonthIndex === null
      ? []
      : (stressResult?.scenarios ?? [])
          .map((scenario, index) => {
            const row = scenario.result.rows[hoverMonthIndex - 1];
            if (!row) {
              return null;
            }
            const nominalPortfolio = row.endBalances.stocks + row.endBalances.bonds + row.endBalances.cash;
            const factor = inflationFactor(inflationRate, row.monthIndex);
            return {
              scenarioId: scenario.scenarioId,
              scenarioLabel: scenario.scenarioLabel,
              color: stressScenarioColors[index] ?? '#64748B',
              portfolio: chartDisplayMode === 'real' ? nominalPortfolio / factor : nominalPortfolio,
              withdrawal:
                chartDisplayMode === 'real' ? row.withdrawals.actual / factor : row.withdrawals.actual,
            };
          })
          .filter((entry): entry is StressTooltipPoint => entry !== null);
  const hoverX = activeHoverIndex === null ? null : xAt(activeHoverIndex);
  const hoverY =
    hoverBands && !chartBreakdownEnabled
      ? yAt(hoverBands.p50)
      : hoverSeries
        ? yAt(hoverSeries.total)
        : null;

  return (
    <section className="rounded-xl border border-brand-border bg-white p-4 shadow-panel">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4">
        <SegmentedToggle
          value={chartDisplayMode}
          onChange={setChartDisplayMode}
          options={[
            { label: 'Nominal', value: 'nominal' },
            { label: 'Real', value: 'real' },
          ]}
        />
        <BreakdownLabelToggle checked={chartBreakdownEnabled} onChange={setChartBreakdownEnabled} />
      </div>

      <div ref={containerRef} className="relative overflow-visible rounded-lg border border-brand-border">
        <div className="overflow-hidden rounded-lg">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[360px] w-full bg-white"
            onMouseLeave={() => setHoverIndex(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const scaleX = width / Math.max(rect.width, 1);
              const cursorX = (event.clientX - rect.left) * scaleX;
              const bounded = Math.max(margin.left, Math.min(cursorX, width - margin.right));
              const ratio = (bounded - margin.left) / Math.max(plotWidth, 1);
              const index = Math.round(ratio * localCount);
              setHoverIndex(index);
            }}
          >
          {Array.from({ length: yTicks + 1 }, (_, index) => {
            const value = (maxY / yTicks) * (yTicks - index);
            const y = yAt(value);
            return (
              <g key={`y-${index}`}>
                <line x1={margin.left} y1={y} x2={margin.left + plotWidth} y2={y} stroke="#E8EDF6" strokeDasharray="4 4" />
                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#64748B">
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
              <g key={`x-${index}`}>
                <line x1={x} y1={margin.top + plotHeight} x2={x} y2={margin.top + plotHeight + 5} stroke="#94A3B8" />
                <text x={x} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748B">
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
            stroke="#B8C2D6"
          />
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotHeight} stroke="#B8C2D6" />

          {chartBreakdownEnabled ? (
            <>
              <path d={areaPath(xValues, cashUpper, cashLower)} fill="#D9A441AA" />
              <path d={areaPath(xValues, bondsUpper, bondsLower)} fill="#2EAD8EAA" />
              <path d={areaPath(xValues, stocksUpper, stocksLower)} fill="#4A90D9AA" />
            </>
          ) : visibleBands ? (
            <g opacity={mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && mcStale ? 0.4 : 1}>
              {mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && boundaryMonth !== null ? (
                <>
                  <path d={leftRealizedLine} fill="none" stroke="#1A365D" strokeWidth="2.5" />
                  {rightBandX.length > 1 ? (
                    <>
                      <path d={areaPath(rightBandX, rightBandP10.map(yAt), rightBandP90.map(yAt))} fill="#93C5FD55" />
                      <path d={areaPath(rightBandX, rightBandP25.map(yAt), rightBandP75.map(yAt))} fill="#60A5FA66" />
                      <path
                        d={linePath(rightBandP50.map((value, index) => ({ x: rightBandX[index] ?? 0, y: yAt(value) })))}
                        fill="none"
                        stroke="#1A365D"
                        strokeWidth="2.5"
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <path d={areaPath(xValues, visibleBands.p10.map(yAt), visibleBands.p90.map(yAt))} fill="#93C5FD55" />
                  <path d={areaPath(xValues, visibleBands.p25.map(yAt), visibleBands.p75.map(yAt))} fill="#60A5FA66" />
                  <path d={mcMedianLine} fill="none" stroke="#1A365D" strokeWidth="2.5" />
                </>
              )}
              <g transform={`translate(${margin.left + plotWidth - 120}, ${margin.top + 8})`}>
                <rect x={0} y={0} width={116} height={52} rx={6} fill="#FFFFFFE6" stroke="#D9DFEA" />
                <text x={10} y={16} fontSize="10" fill="#475569">10-90%</text>
                <rect x={70} y={9} width={30} height={8} fill="#93C5FD55" />
                <text x={10} y={31} fontSize="10" fill="#475569">25-75%</text>
                <rect x={70} y={24} width={30} height={8} fill="#60A5FA66" />
                <text x={10} y={46} fontSize="10" fill="#475569">Median</text>
                <line x1={70} y1={42} x2={100} y2={42} stroke="#1A365D" strokeWidth="2" />
              </g>
            </g>
          ) : (
            <>
              <path
                d={`${manualLine} L ${xAt(visible.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`}
                fill="url(#portfolioFill)"
              />
              <path d={manualLine} fill="none" stroke="#1A365D" strokeWidth="2.5" />
            </>
          )}

          {!chartBreakdownEnabled
            ? stressPaths.map((path, index) => (
                <path
                  key={`stress-scenario-${index}`}
                  d={path}
                  fill="none"
                  stroke={stressScenarioColors[index] ?? '#64748B'}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity={0.95}
                />
              ))
            : null}

          <defs>
            <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1A365D33" />
              <stop offset="100%" stopColor="#1A365D08" />
            </linearGradient>
          </defs>

          {hoverX !== null ? (
            <line x1={hoverX} y1={margin.top} x2={hoverX} y2={margin.top + plotHeight} stroke="#64748B" strokeDasharray="4 4" />
          ) : null}
          {boundaryX !== null && mode === AppMode.Tracking ? (
            <>
              <line x1={boundaryX} y1={margin.top} x2={boundaryX} y2={margin.top + plotHeight} stroke="#1D4ED8" strokeDasharray="5 4" />
              <text x={boundaryX + 6} y={margin.top + 16} fontSize="10" fill="#1E3A8A">
                Actuals {'->'} Simulated
              </text>
            </>
          ) : null}
            {hoverX !== null && hoverY !== null ? <circle cx={hoverX} cy={hoverY} r={5} fill="#1A365D" /> : null}
          </svg>
        </div>

        {!chartBreakdownEnabled && stressPaths.length > 0 ? (
          <div className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-700 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-[2px] w-5 bg-[#1A365D]" />
              <span>Base</span>
            </div>
            {stressResult?.scenarios.map((scenario, index) => (
              <div key={scenario.scenarioId} className="flex items-center gap-2">
                <span
                  className="inline-block w-5 border-t-2 border-dashed"
                  style={{
                    borderTopColor: stressScenarioColors[index] ?? '#64748B',
                  }}
                />
                <span className="max-w-[160px] truncate">{scenario.scenarioLabel}</span>
              </div>
            ))}
          </div>
        ) : null}

        {hoverPoint && hoverSeries && hoverX !== null ? (
          <div
            className="pointer-events-none absolute z-30 w-[280px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
            style={{
              left: `calc(${((hoverX - margin.left) / Math.max(plotWidth, 1)) * 100}% + ${hoverX > width * 0.72 ? -290 : 14}px)`,
              top: 10,
            }}
          >
            <p className="font-semibold text-slate-800">{formatPeriodLabel(hoverPoint.monthIndex, startingAge)}</p>
            <div className="mt-2 space-y-1 text-slate-600">
              <p className="flex items-center justify-between gap-2">
                <span>Portfolio</span>
                <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverSeries.total))}</span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span>Withdrawal</span>
                <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverSeries.withdrawal))}</span>
              </p>
              {stressTooltipPoints.length > 0 ? (
                <>
                  <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Stress Scenarios
                  </p>
                  {stressTooltipPoints.map((entry) => (
                    <div key={entry.scenarioId} className="rounded border border-slate-100 bg-slate-50 px-2 py-1">
                      <p className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span>{entry.scenarioLabel}</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span>Portfolio</span>
                        <span className="font-mono text-slate-800">{formatCurrency(Math.round(entry.portfolio))}</span>
                      </p>
                      <p className="flex items-center justify-between gap-2">
                        <span>Withdrawal</span>
                        <span className="font-mono text-slate-800">{formatCurrency(Math.round(entry.withdrawal))}</span>
                      </p>
                    </div>
                  ))}
                </>
              ) : null}
              {hoverBands && !chartBreakdownEnabled ? (
                <>
                  <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Percentiles
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>P10</span>
                    <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p10))}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>P25</span>
                    <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p25))}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>P50</span>
                    <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p50))}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>P75</span>
                    <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p75))}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span>P90</span>
                    <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverBands.p90))}</span>
                  </p>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      {mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && mcStale ? (
        <p className="mt-2 text-xs text-amber-700">
          Monte Carlo results are stale after edits. Run Simulation to refresh projections.
        </p>
      ) : null}
    </section>
  );
};
