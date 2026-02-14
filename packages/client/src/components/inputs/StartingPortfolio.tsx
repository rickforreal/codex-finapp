import { AssetClass } from '@finapp/shared';

import { CurrencyInput } from '../shared/CurrencyInput';
import { DonutChart } from '../shared/DonutChart';
import { useAppStore, usePortfolioTotal } from '../../store/useAppStore';

const pct = (value: number, total: number): string => `${((value / Math.max(total, 1)) * 100).toFixed(1)}%`;

export const StartingPortfolio = () => {
  const portfolio = useAppStore((state) => state.portfolio);
  const setPortfolioValue = useAppStore((state) => state.setPortfolioValue);
  const total = usePortfolioTotal();

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Stocks</label>
        <CurrencyInput value={portfolio.stocks} onChange={(value) => setPortfolioValue(AssetClass.Stocks, value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Bonds</label>
        <CurrencyInput value={portfolio.bonds} onChange={(value) => setPortfolioValue(AssetClass.Bonds, value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Cash</label>
        <CurrencyInput value={portfolio.cash} onChange={(value) => setPortfolioValue(AssetClass.Cash, value)} />
      </div>

      <div className="flex items-center gap-3 rounded-md border border-brand-border bg-brand-surface p-2">
        <DonutChart stocks={portfolio.stocks} bonds={portfolio.bonds} cash={portfolio.cash} />
        <div className="space-y-1 text-xs text-slate-600">
          <p className="text-sm font-semibold text-brand-navy">Total: ${total.toLocaleString()}</p>
          <p>Stocks: {pct(portfolio.stocks, total)}</p>
          <p>Bonds: {pct(portfolio.bonds, total)}</p>
          <p>Cash: {pct(portfolio.cash, total)}</p>
        </div>
      </div>
    </div>
  );
};
