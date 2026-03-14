import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AssetClass,
  HistoricalEra,
  type HistoricalDataSummary,
  type HistoricalRange,
  ReturnSource,
  HISTORICAL_ERA_DEFINITIONS,
} from '@finapp/shared';

import { fetchHistoricalSummary } from '../../api/historicalApi';
import { formatPercent } from '../../lib/format';
import { getHistoricalEventLabel, snapToHistoricalEventOrdinal } from '../../lib/historicalEvents';
import {
  useAppStore,
  useCompareFamilyLockUiState,
  useCompareInstanceLockUiState,
  type ReturnPhaseForm,
} from '../../store/useAppStore';
import { CompareSyncControl } from '../shared/CompareSyncControl';
import { Dropdown } from '../shared/Dropdown';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { PercentInput } from '../shared/PercentInput';
import { SegmentedToggle } from '../shared/SegmentedToggle';
import { ToggleSwitch } from '../shared/ToggleSwitch';

const SIMULATION_RUN_MIN = 1;
const SIMULATION_RUN_MAX = 10000;
const SIMULATION_RUN_MAGNET_STOPS = [100, 500, 1000, 5000] as const;
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
const annualizeReturn = (monthlyMean: number): number => (1 + monthlyMean) ** 12 - 1;
const annualizeStdDev = (monthlyStdDev: number): number => monthlyStdDev * Math.sqrt(12);
const ERA_COMMENTARY: Record<HistoricalEra, string> = {
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

const assetLabel: Record<AssetClass, string> = {
  [AssetClass.Stocks]: 'Stocks',
  [AssetClass.Bonds]: 'Bonds',
  [AssetClass.Cash]: 'Cash',
};

const rangeFromEraOption = (option: {
  startYear: number;
  startMonth?: number;
  endYear: number;
  endMonth?: number;
}): HistoricalRange => ({
  start: { year: option.startYear, month: option.startMonth ?? 1 },
  end: { year: option.endYear, month: option.endMonth ?? 12 },
});

const ensureEraLabelWithRange = (option: { label: string; startYear: number; endYear: number }): string => {
  const yearRange = `${option.startYear}-${option.endYear}`;
  if (option.label.includes(yearRange)) {
    return option.label;
  }
  if (/\(\d{4}\s*-\s*\d{4}\)/.test(option.label)) {
    return option.label;
  }
  return `${option.label} (${yearRange})`;
};

const snapSimulationRuns = (raw: number): number => {
  const clamped = Math.max(SIMULATION_RUN_MIN, Math.min(SIMULATION_RUN_MAX, Math.round(raw)));
  const closestStop = SIMULATION_RUN_MAGNET_STOPS.reduce((closest, stop) =>
    Math.abs(stop - clamped) < Math.abs(closest - clamped) ? stop : closest,
  );
  const snapWindow = Math.max(20, Math.round(closestStop * 0.08));
  if (Math.abs(closestStop - clamped) <= snapWindow) {
    return closestStop;
  }
  return clamped;
};

const fallbackEraOptions = HISTORICAL_ERA_DEFINITIONS
  .map((definition) => ({
    value: definition.key,
    label: ensureEraLabelWithRange({
      label: definition.label,
      startYear: definition.startYear,
      endYear: definition.endYear ?? new Date().getFullYear(),
    }),
  }))
  .concat({ value: HistoricalEra.Custom, label: 'Custom' });

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

type ReturnPhaseCardProps = {
  phase: ReturnPhaseForm;
  index: number;
  totalPhases: number;
  familyReadOnly: boolean;
  onRemove: () => void;
  onUpdate: (patch: Partial<ReturnPhaseForm>) => void;
};

const ReturnPhaseCard = ({
  phase,
  index,
  totalPhases,
  familyReadOnly,
  onRemove,
  onUpdate,
}: ReturnPhaseCardProps) => {
  const instanceUi = useCompareInstanceLockUiState('returnPhases', phase.id);
  const toggleInstanceLock = useAppStore((state) => state.toggleCompareInstanceLock);
  const setCompareSlotInstanceSync = useAppStore((state) => state.setCompareSlotInstanceSync);
  const readOnly = familyReadOnly || instanceUi.readOnly;

  const [summary, setSummary] = useState<HistoricalDataSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const customRangeKey = phase.customHistoricalRange
    ? `${phase.customHistoricalRange.start.month}-${phase.customHistoricalRange.start.year}-${phase.customHistoricalRange.end.month}-${phase.customHistoricalRange.end.year}`
    : 'none';

  useEffect(() => {
    if (phase.source !== ReturnSource.Historical) {
      return;
    }
    if (phase.selectedHistoricalEra === HistoricalEra.Custom && !phase.customHistoricalRange) {
      return;
    }

    let cancelled = false;
    setSummaryStatus('loading');
    void fetchHistoricalSummary(
      phase.selectedHistoricalEra,
      phase.selectedHistoricalEra === HistoricalEra.Custom ? phase.customHistoricalRange : null,
    )
      .then((response) => {
        if (cancelled) {
          return;
        }
        setSummary(response.summary);
        setSummaryStatus('loaded');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setSummaryStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [customRangeKey, phase.selectedHistoricalEra, phase.source]);

  useEffect(() => {
    if (
      phase.source !== ReturnSource.Historical ||
      phase.selectedHistoricalEra !== HistoricalEra.Custom ||
      phase.customHistoricalRange ||
      !summary
    ) {
      return;
    }
    const source =
      summary.eras.find((candidate) => candidate.key === phase.selectedHistoricalEra) ??
      summary.eras[0] ??
      summary.selectedEra;
    onUpdate({
      customHistoricalRange: rangeFromEraOption(source),
    });
  }, [onUpdate, phase.customHistoricalRange, phase.selectedHistoricalEra, phase.source, summary]);

  const sliderStartEventLabel =
    phase.selectedHistoricalEra === HistoricalEra.Custom && phase.customHistoricalRange
      ? getHistoricalEventLabel(
          phase.customHistoricalRange.start.month,
          phase.customHistoricalRange.start.year,
        )
      : null;
  const sliderEndEventLabel =
    phase.selectedHistoricalEra === HistoricalEra.Custom && phase.customHistoricalRange
      ? getHistoricalEventLabel(
          phase.customHistoricalRange.end.month,
          phase.customHistoricalRange.end.year,
        )
      : null;
  const startEventLabelState = useDecayingEventLabel(sliderStartEventLabel);
  const endEventLabelState = useDecayingEventLabel(sliderEndEventLabel);

  const derivedEraOptions = useMemo(() => {
    if (!summary) {
      return fallbackEraOptions;
    }
    return summary.eras
      .map((era) => ({
        label: ensureEraLabelWithRange({
          label: era.label,
          startYear: era.startYear,
          endYear: era.endYear,
        }),
        value: era.key,
      }))
      .concat({
        label:
          phase.customHistoricalRange
            ? `Custom (${formatMonthYear(phase.customHistoricalRange.start)} - ${formatMonthYear(phase.customHistoricalRange.end)})`
            : 'Custom',
        value: HistoricalEra.Custom,
      });
  }, [phase.customHistoricalRange, summary]);

  const starts = summary?.eras.map((era) =>
    toMonthOrdinal({ year: era.startYear, month: era.startMonth ?? 1 }),
  );
  const minMonthOrdinal = starts && starts.length > 0 ? Math.min(...starts) : undefined;
  const ends = summary?.eras.map((era) =>
    toMonthOrdinal({ year: era.endYear, month: era.endMonth ?? 12 }),
  );
  const maxMonthOrdinal = ends && ends.length > 0 ? Math.max(...ends) : undefined;
  const activeCustomRange =
    phase.customHistoricalRange ??
    (summary
      ? rangeFromEraOption(
          summary.eras.find((candidate) => candidate.key === phase.selectedHistoricalEra) ??
            summary.eras[0] ??
            summary.selectedEra,
        )
      : null);
  const startOrdinal = activeCustomRange ? toMonthOrdinal(activeCustomRange.start) : undefined;
  const endOrdinal = activeCustomRange ? toMonthOrdinal(activeCustomRange.end) : undefined;
  const sliderSpan =
    minMonthOrdinal !== undefined && maxMonthOrdinal !== undefined
      ? Math.max(1, maxMonthOrdinal - minMonthOrdinal)
      : 1;

  return (
    <div className="space-y-3 rounded-md border border-brand-border bg-brand-surface p-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-xs font-semibold text-[var(--theme-color-text-secondary)] uppercase tracking-[0.08em]">
          Return Phase {index + 1}
        </p>
        <CompareSyncControl
          slotId={instanceUi.slotId}
          locked={instanceUi.instanceLocked}
          synced={instanceUi.instanceSynced}
          onToggleLock={() => toggleInstanceLock('returnPhases', phase.id)}
          onToggleSync={(synced) =>
            setCompareSlotInstanceSync(instanceUi.slotId, 'returnPhases', phase.id, synced)
          }
          lockToggleDisabled={!instanceUi.canToggleLock}
          lockToggleDisabledReason={instanceUi.lockDisabledReason}
          compact
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={readOnly || totalPhases <= 1}
          className="rounded border border-brand-border px-2 py-1 text-xs disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className="text-[11px] text-[var(--theme-color-text-secondary)]">Start</p>
          <MonthYearPicker
            value={phase.start}
            onChange={(value) => onUpdate({ start: value })}
            disabled={readOnly}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-[var(--theme-color-text-secondary)]">End</p>
          <MonthYearPicker value={phase.end} onChange={(value) => onUpdate({ end: value })} disabled={readOnly} />
        </div>
      </div>

      <SegmentedToggle
        value={phase.source}
        onChange={(nextSource) => {
          if (!readOnly) {
            onUpdate({ source: nextSource });
          }
        }}
        className={`w-full ${readOnly ? 'pointer-events-none opacity-70' : ''}`}
        options={[
          { label: 'Manual', value: ReturnSource.Manual },
          { label: 'Historical', value: ReturnSource.Historical },
        ]}
      />

      {phase.source === ReturnSource.Manual ? (
        <div className="space-y-2 rounded border border-brand-border bg-brand-surface p-2">
          <div className="grid grid-cols-[70px_1fr_1fr] items-center gap-2 text-[11px] font-medium text-[var(--theme-color-text-secondary)]">
            <p>Asset</p>
            <p>Returns</p>
            <p>Volatility</p>
          </div>
          {(['stocks', 'bonds', 'cash'] as const).map((asset) => (
            <div key={asset} className="grid grid-cols-[70px_1fr_1fr] items-center gap-2">
              <p className="text-xs capitalize text-[var(--theme-color-text-secondary)]">{asset}</p>
              <PercentInput
                value={phase.returnAssumptions[asset].expectedReturn}
                min={-100}
                max={100}
                onChange={(value) =>
                  onUpdate({
                    returnAssumptions: {
                      ...phase.returnAssumptions,
                      [asset]: { ...phase.returnAssumptions[asset], expectedReturn: value },
                    },
                  })
                }
                disabled={readOnly}
              />
              <PercentInput
                value={phase.returnAssumptions[asset].stdDev}
                min={0}
                max={100}
                onChange={(value) =>
                  onUpdate({
                    returnAssumptions: {
                      ...phase.returnAssumptions,
                      [asset]: { ...phase.returnAssumptions[asset], stdDev: value },
                    },
                  })
                }
                disabled={readOnly}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 rounded border border-brand-border bg-brand-surface p-2">
          <Dropdown<HistoricalEra>
            value={phase.selectedHistoricalEra}
            onChange={(value) => {
              if (value === HistoricalEra.Custom && !phase.customHistoricalRange && summary) {
                const source =
                  summary.eras.find((candidate) => candidate.key === phase.selectedHistoricalEra) ??
                  summary.eras[0] ??
                  summary.selectedEra;
                onUpdate({
                  selectedHistoricalEra: value,
                  customHistoricalRange: rangeFromEraOption(source),
                });
                return;
              }
              onUpdate({ selectedHistoricalEra: value });
            }}
            options={derivedEraOptions}
            disabled={readOnly}
          />

          {phase.selectedHistoricalEra === HistoricalEra.Custom &&
          activeCustomRange &&
          minMonthOrdinal !== undefined &&
          maxMonthOrdinal !== undefined &&
          startOrdinal !== undefined &&
          endOrdinal !== undefined ? (
            <div className="space-y-2 rounded border border-brand-border bg-[color-mix(in_srgb,var(--theme-color-surface-primary)_92%,transparent)] p-2">
              <div className="flex items-center justify-between text-xs text-[var(--theme-color-text-secondary)]">
                <span>Range</span>
                <span className="font-medium">
                  {formatMonthYear(activeCustomRange.start)} - {formatMonthYear(activeCustomRange.end)}
                </span>
              </div>
              <div className="relative h-11">
                <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-between gap-3 text-[10px] text-[var(--theme-color-text-muted)]">
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
                  <div className="absolute left-0 right-0 top-3 h-1 rounded-full bg-[var(--theme-color-border-primary)]" />
                  <div
                    className="absolute top-3 h-1 rounded-full bg-[var(--theme-color-brand-blue)]"
                    style={{
                      left: `${((startOrdinal - minMonthOrdinal) / sliderSpan) * 100}%`,
                      width: `${((endOrdinal - startOrdinal) / sliderSpan) * 100}%`,
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
                      onUpdate({
                        customHistoricalRange: {
                          start: fromMonthOrdinal(nextStart),
                          end: activeCustomRange.end,
                        },
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
                      onUpdate({
                        customHistoricalRange: {
                          start: activeCustomRange.start,
                          end: fromMonthOrdinal(nextEnd),
                        },
                      });
                    }}
                    disabled={readOnly}
                    className="dual-range dual-range--end"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--theme-color-text-muted)]">
                <span>{formatMonthYear(fromMonthOrdinal(minMonthOrdinal))}</span>
                <span>{formatMonthYear(fromMonthOrdinal(maxMonthOrdinal))}</span>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--theme-color-text-secondary)]">
                Block Bootstrap Sampling
              </p>
              <ToggleSwitch
                checked={phase.blockBootstrapEnabled}
                onChange={(checked) => onUpdate({ blockBootstrapEnabled: checked })}
                disabled={readOnly}
              />
            </div>
            {phase.blockBootstrapEnabled ? (
              <div className="space-y-1 rounded border border-brand-border bg-[color-mix(in_srgb,var(--theme-color-surface-primary)_92%,transparent)] p-2">
                <p className="text-[11px] text-[var(--theme-color-text-secondary)]">
                  Block Length: {phase.blockBootstrapLength} months
                </p>
                <input
                  type="range"
                  min={3}
                  max={36}
                  step={1}
                  value={phase.blockBootstrapLength}
                  onChange={(event) => onUpdate({ blockBootstrapLength: Number(event.target.value) })}
                  className="w-full accent-brand-blue"
                  disabled={readOnly}
                />
                <p className="text-[11px] leading-snug text-[var(--theme-color-text-muted)]">
                  Samples contiguous blocks of {phase.blockBootstrapLength} months from historical data,
                  preserving short-run return correlations within each block.
                </p>
              </div>
            ) : null}
          </div>

          {summaryStatus === 'loading' && !summary ? (
            <p className="text-xs text-[var(--theme-color-text-muted)]">Loading historical summary...</p>
          ) : null}
          {summaryStatus === 'error' ? (
            <p className="text-xs text-[var(--theme-color-negative)]">Failed to load historical summary.</p>
          ) : null}

          {summary ? (
            <>
              <table className="w-full table-fixed text-xs">
                <thead>
                  <tr className="text-left text-[var(--theme-color-text-secondary)]">
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
                      <tr key={asset} className="border-t border-brand-border text-[var(--theme-color-text-secondary)]">
                        <td className="py-1.5 pr-1 font-medium">{assetLabel[asset]}</td>
                        <td className="py-1.5 pr-1">{formatPercent(annualizeReturn(row.meanReturn))}</td>
                        <td className="py-1.5 pr-1">{formatPercent(annualizeStdDev(row.stdDev))}</td>
                        <td className="py-1.5">{row.sampleSizeMonths.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="rounded border border-brand-border bg-[color-mix(in_srgb,var(--theme-color-surface-primary)_95%,transparent)] p-2">
                <p className="text-[11px] italic leading-snug text-[var(--theme-color-text-muted)]">
                  {ERA_COMMENTARY[summary.selectedEra.key]}
                </p>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export const ReturnPhases = () => {
  const phases = useAppStore((state) => state.returnPhases);
  const simulationRuns = useAppStore((state) => state.simulationRuns);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const setSimulationRuns = useAppStore((state) => state.setSimulationRuns);
  const addReturnPhase = useAppStore((state) => state.addReturnPhase);
  const removeReturnPhase = useAppStore((state) => state.removeReturnPhase);
  const updateReturnPhase = useAppStore((state) => state.updateReturnPhase);
  const familyLockState = useCompareFamilyLockUiState('returnPhases');

  return (
    <div className="space-y-3">
      <div className="rounded border border-brand-border bg-brand-surface p-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[var(--theme-color-text-secondary)]">Simulation Runs</p>
          <p className="text-[11px] text-[var(--theme-color-text-secondary)]">Effective: {simulationMode === 'manual' ? 1 : simulationRuns}</p>
        </div>
        <input
          type="range"
          min={SIMULATION_RUN_MIN}
          max={SIMULATION_RUN_MAX}
          step={1}
          value={simulationRuns}
          onChange={(event) => setSimulationRuns(snapSimulationRuns(Number(event.target.value)))}
          className="w-full accent-brand-blue"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--theme-color-text-secondary)]">
          <span>1</span>
          <span>10000</span>
        </div>
      </div>

      {phases.map((phase, index) => (
        <ReturnPhaseCard
          key={phase.id}
          phase={phase}
          index={index}
          totalPhases={phases.length}
          familyReadOnly={familyLockState.readOnly}
          onRemove={() => removeReturnPhase(phase.id)}
          onUpdate={(patch) => updateReturnPhase(phase.id, patch)}
        />
      ))}

      <button
        type="button"
        onClick={() => addReturnPhase()}
        disabled={phases.length >= 8 || familyLockState.readOnly}
        className="w-full rounded border border-dashed border-brand-navy py-2 text-sm font-medium text-brand-navy disabled:opacity-40"
      >
        Add Return Phase
      </button>
    </div>
  );
};
