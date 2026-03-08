import { useMemo } from 'react';

import { AppMode, AssetClass, type MonthlySimulationRow, SimulationMode } from '@finapp/shared';

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

type WithdrawalChartProps = {
  hoverIndex: number | null;
  onHoverChange: (index: number | null) => void;
  chartWidth: number;
};

const height = CHART_HEIGHT;
const margin = CHART_MARGIN;
const plotHeight = PLOT_HEIGHT;

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
  }, [activeRunInflationRate, result]);

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
      const withdrawals = rows.map((row: MonthlySimulationRow) => {
        const nominal = row.withdrawals.actual;
        return chartDisplayMode === 'real'
          ? nominal / inflationFactor(slotInflationRate, row.monthIndex)
          : nominal;
      });
      return {
        slotId,
        color: getCompareSlotColorVar(slotId),
        rows,
        withdrawals,
        inflationRate: slotInflationRate,
      };
    });

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

    return (
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
        <div className="pointer-events-none absolute right-3 top-3 max-w-[220px] rounded-md border border-brand-border bg-white/95 px-3 py-2 text-xs text-slate-700">
          {slotSeries.map((entry) => (
            <div key={`wl-${entry.slotId}`} className="mt-1 flex items-center gap-2 first:mt-0">
              <span className="h-[2px] w-4" style={{ backgroundColor: entry.color }} />
              Portfolio {entry.slotId}
            </div>
          ))}
        </div>
        {hoverX !== null && (tooltipEntries.length > 0 || stressTooltipEntries.length > 0) ? (
          <div
            className="pointer-events-none absolute z-30 w-[300px] rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg"
            style={{
              left: `calc(${((hoverX - margin.left) / Math.max(plotWidth, 1)) * 100}% + ${hoverX > width * 0.72 ? -310 : 14}px)`,
              top: 10,
            }}
          >
            <p className="font-semibold text-slate-800">{hoverYear === null ? '—' : `Year ${hoverYear}`}</p>
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
  const allZero = points.every((p) => p.totalNominal === 0);
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
  const visible = points.slice(start, end + 1);
  const localCount = Math.max(visible.length - 1, 1);
  const xAt = (index: number): number => margin.left + (index / localCount) * plotWidth;

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

  const maxFromPoints = Math.max(...visible.map((point) => getVal(point).total), 1);
  const maxFromStress = Math.max(1, ...visibleStressCurves.flatMap((curve) => curve));
  const maxY = Math.max(maxFromPoints, maxFromStress, 1);
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

  const totalLine = linePath(visible.map((point, index) => ({ x: xAt(index), y: yAt(getVal(point).total) })));
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
  const hoverY = hoverVal ? yAt(hoverVal.total) : null;

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

      {isMC ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-brand-border bg-white/95 px-2 py-1 text-[10px] text-slate-500">
          (representative path)
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

      {hoverPoint && hoverVal && hoverX !== null ? (
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
              <span className="font-mono text-slate-800">{formatCurrency(Math.round(hoverVal.total))}</span>
            </p>
            {chartBreakdownEnabled ? (
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
            {hoverPoint.shortfall > 0 ? (
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
