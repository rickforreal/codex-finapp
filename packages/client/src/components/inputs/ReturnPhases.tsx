import { HistoricalEra, ReturnSource, HISTORICAL_ERA_DEFINITIONS } from '@finapp/shared';

import { useAppStore } from '../../store/useAppStore';
import { Dropdown } from '../shared/Dropdown';
import { MonthYearPicker } from '../shared/MonthYearPicker';
import { PercentInput } from '../shared/PercentInput';
import { SegmentedToggle } from '../shared/SegmentedToggle';
import { ToggleSwitch } from '../shared/ToggleSwitch';

const SIMULATION_RUN_MIN = 1;
const SIMULATION_RUN_MAX = 10000;
const SIMULATION_RUN_MAGNET_STOPS = [100, 500, 1000, 5000] as const;

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

const eraOptions = HISTORICAL_ERA_DEFINITIONS.map((definition) => ({
  value: definition.key,
  label: definition.label,
})).concat({ value: HistoricalEra.Custom, label: 'Custom' });

export const ReturnPhases = () => {
  const phases = useAppStore((state) => state.returnPhases);
  const simulationRuns = useAppStore((state) => state.simulationRuns);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const setSimulationRuns = useAppStore((state) => state.setSimulationRuns);
  const addReturnPhase = useAppStore((state) => state.addReturnPhase);
  const removeReturnPhase = useAppStore((state) => state.removeReturnPhase);
  const updateReturnPhase = useAppStore((state) => state.updateReturnPhase);

  return (
    <div className="space-y-3">
      <div className="rounded border border-brand-border p-2">
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
        <div key={phase.id} className="space-y-2 rounded border border-brand-border bg-brand-surface p-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--theme-color-text-secondary)] uppercase tracking-[0.08em]">
              Return Phase {index + 1}
            </p>
            <button
              type="button"
              onClick={() => removeReturnPhase(phase.id)}
              disabled={phases.length <= 1}
              className="rounded border border-brand-border px-2 py-0.5 text-[11px] disabled:opacity-50"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--theme-color-text-secondary)]">Start</p>
              <MonthYearPicker
                value={phase.start}
                onChange={(value) => updateReturnPhase(phase.id, { start: value })}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--theme-color-text-secondary)]">End</p>
              <MonthYearPicker
                value={phase.end}
                onChange={(value) => updateReturnPhase(phase.id, { end: value })}
              />
            </div>
          </div>

          <SegmentedToggle
            value={phase.source}
            onChange={(nextSource) => updateReturnPhase(phase.id, { source: nextSource })}
            className="w-full"
            options={[
              { label: 'Manual', value: ReturnSource.Manual },
              { label: 'Historical', value: ReturnSource.Historical },
            ]}
          />

          {phase.source === ReturnSource.Manual ? (
            <div className="space-y-2 rounded border border-brand-border/60 p-2">
              {(['stocks', 'bonds', 'cash'] as const).map((asset) => (
                <div key={asset} className="grid grid-cols-[70px_1fr_1fr] items-center gap-2">
                  <p className="text-xs capitalize text-[var(--theme-color-text-secondary)]">{asset}</p>
                  <PercentInput
                    value={phase.returnAssumptions[asset].expectedReturn}
                    min={-100}
                    max={100}
                    onChange={(value) =>
                      updateReturnPhase(phase.id, {
                        returnAssumptions: {
                          ...phase.returnAssumptions,
                          [asset]: { ...phase.returnAssumptions[asset], expectedReturn: value },
                        },
                      })
                    }
                  />
                  <PercentInput
                    value={phase.returnAssumptions[asset].stdDev}
                    min={0}
                    max={100}
                    onChange={(value) =>
                      updateReturnPhase(phase.id, {
                        returnAssumptions: {
                          ...phase.returnAssumptions,
                          [asset]: { ...phase.returnAssumptions[asset], stdDev: value },
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 rounded border border-brand-border/60 p-2">
              <Dropdown<HistoricalEra>
                value={phase.selectedHistoricalEra}
                onChange={(value) => updateReturnPhase(phase.id, { selectedHistoricalEra: value })}
                options={eraOptions}
              />

              {phase.selectedHistoricalEra === HistoricalEra.Custom ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-[var(--theme-color-text-secondary)]">Range Start</p>
                    <MonthYearPicker
                      value={phase.customHistoricalRange?.start ?? phase.start}
                      onChange={(value) =>
                        updateReturnPhase(phase.id, {
                          customHistoricalRange: {
                            start: value,
                            end: phase.customHistoricalRange?.end ?? phase.end,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-[var(--theme-color-text-secondary)]">Range End</p>
                    <MonthYearPicker
                      value={phase.customHistoricalRange?.end ?? phase.end}
                      onChange={(value) =>
                        updateReturnPhase(phase.id, {
                          customHistoricalRange: {
                            start: phase.customHistoricalRange?.start ?? phase.start,
                            end: value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--theme-color-text-secondary)]">Block Bootstrap</p>
                <ToggleSwitch
                  checked={phase.blockBootstrapEnabled}
                  onChange={(checked) => updateReturnPhase(phase.id, { blockBootstrapEnabled: checked })}
                />
              </div>
              {phase.blockBootstrapEnabled ? (
                <div className="space-y-1">
                  <p className="text-[11px] text-[var(--theme-color-text-secondary)]">
                    Block Length: {phase.blockBootstrapLength} months
                  </p>
                  <input
                    type="range"
                    min={3}
                    max={36}
                    step={1}
                    value={phase.blockBootstrapLength}
                    onChange={(event) =>
                      updateReturnPhase(phase.id, { blockBootstrapLength: Number(event.target.value) })
                    }
                    className="w-full accent-brand-blue"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => addReturnPhase()}
        disabled={phases.length >= 4}
        className="w-full rounded border border-brand-border px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        + Add Return Phase
      </button>
    </div>
  );
};
