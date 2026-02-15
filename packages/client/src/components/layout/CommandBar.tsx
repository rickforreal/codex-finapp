import { useEffect } from 'react';

import { AppMode, DrawdownStrategyType, HistoricalEra, SimulationMode } from '@finapp/shared';

import { fetchHistoricalSummary } from '../../api/historicalApi';
import { runSimulation } from '../../api/simulationApi';
import { getCurrentConfig, useAppStore } from '../../store/useAppStore';
import { Dropdown } from '../shared/Dropdown';
import { SegmentedToggle } from '../shared/SegmentedToggle';

export const CommandBar = () => {
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
  const canRun =
    drawdownType !== DrawdownStrategyType.Rebalancing ||
    Math.abs(targetAllocation.stocks + targetAllocation.bonds + targetAllocation.cash - 1) < 0.000001;

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
      const result = await runSimulation({ config });
      setSimulationResult(simulationMode, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown simulation error';
      setSimulationStatus('error', message);
    }
  };

  return (
    <header className="sticky top-0 z-10 border-b border-brand-border bg-white/95 px-5 py-3 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedToggle
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Planning', value: AppMode.Planning },
            { label: 'Tracking', value: AppMode.Tracking },
          ]}
        />

        <SegmentedToggle
          value={simulationMode}
          onChange={setSimulationMode}
          options={[
            { label: 'Manual', value: SimulationMode.Manual },
            { label: 'Monte Carlo', value: SimulationMode.MonteCarlo },
          ]}
        />

        {simulationMode === SimulationMode.MonteCarlo ? (
          <div className="w-[260px] min-w-[220px]">
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
        ) : null}

        <button
          type="button"
          onClick={() => void handleRunSimulation()}
          disabled={!canRun}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {status === 'running' ? 'Running...' : 'Run Simulation'}
        </button>
      </div>
    </header>
  );
};
