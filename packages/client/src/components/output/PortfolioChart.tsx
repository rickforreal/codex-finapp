import { useMemo, useState } from 'react';

import { AssetClass } from '@finapp/shared';

import { formatCompactCurrency, formatCurrency, formatPeriodLabel } from '../../lib/format';
import { useActiveSimulationResult, useAppStore } from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';
import { ToggleSwitch } from '../shared/ToggleSwitch';

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

const width = 980;
const height = 360;
const margin = { top: 20, right: 24, bottom: 44, left: 80 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

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
  const result = useActiveSimulationResult();
  const chartDisplayMode = useAppStore((state) => state.ui.chartDisplayMode);
  const chartBreakdownEnabled = useAppStore((state) => state.ui.chartBreakdownEnabled);
  const chartZoom = useAppStore((state) => state.ui.chartZoom);
  const setChartDisplayMode = useAppStore((state) => state.setChartDisplayMode);
  const setChartBreakdownEnabled = useAppStore((state) => state.setChartBreakdownEnabled);
  const setChartZoom = useAppStore((state) => state.setChartZoom);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const startingAge = useAppStore((state) => state.coreParams.startingAge);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo<ChartPoint[]>(() => {
    const rows = result?.result.rows ?? [];
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

  if (points.length === 0) {
    return (
      <section className="rounded-xl border border-brand-border bg-white p-4 shadow-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <ToggleSwitch checked={false} onChange={() => undefined} label="By Asset Class" />
          <SegmentedToggle
            value="nominal"
            onChange={() => undefined}
            options={[
              { label: 'Nominal', value: 'nominal' },
              { label: 'Real', value: 'real' },
            ]}
          />
        </div>
        <div className="flex h-[360px] items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface">
          <p className="text-sm text-slate-500">Run a simulation to see your portfolio projection.</p>
        </div>
      </section>
    );
  }

  const totalMonths = points.length;
  const start = Math.max(0, Math.min(chartZoom?.start ?? 0, totalMonths - 1));
  const end = Math.max(start + 1, Math.min(chartZoom?.end ?? totalMonths - 1, totalMonths - 1));
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

  const maxY = Math.max(...visible.map((point) => getSeries(point).total), 1);
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

  const totalLine = linePath(visible.map((point, index) => ({ x: xAt(index), y: yAt(getSeries(point).total) })));

  const yTicks = 6;
  const xTicks = Math.min(8, visible.length);
  const activeHoverIndex = hoverIndex === null ? null : Math.max(0, Math.min(hoverIndex, visible.length - 1));
  const hoverPoint = activeHoverIndex === null ? null : visible[activeHoverIndex];
  const hoverSeries = hoverPoint ? getSeries(hoverPoint) : null;
  const hoverX = activeHoverIndex === null ? null : xAt(activeHoverIndex);
  const hoverY = hoverSeries ? yAt(hoverSeries.total) : null;

  const zoomTo = (nextStart: number, nextEnd: number) => {
    if (nextStart <= 0 && nextEnd >= totalMonths - 1) {
      setChartZoom(null);
      return;
    }
    setChartZoom({ start: nextStart, end: nextEnd });
  };

  return (
    <section className="rounded-xl border border-brand-border bg-white p-4 shadow-panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ToggleSwitch checked={chartBreakdownEnabled} onChange={setChartBreakdownEnabled} label="By Asset Class" />
        <SegmentedToggle
          value={chartDisplayMode}
          onChange={setChartDisplayMode}
          options={[
            { label: 'Nominal', value: 'nominal' },
            { label: 'Real', value: 'real' },
          ]}
        />
      </div>

      <div className="relative overflow-hidden rounded-lg border border-brand-border">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[360px] w-full bg-white"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const cursorX = event.clientX - rect.left;
            const bounded = Math.max(margin.left, Math.min(cursorX, rect.width - margin.right));
            const ratio = (bounded - margin.left) / Math.max(rect.width - margin.left - margin.right, 1);
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
          ) : (
            <>
              <path
                d={`${totalLine} L ${xAt(visible.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`}
                fill="url(#portfolioFill)"
              />
              <path d={totalLine} fill="none" stroke="#1A365D" strokeWidth="2.5" />
            </>
          )}

          <defs>
            <linearGradient id="portfolioFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1A365D33" />
              <stop offset="100%" stopColor="#1A365D08" />
            </linearGradient>
          </defs>

          {hoverX !== null ? (
            <line x1={hoverX} y1={margin.top} x2={hoverX} y2={margin.top + plotHeight} stroke="#64748B" strokeDasharray="4 4" />
          ) : null}
          {hoverX !== null && hoverY !== null ? <circle cx={hoverX} cy={hoverY} r={5} fill="#1A365D" /> : null}
        </svg>

        {hoverPoint && hoverSeries && hoverX !== null ? (
          <div
            className="pointer-events-none absolute z-10 w-[220px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
            style={{
              left: `calc(${((hoverX - margin.left) / Math.max(plotWidth, 1)) * 100}% + ${hoverX > width * 0.7 ? -220 : 12}px)`,
              top: 16,
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
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-brand-border bg-brand-surface p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
          <span>
            Visible range: months {start + 1}-{end + 1} of {totalMonths}
          </span>
          {chartZoom ? (
            <button
              type="button"
              className="rounded border border-brand-border bg-white px-2 py-1 font-medium text-slate-700"
              onClick={() => setChartZoom(null)}
            >
              Reset Zoom
            </button>
          ) : null}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-slate-600">Start Month</span>
            <input
              type="range"
              min={0}
              max={Math.max(totalMonths - 2, 0)}
              value={start}
              onChange={(event) => {
                const nextStart = Math.min(Number(event.target.value), end - 1);
                zoomTo(nextStart, end);
              }}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-600">End Month</span>
            <input
              type="range"
              min={1}
              max={Math.max(totalMonths - 1, 1)}
              value={end}
              onChange={(event) => {
                const nextEnd = Math.max(Number(event.target.value), start + 1);
                zoomTo(start, nextEnd);
              }}
              className="w-full"
            />
          </label>
        </div>
      </div>
    </section>
  );
};
