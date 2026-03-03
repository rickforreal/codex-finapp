import { useEffect, useRef, useState } from 'react';
import { AssetClass, HistoricalEra, SimulationMode, type HistoricalRange } from '@finapp/shared';

import { fetchHistoricalSummary } from '../../api/historicalApi';
import { formatPercent } from '../../lib/format';
import { getHistoricalEventLabel, snapToHistoricalEventOrdinal } from '../../lib/historicalEvents';
import { useAppStore } from '../../store/useAppStore';
import { Dropdown } from '../shared/Dropdown';
import { ToggleSwitch } from '../shared/ToggleSwitch';

const assetLabel: Record<AssetClass, string> = {
  [AssetClass.Stocks]: 'Stocks',
  [AssetClass.Bonds]: 'Bonds',
  [AssetClass.Cash]: 'Cash',
};

const annualizeReturn = (monthlyMean: number): number => (1 + monthlyMean) ** 12 - 1;
const annualizeStdDev = (monthlyStdDev: number): number => monthlyStdDev * Math.sqrt(12);
const EVENT_LABEL_HOLD_MS = 250;
const EVENT_LABEL_FADE_MS = 100;
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const toMonthOrdinal = (monthYear: { month: number; year: number }): number =>
  monthYear.year * 12 + (monthYear.month - 1);
const fromMonthOrdinal = (ordinal: number): { month: number; year: number } => ({
  year: Math.floor(ordinal / 12),
  month: (ordinal % 12) + 1,
});
const formatMonthYear = (monthYear: { month: number; year: number }): string =>
  monthYearFormatter.format(new Date(monthYear.year, monthYear.month - 1, 1));
const rangeFromEraOption = (option: {
  startYear: number;
  startMonth?: number;
  endYear: number;
  endMonth?: number;
}): HistoricalRange => ({
  start: { year: option.startYear, month: option.startMonth ?? 1 },
  end: { year: option.endYear, month: option.endMonth ?? 12 },
});

const useDecayingEventLabel = (eventLabel: string | null): { text: string; visible: boolean } => {
  const [labelState, setLabelState] = useState<{ text: string; visible: boolean }>({
    text: '',
    visible: false,
  });
  const stateRef = useRef(labelState);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = labelState;
  }, [labelState]);

  useEffect(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }

    if (eventLabel) {
      setLabelState({ text: eventLabel, visible: true });
      return;
    }

    if (!stateRef.current.text) {
      setLabelState({ text: '', visible: false });
      return;
    }

    holdTimeoutRef.current = setTimeout(() => {
      setLabelState((prev) => ({ ...prev, visible: false }));
      fadeTimeoutRef.current = setTimeout(() => {
        setLabelState({ text: '', visible: false });
      }, EVENT_LABEL_FADE_MS);
    }, EVENT_LABEL_HOLD_MS);

    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };
  }, [eventLabel]);

  return labelState;
};

const eraCommentary: Record<HistoricalEra, string> = {
  [HistoricalEra.FullHistory]:
    'Long-run blended sample from 1926 onward. Useful as a broad baseline across multiple market regimes.',
  [HistoricalEra.DepressionEra]:
    '1926-1945. High economic stress, deep drawdowns, and elevated regime uncertainty.',
  [HistoricalEra.PostWarBoom]:
    '1945-1972. Post-war expansion with strong growth and comparatively stable financial conditions.',
  [HistoricalEra.StagflationEra]:
    '1966-1982. High inflation and weak real returns in many periods; challenging for fixed spending plans.',
  [HistoricalEra.OilCrisis]:
    '1973-1982. Energy shocks and inflation pressure created volatile, policy-sensitive return environments.',
  [HistoricalEra.Post1980BullRun]:
    '1980 onward. Characterized by declining interest rates, globalization, and the modern tech expansion.',
  [HistoricalEra.LostDecade]:
    '2000-2012. Equity-heavy allocations saw muted growth and multiple large drawdowns.',
  [HistoricalEra.PostGfcRecovery]:
    '2009 onward. Recovery and long risk-asset run-up under low-rate monetary conditions.',
  [HistoricalEra.Custom]:
    'Custom month-year window over the historical dataset. Useful for isolating specific market regimes and start/end boundaries.',
};

