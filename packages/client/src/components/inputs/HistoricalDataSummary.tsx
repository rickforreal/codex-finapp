import { AssetClass } from '@finapp/shared';
import { HistoricalEra } from '@finapp/shared';

import { formatPercent } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';

const assetLabel: Record<AssetClass, string> = {
  [AssetClass.Stocks]: 'Stocks',
  [AssetClass.Bonds]: 'Bonds',
  [AssetClass.Cash]: 'Cash',
};

const annualizeReturn = (monthlyMean: number): number => (1 + monthlyMean) ** 12 - 1;
const annualizeStdDev = (monthlyStdDev: number): number => monthlyStdDev * Math.sqrt(12);

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
};

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
