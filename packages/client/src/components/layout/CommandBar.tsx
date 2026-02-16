import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { AppMode, DrawdownStrategyType, HistoricalEra, SimulationMode } from '@finapp/shared';

import { fetchHistoricalSummary } from '../../api/historicalApi';
import { runSimulation } from '../../api/simulationApi';
import { SnapshotLoadError, applySnapshot, serializeSnapshot } from '../../store/snapshot';
import { getCurrentConfig, useAppStore } from '../../store/useAppStore';
import { Dropdown } from '../shared/Dropdown';
import { SegmentedToggle } from '../shared/SegmentedToggle';

const mergeRowsWithPreservedBoundary = <
  T extends {
    endBalances: { stocks: number; bonds: number; cash: number };
  },
>(
  nextRows: T[],
  preservedRows: T[],
  boundaryMonthIndex: number,
): { rows: T[]; terminalPortfolioValue: number | null } => {
  const mergedRows = [...nextRows];
  if (boundaryMonthIndex > 0 && preservedRows.length === mergedRows.length) {
    for (let index = 0; index < boundaryMonthIndex; index += 1) {
      mergedRows[index] = preservedRows[index] ?? mergedRows[index]!;
    }
  }

  const terminal = mergedRows[mergedRows.length - 1]?.endBalances;
  return {
    rows: mergedRows,
    terminalPortfolioValue: terminal ? terminal.stocks + terminal.bonds + terminal.cash : null,
  };
};

