import { AssetClass } from '@finapp/shared';

import { PercentInput } from '../../shared/PercentInput';
import { ToggleSwitch } from '../../shared/ToggleSwitch';
import { useAppStore } from '../../../store/useAppStore';

const assets: AssetClass[] = [AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash];

export const RebalancingConfig = () => {
  const retirementDuration = useAppStore((state) => state.coreParams.retirementDuration);
  const rebalancing = useAppStore((state) => state.drawdownStrategy.rebalancing);
  const setRebalancingTargetAllocation = useAppStore((state) => state.setRebalancingTargetAllocation);
  const setGlidePathEnabled = useAppStore((state) => state.setGlidePathEnabled);
  const addGlidePathWaypoint = useAppStore((state) => state.addGlidePathWaypoint);
  const removeGlidePathWaypoint = useAppStore((state) => state.removeGlidePathWaypoint);
  const updateGlidePathWaypoint = useAppStore((state) => state.updateGlidePathWaypoint);

  const allocationSum =
    rebalancing.targetAllocation.stocks + rebalancing.targetAllocation.bonds + rebalancing.targetAllocation.cash;
  const allocationIsValid = Math.abs(allocationSum - 1) < 0.000001;

  return (
    <div className="space-y-3 rounded border border-brand-border bg-brand-surface p-3">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {rebalancing.glidePathEnabled ? 'Starting Allocation (from glide path)' : 'Target Allocation'}
        </p>
        {assets.map((asset) => (
          <div key={asset} className="flex items-center gap-2">
            <span className="w-16 text-sm capitalize text-slate-700">{asset}</span>
            <PercentInput
              value={rebalancing.targetAllocation[asset]}
              onChange={(value) => setRebalancingTargetAllocation(asset, value)}
              min={0}
              max={100}
              step={0.5}
              disabled={rebalancing.glidePathEnabled}
            />
          </div>
        ))}
        <p className={`text-xs ${allocationIsValid ? 'text-emerald-700' : 'text-rose-700'}`}>
          Total: {(allocationSum * 100).toFixed(1)}%
        </p>
      </div>

      <ToggleSwitch
        checked={rebalancing.glidePathEnabled}
        onChange={setGlidePathEnabled}
        label="Enable Glide Path"
      />

      {rebalancing.glidePathEnabled ? (
        <div className="space-y-2 rounded border border-brand-border bg-white p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Glide Path Waypoints</p>
          {rebalancing.glidePath
            .slice()
            .sort((a, b) => a.year - b.year)
            .map((waypoint) => (
              <div key={waypoint.year} className="grid grid-cols-[76px_1fr_1fr_1fr_64px] items-center gap-2 text-xs">
                <label className="text-slate-500">Year</label>
                <label className="text-slate-500">Stocks</label>
                <label className="text-slate-500">Bonds</label>
                <label className="text-slate-500">Cash</label>
                <span />

                <input
                  type="number"
                  className="h-8 rounded border border-brand-border px-2 text-sm"
                  value={waypoint.year}
                  min={1}
                  max={retirementDuration}
                  onChange={(event) =>
                    updateGlidePathWaypoint(waypoint.year, {
                      year: Math.max(1, Math.min(retirementDuration, Number(event.target.value))),
                    })
                  }
                />
                <PercentInput
                  value={waypoint.allocation.stocks}
                  onChange={(value) =>
                    updateGlidePathWaypoint(waypoint.year, {
                      allocation: { ...waypoint.allocation, stocks: value },
                    })
                  }
                />
                <PercentInput
                  value={waypoint.allocation.bonds}
                  onChange={(value) =>
                    updateGlidePathWaypoint(waypoint.year, {
                      allocation: { ...waypoint.allocation, bonds: value },
                    })
                  }
                />
                <PercentInput
                  value={waypoint.allocation.cash}
                  onChange={(value) =>
                    updateGlidePathWaypoint(waypoint.year, {
                      allocation: { ...waypoint.allocation, cash: value },
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => removeGlidePathWaypoint(waypoint.year)}
                  className="h-8 rounded border border-brand-border px-2 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          <button
            type="button"
            onClick={addGlidePathWaypoint}
            className="w-full rounded border border-brand-navy py-2 text-xs font-semibold text-brand-navy"
          >
            Add Waypoint
          </button>

          <div className="space-y-1 rounded border border-slate-200 bg-slate-50 p-2 text-[11px]">
            {rebalancing.glidePath
              .slice()
              .sort((a, b) => a.year - b.year)
              .map((waypoint) => (
                <div key={`preview-${waypoint.year}`} className="flex items-center gap-2">
                  <span className="w-12 font-medium text-slate-600">Y{waypoint.year}</span>
                  <div className="flex h-2 flex-1 overflow-hidden rounded bg-white">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(waypoint.allocation.stocks * 100).toFixed(2)}%` }}
                    />
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(waypoint.allocation.bonds * 100).toFixed(2)}%` }}
                    />
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(waypoint.allocation.cash * 100).toFixed(2)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
