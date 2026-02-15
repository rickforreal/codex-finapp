import { AssetClass } from '@finapp/shared';

import { formatPercent } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

const assetLabel: Record<AssetClass, string> = {
  [AssetClass.Stocks]: 'Stocks',
  [AssetClass.Bonds]: 'Bonds',
  [AssetClass.Cash]: 'Cash',
};

const annualizeReturn = (monthlyMean: number): number => (1 + monthlyMean) ** 12 - 1;
const annualizeStdDev = (monthlyStdDev: number): number => monthlyStdDev * Math.sqrt(12);

export const HistoricalDataSummary = () => {
  const summary = useAppStore((state) => state.historicalData.summary);
  const status = useAppStore((state) => state.historicalData.status);
  const errorMessage = useAppStore((state) => state.historicalData.errorMessage);

  if (status === 'loading' && !summary) {
    return <p className="text-xs text-slate-500">Loading historical data summary...</p>;
  }

  if (status === 'error') {
    return <p className="text-xs text-rose-700">{errorMessage ?? 'Failed to load historical data summary.'}</p>;
  }

  if (!summary) {
    return <p className="text-xs text-slate-500">Select Monte Carlo mode to load historical data summary.</p>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-brand-border bg-brand-surface p-3">
      <p className="text-sm font-semibold text-slate-800">{summary.selectedEra.label}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="pb-1 pr-2 font-medium">Asset Class</th>
              <th className="pb-1 pr-2 font-medium">Average Return (Annualized)</th>
              <th className="pb-1 pr-2 font-medium">Std. Deviation (Annualized)</th>
              <th className="pb-1 font-medium">Sample Size</th>
            </tr>
          </thead>
          <tbody>
            {[AssetClass.Stocks, AssetClass.Bonds, AssetClass.Cash].map((asset) => {
              const row = summary.byAsset[asset];
              return (
                <tr key={asset} className="border-t border-slate-200 text-slate-700">
                  <td className="py-1.5 pr-2 font-medium">{assetLabel[asset]}</td>
                  <td className="py-1.5 pr-2">{formatPercent(annualizeReturn(row.meanReturn))}</td>
                  <td className="py-1.5 pr-2">{formatPercent(annualizeStdDev(row.stdDev))}</td>
                  <td className="py-1.5">{row.sampleSizeMonths.toLocaleString()} months</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