export const CommandBar = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const status = useAppStore((state) => state.simulationResults.status);
  const setMode = useAppStore((state) => state.setMode);
  const setSimulationMode = useAppStore((state) => state.setSimulationMode);
  const selectedHistoricalEra = useAppStore((state) => state.selectedHistoricalEra);
  const setSelectedHistoricalEra = useAppStore((state) => state.setSelectedHistoricalEra);
  const historicalSummary = useAppStore((state) => state.historicalData.summary);
  const historicalStatus = useAppStore((state) => state.historicalData.status);
  const setHistoricalSummaryStatus = useAppStore((state) => state.setHistoricalSummaryStatus);
  const setHistoricalSummary = useAppStore((state) => state.setHistoricalSummary);
  const setSimulationStatus = useAppStore((state) => state.setSimulationStatus);
  const setSimulationResult = useAppStore((state) => state.setSimulationResult);
  const drawdownType = useAppStore((state) => state.drawdownStrategy.type);
  const targetAllocation = useAppStore((state) => state.drawdownStrategy.rebalancing.targetAllocation);
  const actualOverridesByMonth = useAppStore((state) => state.actualOverridesByMonth);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const startDate = useAppStore((state) => state.coreParams.retirementStartDate);
  const clearAllActualOverrides = useAppStore((state) => state.clearAllActualOverrides);
  const canRun =
    drawdownType !== DrawdownStrategyType.Rebalancing ||
    Math.abs(targetAllocation.stocks + targetAllocation.bonds + targetAllocation.cash - 1) < 0.000001;

  const getDefaultSnapshotName = () => {
    const now = new Date();
    const date = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return `Snapshot ${date} ${time}`;
  };

  const handleSaveSnapshot = () => {
    const requestedName = window.prompt('Snapshot name', getDefaultSnapshotName());
    const name = requestedName?.trim();
    if (!name) {
      return;
    }

    const { json, filename } = serializeSnapshot(name);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setSnapshotMessage(`Saved snapshot: ${name}`);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSnapshot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }

    if (!window.confirm('Loading a snapshot will replace your current state. Continue?')) {
      return;
    }

    try {
      const raw = await file.text();
      const loaded = applySnapshot(raw);
      setSnapshotMessage(`Loaded snapshot: ${loaded.name}`);
    } catch (error) {
      if (error instanceof SnapshotLoadError) {
        window.alert(error.message);
        return;
      }
      window.alert("This file doesn't appear to be a valid snapshot.");
    }
  };

  useEffect(() => {
    if (simulationMode !== SimulationMode.MonteCarlo) {
      return;
    }

    setHistoricalSummaryStatus('loading');
    void fetchHistoricalSummary(selectedHistoricalEra)
      .then((response) => {
        setHistoricalSummary(response.summary);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load historical summary';
        setHistoricalSummaryStatus('error', message);
      });
  }, [
    selectedHistoricalEra,
    setHistoricalSummary,
    setHistoricalSummaryStatus,
    simulationMode,
  ]);

  const eraOptions = (historicalSummary?.eras ?? []).map((era) => ({
    label: era.label,
    value: era.key,
  }));
  const eraValue =
    eraOptions.some((option) => option.value === selectedHistoricalEra)
      ? selectedHistoricalEra
      : (eraOptions[0]?.value ?? selectedHistoricalEra);

  const handleRunSimulation = async () => {
    if (!canRun) {
      setSimulationStatus('error', 'Rebalancing target allocation must sum to 100%.');
      return;
    }
    try {
      setSimulationStatus('running');
      const config = getCurrentConfig();
      if (
        mode === AppMode.Tracking &&
        (simulationMode === SimulationMode.Manual || simulationMode === SimulationMode.MonteCarlo) &&
        lastEditedMonthIndex !== null
      ) {
        const state = useAppStore.getState();
        const visibleRows =
          (
            state.simulationResults.reforecast ??
            state.simulationResults.manual ??
            state.simulationResults.monteCarlo
          )?.result.rows ?? [];
        const result = await runSimulation({ config, actualOverridesByMonth });
        const merged = mergeRowsWithPreservedBoundary(
          result.result.rows,
          visibleRows,
          lastEditedMonthIndex,
        );

        setSimulationResult(simulationMode, {
          ...result,
          result: {
            ...result.result,
            rows: merged.rows,
            summary: {
              ...result.result.summary,
              terminalPortfolioValue:
                merged.terminalPortfolioValue ?? result.result.summary.terminalPortfolioValue,
            },
          },
        });
        return;
      }

      const result = await runSimulation({ config, actualOverridesByMonth });
      setSimulationResult(simulationMode, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown simulation error';
      setSimulationStatus('error', message);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-brand-border bg-white/95 px-4 py-2 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-14 w-[220px] shrink-0 items-center gap-3 border-r border-brand-border pr-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue text-lg font-bold text-white">F</div>
          <p className="text-[2rem] font-semibold leading-none text-slate-800">FinApp</p>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="flex min-w-[160px] flex-col gap-1">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">View Mode</p>
              <SegmentedToggle
                value={mode}
                onChange={setMode}
                options={[
                  { label: 'Planning', value: AppMode.Planning },
                  { label: 'Tracking', value: AppMode.Tracking },
                ]}
              />
            </div>

            <div className="flex min-w-[210px] flex-col gap-1">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Simulation Type</p>
              <SegmentedToggle
                value={simulationMode}
                onChange={setSimulationMode}
                options={[
                  { label: 'Manual', value: SimulationMode.Manual },
                  { label: 'Monte Carlo', value: SimulationMode.MonteCarlo },
                ]}
              />
            </div>

            {simulationMode === SimulationMode.MonteCarlo ? (
              <div className="flex min-w-[260px] flex-col gap-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Historical Era</p>
                <div className="w-[280px] max-w-full">
                  <Dropdown<HistoricalEra>
                    value={eraValue}
                    onChange={setSelectedHistoricalEra}
                    options={
                      eraOptions.length > 0
                        ? eraOptions
                        : [{ label: historicalStatus === 'loading' ? 'Loading eras...' : 'Full History', value: HistoricalEra.FullHistory }]
                    }
                  />
                </div>
              </div>
            ) : null}

            {mode === AppMode.Tracking ? (
              <div className="flex min-w-[180px] flex-col gap-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Tracking</p>
                <div className="flex flex-wrap items-center gap-2">
                  {lastEditedMonthIndex !== null ? (
                    <button
                      type="button"
                      onClick={clearAllActualOverrides}
                      className="rounded border border-brand-border bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      Clear Actuals
                    </button>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {lastEditedMonthIndex === null
                      ? 'No actuals entered'
                      : `Actuals through: ${
                          new Date(startDate.year, startDate.month - 1 + (lastEditedMonthIndex - 1), 1).toLocaleDateString(undefined, {
                            month: 'short',
                            year: 'numeric',
                          })
                        }`}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {snapshotMessage ? <p className="mt-1 text-xs text-slate-500">{snapshotMessage}</p> : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSnapshot}
            className="grid h-9 w-9 place-items-center rounded-md border border-brand-border bg-white text-slate-600 transition hover:border-brand-blue hover:text-brand-blue"
            aria-label="Save snapshot"
            title="Save Snapshot"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v10" />
              <path d="m8 9 4 4 4-4" />
              <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleLoadClick}
            className="grid h-9 w-9 place-items-center rounded-md border border-brand-border bg-white text-slate-600 transition hover:border-brand-blue hover:text-brand-blue"
            aria-label="Load snapshot"
            title="Load Snapshot"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21V11" />
              <path d="m8 15 4-4 4 4" />
              <path d="M4 9V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => void handleRunSimulation()}
            disabled={!canRun}
            className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {status === 'running' ? 'Running...' : 'Run Simulation'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => void handleLoadSnapshot(event)}
        />
      </div>
    </header>
  );
};
