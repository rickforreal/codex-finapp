import { useEffect, useMemo, useRef, useState } from 'react';

import { AppMode, AssetClass, type MonthlySimulationRow, SimulationMode } from '@finapp/shared';

import { formatCompactCurrency, formatCurrency, formatPeriodLabel } from '../../lib/format';
import { useActiveSimulationResult, useAppStore, useCompareSimulationResults } from '../../store/useAppStore';
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

type CompareTooltipPoint = {
  label: string;
  color: string;
  dashed?: boolean;
  portfolio: number;
  withdrawal: number;
};

const height = 360;
const margin = { top: 20, right: 10, bottom: 44, left: 56 };
const plotHeight = height - margin.top - margin.bottom;
const stressScenarioColors = [
  'var(--theme-color-stress-a)',
  'var(--theme-color-stress-b)',
  'var(--theme-color-stress-c)',
  'var(--theme-color-stress-d)',
];

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

const totalFromRow = (row: MonthlySimulationRow): number =>
  row.endBalances[AssetClass.Stocks] + row.endBalances[AssetClass.Bonds] + row.endBalances[AssetClass.Cash];

export const PortfolioChart = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(1200);
  const result = useActiveSimulationResult();
  const compareResults = useCompareSimulationResults();
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
  const simulationStatus = useAppStore((state) => state.simulationResults.status);

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

  if (mode === AppMode.Compare) {
    const resolveRows = (workspace: (typeof compareResults)['leftWorkspace']) => {
      if (!workspace) {
        return [] as MonthlySimulationRow[];
      }
      const preferred =
        simulationMode === SimulationMode.Manual
          ? workspace.simulationResults.manual
          : workspace.simulationResults.monteCarlo;
      const fallback = workspace.simulationResults.manual ?? workspace.simulationResults.monteCarlo;
      return (preferred ?? fallback)?.result.rows ?? [];
    };
    const buildTotals = (rows: MonthlySimulationRow[]) =>
      rows.map((row) => {
        const nominal = totalFromRow(row);
        return chartDisplayMode === 'real'
          ? nominal / inflationFactor(inflationRate, row.monthIndex)
          : nominal;
      });

    const leftRows = resolveRows(compareResults.leftWorkspace);
    const rightRows = resolveRows(compareResults.rightWorkspace);
    if (leftRows.length === 0 && rightRows.length === 0) {
      return (
        <section className="rounded-xl border border-brand-border bg-white p-4 shadow-panel">
          <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface">
            <p className="text-sm text-slate-500">Run compare simulation to see both portfolio projections.</p>
          </div>
        </section>
      );
    }

    const leftTotals = buildTotals(leftRows);
    const rightTotals = buildTotals(rightRows);
    const maxCount = Math.max(leftTotals.length, rightTotals.length, 1);
    const width = chartWidth;
    const plotWidth = width - margin.left - margin.right;
    const xAt = (index: number): number => margin.left + (index / Math.max(maxCount - 1, 1)) * plotWidth;
    const maxY = Math.max(1, ...leftTotals, ...rightTotals);
    const yAt = (value: number): number => margin.top + plotHeight - (value / maxY) * plotHeight;
    const leftPath = linePath(leftTotals.map((value, index) => ({ x: xAt(index), y: yAt(value) })));
    const rightPath = linePath(rightTotals.map((value, index) => ({ x: xAt(index), y: yAt(value) })));
    const yTicks = 6;
    const xTicks = Math.min(8, maxCount);
    const localCount = Math.max(maxCount - 1, 1);

    const activeHoverIndex = hoverIndex === null ? null : Math.max(0, Math.min(hoverIndex, maxCount - 1));
    const hoverX = activeHoverIndex === null ? null : xAt(activeHoverIndex);
    const leftHoverRow = activeHoverIndex === null ? null : leftRows[activeHoverIndex];
    const rightHoverRow = activeHoverIndex === null ? null : rightRows[activeHoverIndex];
    const toDisplay = (row: MonthlySimulationRow, value: number) =>
      chartDisplayMode === 'real' ? value / inflationFactor(inflationRate, row.monthIndex) : value;
    const tooltipPoints: CompareTooltipPoint[] = [
      leftHoverRow
        ? {
            label: 'Portfolio A',
            color: 'var(--theme-chart-manual-line)',
            portfolio: toDisplay(leftHoverRow, totalFromRow(leftHoverRow)),
            withdrawal: toDisplay(leftHoverRow, leftHoverRow.withdrawals.actual),
          }
        : null,
      rightHoverRow
        ? {
            label: 'Portfolio B',
            color: 'var(--theme-color-stress-a)',
            dashed: true,
            portfolio: toDisplay(rightHoverRow, totalFromRow(rightHoverRow)),
            withdrawal: toDisplay(rightHoverRow, rightHoverRow.withdrawals.actual),
          }
        : null,
    ].filter((entry): entry is CompareTooltipPoint => entry !== null);
    const hoverYear = activeHoverIndex === null ? null : Math.floor(activeHoverIndex / 12) + 1;

    return (
      <section className="rounded-xl border border-brand-border bg-white p-4 shadow-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="ml-auto flex items-center gap-4">
            <SegmentedToggle
              value={chartDisplayMode}
              onChange={(value) => setChartDisplayMode(value as 'nominal' | 'real')}
              options={[
                { label: 'Nominal', value: 'nominal' },
                { label: 'Real', value: 'real' },
              ]}
            />
          </div>
        </div>
        <div ref={containerRef} className="relative overflow-visible rounded-lg border border-brand-border bg-brand-surface">
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
                <g key={`compare-y-${index}`}>
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
              const localIndex = Math.round(ratio * (maxCount - 1));
              const x = xAt(localIndex);
              return (
                <g key={`compare-x-${index}`}>
                  <line x1={x} y1={margin.top + plotHeight} x2={x} y2={margin.top + plotHeight + 5} stroke="var(--theme-color-chart-axis)" />
                  <text x={x} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--theme-color-chart-text)">
                    Y{Math.floor(localIndex / 12) + 1}
                  </text>
                </g>
              );
            })}

            <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-axis)" />
            <line
              x1={margin.left}
              x2={margin.left + plotWidth}
              y1={margin.top + plotHeight}
              y2={margin.top + plotHeight}
              stroke="var(--theme-color-chart-axis)"
            />
            <path d={rightPath} fill="none" stroke="var(--theme-color-stress-a)" strokeWidth={2.5} strokeDasharray="6 4" />
            <path d={leftPath} fill="none" stroke="var(--theme-chart-manual-line)" strokeWidth={3} />

            {hoverX !== null ? (
              <line x1={hoverX} y1={margin.top} x2={hoverX} y2={margin.top + plotHeight} stroke="var(--theme-color-chart-text)" strokeDasharray="4 4" />
            ) : null}
          </svg>
          <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-brand-border bg-white/95 px-3 py-2 text-xs text-slate-700">
            <div className="flex items-center gap-2"><span className="h-[2px] w-4 bg-[var(--theme-chart-manual-line)]" />Portfolio A</div>
            <div className="mt-1 flex items-center gap-2"><span className="h-[2px] w-4 bg-[var(--theme-color-stress-a)]" />Portfolio B</div>
          </div>
          {hoverX !== null && tooltipPoints.length > 0 ? (
            <div
              className="pointer-events-none absolute z-30 w-[280px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
              style={{
                left: `calc(${((hoverX - margin.left) / Math.max(plotWidth, 1)) * 100}% + ${hoverX > width * 0.72 ? -290 : 14}px)`,
                top: 10,
              }}
            >
              <p className="font-semibold text-slate-800">{hoverYear === null ? '—' : `Year ${hoverYear}`}</p>
              <div className="mt-2 space-y-2 text-slate-600">
                {tooltipPoints.map((entry) => (
                  <div key={entry.label} className="rounded border border-slate-100 bg-slate-50 px-2 py-1">
                    <p className="mb-1 flex items-center gap-1.5 font-medium text-slate-700">
                      <span
                        className={`inline-block h-[2px] w-4 ${entry.dashed ? 'border-t-2 border-dashed' : ''}`}
                        style={entry.dashed ? { borderTopColor: entry.color } : { backgroundColor: entry.color }}
                      />
                      <span>{entry.label}</span>
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
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

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
              color: stressScenarioColors[index] ?? 'var(--theme-color-text-muted)',
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
    <section className="relative rounded-xl border border-brand-border bg-white p-4 shadow-panel">
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
              <g key={`x-${index}`}>
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
            <g opacity={mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && mcStale ? 0.4 : 1}>
              {mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && boundaryMonth !== null ? (
                <>
                  <path d={leftRealizedLine} fill="none" stroke="var(--theme-chart-manual-line)" strokeWidth="2.5" />
                  {rightBandX.length > 1 ? (
                    <>
                      <path d={areaPath(rightBandX, rightBandP10.map(yAt), rightBandP90.map(yAt))} fill="var(--theme-chart-mc-band-outer)" />
                      <path d={areaPath(rightBandX, rightBandP25.map(yAt), rightBandP75.map(yAt))} fill="var(--theme-chart-mc-band-inner)" />
                      <path
                        d={linePath(rightBandP50.map((value, index) => ({ x: rightBandX[index] ?? 0, y: yAt(value) })))}
                        fill="none"
                        stroke="var(--theme-chart-mc-median-line)"
                        strokeWidth="2.5"
                      />
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <path d={areaPath(xValues, visibleBands.p10.map(yAt), visibleBands.p90.map(yAt))} fill="var(--theme-chart-mc-band-outer)" />
                  <path d={areaPath(xValues, visibleBands.p25.map(yAt), visibleBands.p75.map(yAt))} fill="var(--theme-chart-mc-band-inner)" />
                  <path d={mcMedianLine} fill="none" stroke="var(--theme-chart-mc-median-line)" strokeWidth="2.5" />
                </>
              )}
              <g transform={`translate(${margin.left + plotWidth - 120}, ${margin.top + 8})`}>
                <rect x={0} y={0} width={116} height={52} rx={6} fill="var(--theme-color-overlay)" stroke="var(--theme-color-border-primary)" />
                <text x={10} y={16} fontSize="10" fill="var(--theme-color-text-secondary)">10-90%</text>
                <rect x={70} y={9} width={30} height={8} fill="var(--theme-chart-mc-band-outer)" />
                <text x={10} y={31} fontSize="10" fill="var(--theme-color-text-secondary)">25-75%</text>
                <rect x={70} y={24} width={30} height={8} fill="var(--theme-chart-mc-band-inner)" />
                <text x={10} y={46} fontSize="10" fill="var(--theme-color-text-secondary)">Median</text>
                <line x1={70} y1={42} x2={100} y2={42} stroke="var(--theme-chart-mc-median-line)" strokeWidth="2" />
              </g>
            </g>
          ) : (
            <>
              <path
                d={`${manualLine} L ${xAt(visible.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`}
                fill="url(#portfolioFill)"
              />
              <path d={manualLine} fill="none" stroke="var(--theme-chart-manual-line)" strokeWidth="2.5" />
            </>
          )}

          {!chartBreakdownEnabled
            ? stressPaths.map((path, index) => (
                <path
                  key={`stress-scenario-${index}`}
                  d={path}
                  fill="none"
                  stroke={stressScenarioColors[index] ?? 'var(--theme-color-text-muted)'}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity={0.95}
                />
              ))
            : null}

          <defs>
            <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--theme-chart-manual-area-top)" />
              <stop offset="100%" stopColor="var(--theme-chart-manual-area-bottom)" />
            </linearGradient>
          </defs>

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
            {hoverX !== null && hoverY !== null ? <circle cx={hoverX} cy={hoverY} r={5} fill="var(--theme-chart-manual-line)" /> : null}
          </svg>
        </div>

        {!chartBreakdownEnabled && stressPaths.length > 0 ? (
          <div className="absolute right-3 top-3 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-[11px] text-slate-700 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-[2px] w-5 bg-brand-navy" />
              <span>Base</span>
            </div>
            {stressResult?.scenarios.map((scenario, index) => (
              <div key={scenario.scenarioId} className="flex items-center gap-2">
                <span
                  className="inline-block w-5 border-t-2 border-dashed"
                  style={{
                    borderTopColor: stressScenarioColors[index] ?? 'var(--theme-color-text-muted)',
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
      {simulationStatus === 'running' ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-white/65 backdrop-blur-[1px]">
          <div className="rounded-md border border-brand-border bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue align-[-1px]" />
            Running simulation...
          </div>
        </div>
      ) : null}
    </section>
  );
};