export const HistoricalDataSummary = ({ readOnly }: { readOnly?: boolean }) => {
  const summary = useAppStore((state) => state.historicalData.summary);
  const status = useAppStore((state) => state.historicalData.status);
  const errorMessage = useAppStore((state) => state.historicalData.errorMessage);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const selectedHistoricalEra = useAppStore((state) => state.selectedHistoricalEra);
  const customHistoricalRange = useAppStore((state) => state.customHistoricalRange);
  const setSelectedHistoricalEra = useAppStore((state) => state.setSelectedHistoricalEra);
  const setCustomHistoricalRange = useAppStore((state) => state.setCustomHistoricalRange);
  const setHistoricalSummaryStatus = useAppStore((state) => state.setHistoricalSummaryStatus);
  const setHistoricalSummary = useAppStore((state) => state.setHistoricalSummary);
  const blockBootstrapEnabled = useAppStore((state) => state.blockBootstrapEnabled);
  const blockBootstrapLength = useAppStore((state) => state.blockBootstrapLength);
  const setBlockBootstrapEnabled = useAppStore((state) => state.setBlockBootstrapEnabled);
  const setBlockBootstrapLength = useAppStore((state) => state.setBlockBootstrapLength);
  const sliderStartEventLabel =
    selectedHistoricalEra === HistoricalEra.Custom && customHistoricalRange
      ? getHistoricalEventLabel(customHistoricalRange.start.month, customHistoricalRange.start.year)
      : null;
  const sliderEndEventLabel =
    selectedHistoricalEra === HistoricalEra.Custom && customHistoricalRange
      ? getHistoricalEventLabel(customHistoricalRange.end.month, customHistoricalRange.end.year)
      : null;
  const startEventLabelState = useDecayingEventLabel(sliderStartEventLabel);
  const endEventLabelState = useDecayingEventLabel(sliderEndEventLabel);

  useEffect(() => {
    if (simulationMode !== SimulationMode.MonteCarlo) {
      return;
    }
    if (selectedHistoricalEra === HistoricalEra.Custom && !customHistoricalRange && summary) {
      const source = summary.eras[0] ?? summary.selectedEra;
      setCustomHistoricalRange(rangeFromEraOption(source));
    }
  }, [
    customHistoricalRange,
    selectedHistoricalEra,
    setCustomHistoricalRange,
    simulationMode,
    summary,
  ]);

  useEffect(() => {
    if (simulationMode !== SimulationMode.MonteCarlo) {
      return;
    }
    if (selectedHistoricalEra === HistoricalEra.Custom && !customHistoricalRange) {
      return;
    }

    setHistoricalSummaryStatus('loading');
    void fetchHistoricalSummary(
      selectedHistoricalEra,
      selectedHistoricalEra === HistoricalEra.Custom ? customHistoricalRange : null,
    )
      .then((response) => {
        setHistoricalSummary(response.summary);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load historical summary';
        setHistoricalSummaryStatus('error', message);
      });
  }, [
    customHistoricalRange,
    selectedHistoricalEra,
    setHistoricalSummary,
    setHistoricalSummaryStatus,
    simulationMode,
  ]);

  if (status === 'loading' && !summary) {
    return <p className="text-xs text-slate-500 px-1">Loading historical data summary...</p>;
  }

  if (status === 'error') {
    return <p className="text-xs text-rose-700 px-1">{errorMessage ?? 'Failed to load historical data summary.'}</p>;
  }

  if (!summary) {
    return <p className="text-xs text-slate-500 px-1">Select Monte Carlo mode to load historical data summary.</p>;
  }

  const eraOptions = summary.eras.map((era) => ({
    label: era.label,
    value: era.key,
  })).concat({
    label:
      customHistoricalRange
        ? `Custom (${formatMonthYear(customHistoricalRange.start)} - ${formatMonthYear(customHistoricalRange.end)})`
        : 'Custom',
    value: HistoricalEra.Custom,
  });

  const eraValue = eraOptions.some((option) => option.value === selectedHistoricalEra)
    ? selectedHistoricalEra
    : (eraOptions[0]?.value ?? selectedHistoricalEra);
  const starts = summary.eras.map((era) =>
    toMonthOrdinal({ year: era.startYear, month: era.startMonth ?? 1 }),
  );
  const minMonthOrdinal = starts.length > 0
    ? Math.min(...starts)
    : toMonthOrdinal({ year: summary.selectedEra.startYear, month: summary.selectedEra.startMonth ?? 1 });
  const ends = summary.eras.map((era) =>
    toMonthOrdinal({ year: era.endYear, month: era.endMonth ?? 12 }),
  );
  const maxMonthOrdinal = ends.length > 0
    ? Math.max(...ends)
    : toMonthOrdinal({ year: summary.selectedEra.endYear, month: summary.selectedEra.endMonth ?? 12 });
  const activeCustomRange = customHistoricalRange
    ? customHistoricalRange
    : rangeFromEraOption(
        summary.eras.find((candidate) => candidate.key === selectedHistoricalEra) ??
          summary.eras[0] ??
          summary.selectedEra,
      );
  const startOrdinal = toMonthOrdinal(activeCustomRange.start);
  const endOrdinal = toMonthOrdinal(activeCustomRange.end);
  const span = Math.max(1, maxMonthOrdinal - minMonthOrdinal);

  const handleEraChange = (nextEra: HistoricalEra) => {
    if (nextEra === HistoricalEra.Custom && !customHistoricalRange) {
      const source =
        summary.eras.find((candidate) => candidate.key === selectedHistoricalEra) ??
        summary.eras[0] ??
        summary.selectedEra;
      setCustomHistoricalRange(rangeFromEraOption(source));
    }
    setSelectedHistoricalEra(nextEra);
  };

  return (
    <div className="space-y-3 rounded-lg border border-brand-border bg-brand-surface p-3">
      <div className="space-y-1">
        <p className="theme-commandbar-section-label px-1 text-[10px] font-semibold uppercase tracking-[0.14em]">Historical Era</p>
        <Dropdown<HistoricalEra>
          value={eraValue}
          onChange={handleEraChange}
          options={eraOptions}
          disabled={readOnly}
        />
      </div>

      {selectedHistoricalEra === HistoricalEra.Custom ? (
        <div className="space-y-2 rounded border border-slate-200 bg-white p-2">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span>Range</span>
            <span className="font-medium">
              {formatMonthYear(activeCustomRange.start)} - {formatMonthYear(activeCustomRange.end)}
            </span>
          </div>
          <div className="relative h-11">
            <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between gap-3 text-[10px] text-slate-500">
              <span
                className={`max-w-[48%] truncate text-left transition-opacity duration-100 ${startEventLabelState.visible ? 'opacity-100' : 'opacity-0'}`}
                title={startEventLabelState.text || undefined}
              >
                {startEventLabelState.text}
              </span>
              <span
                className={`max-w-[48%] truncate text-right transition-opacity duration-100 ${endEventLabelState.visible ? 'opacity-100' : 'opacity-0'}`}
                title={endEventLabelState.text || undefined}
              >
                {endEventLabelState.text}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-7">
              <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-slate-200" />
              <div
                className="absolute top-3 h-1 rounded-full bg-brand-blue"
                style={{
                  left: `${((startOrdinal - minMonthOrdinal) / span) * 100}%`,
                  width: `${((endOrdinal - startOrdinal) / span) * 100}%`,
                }}
              />
              <input
                type="range"
                min={minMonthOrdinal}
                max={maxMonthOrdinal}
                step={1}
                value={startOrdinal}
                onChange={(event) => {
                  const rawStart = Number(event.target.value);
                  const snappedStart = snapToHistoricalEventOrdinal(rawStart, {
                    minOrdinal: minMonthOrdinal,
                    maxOrdinal: maxMonthOrdinal,
                  });
                  const nextStart = Math.min(snappedStart, endOrdinal);
                  setCustomHistoricalRange({
                    start: fromMonthOrdinal(nextStart),
                    end: activeCustomRange.end,
                  });
                }}
                disabled={readOnly}
                className="dual-range dual-range--start"
              />
              <input
                type="range"
                min={minMonthOrdinal}
                max={maxMonthOrdinal}
                step={1}
                value={endOrdinal}
                onChange={(event) => {
                  const rawEnd = Number(event.target.value);
                  const snappedEnd = snapToHistoricalEventOrdinal(rawEnd, {
                    minOrdinal: minMonthOrdinal,
                    maxOrdinal: maxMonthOrdinal,
                  });
                  const nextEnd = Math.max(snappedEnd, startOrdinal);
                  setCustomHistoricalRange({
                    start: activeCustomRange.start,
                    end: fromMonthOrdinal(nextEnd),
                  });
                }}
                disabled={readOnly}
                className="dual-range dual-range--end"
              />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>{formatMonthYear(fromMonthOrdinal(minMonthOrdinal))}</span>
            <span>{formatMonthYear(fromMonthOrdinal(maxMonthOrdinal))}</span>
          </div>
          <p className="text-[11px] leading-snug text-slate-500">
            Inclusive month-year range used to filter historical returns for summary statistics and Monte Carlo sampling.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-slate-700">Block Bootstrap Sampling</span>
          <ToggleSwitch
            checked={blockBootstrapEnabled}
            onChange={setBlockBootstrapEnabled}
            disabled={readOnly}
          />
        </div>

        {blockBootstrapEnabled && (
          <div className="space-y-1.5 rounded border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Block length</span>
              <span className="font-medium">{blockBootstrapLength} months</span>
            </div>
            <input
              type="range"
              min={3}
              max={36}
              step={1}
              value={blockBootstrapLength}
              onChange={(e) => setBlockBootstrapLength(Number(e.target.value))}
              disabled={readOnly}
              className="w-full accent-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>3</span>
              <span>36</span>
            </div>
            <p className="text-[11px] leading-snug text-slate-500">
              Samples contiguous blocks of {blockBootstrapLength} months from historical data, preserving short-run return correlations within each block.
            </p>
          </div>
        )}
      </div>

      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="w-[24%] pb-1 pr-1 font-medium">Asset</th>
            <th className="w-[24%] pb-1 pr-1 font-medium">Returns</th>
            <th className="w-[24%] pb-1 pr-1 font-medium">Volatility</th>
            <th className="w-[28%] pb-1 font-medium">Months</th>
          </tr>
        </thead>
        <tbody>
          {[AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash].map((asset) => {
            const row = summary.byAsset[asset];
            return (
              <tr key={asset} className="border-t border-slate-200 text-slate-700">
                <td className="py-1.5 pr-1 font-medium">{assetLabel[asset]}</td>
                <td className="py-1.5 pr-1">{formatPercent(annualizeReturn(row.meanReturn))}</td>
                <td className="py-1.5 pr-1">{formatPercent(annualizeStdDev(row.stdDev))}</td>
                <td className="py-1.5">{row.sampleSizeMonths.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-600">
        <p className="italic">{eraCommentary[summary.selectedEra.key]}</p>
      </div>
    </div>
  );
};
