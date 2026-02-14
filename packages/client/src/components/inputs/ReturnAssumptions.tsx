import { AssetClass, SimulationMode } from '@finapp/shared';

import { PercentInput } from '../shared/PercentInput';
import { useAppStore } from '../../store/useAppStore';

export const ReturnAssumptions = () => {
  const simulationMode = useAppStore((state) => state.simulationMode);
  const assumptions = useAppStore((state) => state.returnAssumptions);
  const setReturnAssumption = useAppStore((state) => state.setReturnAssumption);

  if (simulationMode !== SimulationMode.Manual) {
    return null;
  }

  return (
    <div className="space-y-3">
      {[AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash].map((asset) => (
        <div key={asset} className="grid grid-cols-2 gap-2 rounded border border-brand-border p-2">
          <div>
            <p className="mb-1 text-xs font-medium capitalize text-slate-600">{asset} Return</p>
            <PercentInput
              value={assumptions[asset].expectedReturn}
              onChange={(value) => setReturnAssumption(asset, 'expectedReturn', value)}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium capitalize text-slate-600">{asset} Std Dev</p>
            <PercentInput
              value={assumptions[asset].stdDev}
              onChange={(value) => setReturnAssumption(asset, 'stdDev', value)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
