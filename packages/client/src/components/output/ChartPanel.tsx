import { useEffect, useRef, useState } from 'react';

import { AppMode } from '@finapp/shared';

import { useAppStore, useIsCompareActive, useTrackingOutputsStale } from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';
import { PortfolioChart } from './PortfolioChart';
import { WithdrawalChart } from './WithdrawalChart';

const SIDE_BY_SIDE_MIN = 900;
const CHART_GAP = 16;

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
    <span className="text-base leading-none">&#9719;</span>
    <span>Breakdown</span>
  </button>
);

export const ChartPanel = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartDisplayMode = useAppStore((state) => state.ui.chartDisplayMode);
  const chartBreakdownEnabled = useAppStore((state) => state.ui.chartBreakdownEnabled);
  const setChartDisplayMode = useAppStore((state) => state.setChartDisplayMode);
  const setChartBreakdownEnabled = useAppStore((state) => state.setChartBreakdownEnabled);
  const mode = useAppStore((state) => state.mode);
  const trackingOutputsStale = useTrackingOutputsStale();
  const simulationStatus = useAppStore((state) => state.simulationResults.status);
  const isCompareActive = useIsCompareActive();

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
      setContainerWidth(Math.round(entry.contentRect.width));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const sideBySide = containerWidth >= SIDE_BY_SIDE_MIN;
  const chartWidth = sideBySide
    ? Math.max(600, Math.round((containerWidth - CHART_GAP) / 2))
    : Math.max(600, containerWidth);

  return (
    <section
      className="relative rounded-xl border border-brand-border bg-white p-4 shadow-panel"
      style={
        mode === AppMode.Tracking && trackingOutputsStale
          ? { opacity: 0.6, filter: 'saturate(0.82)' }
          : undefined
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4">
        <SegmentedToggle
          value={chartDisplayMode}
          onChange={setChartDisplayMode}
          options={[
            { label: 'Nominal', value: 'nominal' },
            { label: 'Real', value: 'real' },
          ]}
        />
        {!isCompareActive ? (
          <BreakdownLabelToggle checked={chartBreakdownEnabled} onChange={setChartBreakdownEnabled} />
        ) : null}
      </div>

      <div
        ref={containerRef}
        className={`${sideBySide ? 'flex' : 'flex flex-col'} gap-4`}
      >
        <div className={`${sideBySide ? 'flex-1' : 'w-full'} min-w-0 rounded-lg border border-brand-border`}>
          <div className="mb-1 px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Portfolio Value</div>
          <PortfolioChart
            hoverIndex={hoverIndex}
            onHoverChange={setHoverIndex}
            chartWidth={chartWidth}
          />
        </div>
        <div className={`${sideBySide ? 'flex-1' : 'w-full'} min-w-0 rounded-lg border border-brand-border`}>
          <div className="mb-1 px-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Monthly Withdrawal</div>
          <WithdrawalChart
            hoverIndex={hoverIndex}
            onHoverChange={setHoverIndex}
            chartWidth={chartWidth}
          />
        </div>
      </div>

      {mode === AppMode.Tracking && trackingOutputsStale ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--theme-color-text-secondary)' }}>
          Results are stale after edits. Run Simulation to refresh projections.
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
