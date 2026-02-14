import { AppMode, SimulationMode } from '@finapp/shared';

import { runSimulation } from '../../api/simulationApi';
import { getCurrentConfig, useAppStore } from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';

export const CommandBar = () => {
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const status = useAppStore((state) => state.simulationResults.status);
  const setMode = useAppStore((state) => state.setMode);
  const setSimulationMode = useAppStore((state) => state.setSimulationMode);
  const setSimulationStatus = useAppStore((state) => state.setSimulationStatus);
  const setSimulationResult = useAppStore((state) => state.setSimulationResult);

  const handleRunSimulation = async () => {
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

        <button
          type="button"
          onClick={() => void handleRunSimulation()}
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-semibold text-white"
        >
          {status === 'running' ? 'Running...' : 'Run Simulation'}
        </button>
      </div>
    </header>
  );
};
