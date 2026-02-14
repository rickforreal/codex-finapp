import { useAppStore } from '../../store/useAppStore';
import { PortfolioChart } from '../output/PortfolioChart';
import { SummaryStatsBar } from '../output/SummaryStatsBar';
import { Sidebar } from './Sidebar';
import { CommandBar } from './CommandBar';

export const AppShell = () => {
  const results = useAppStore((state) => state.simulationResults);

  return (
    <div className="min-h-screen bg-[#F2F5FB] text-slate-900">
      <CommandBar />
      <main className="flex min-h-[calc(100vh-65px)]">
        <aside className="w-[400px] overflow-y-auto border-r border-brand-border bg-brand-panel p-4">
          <Sidebar />
        </aside>

        <section className="flex-1 p-6">
          <div className="space-y-4">
            <SummaryStatsBar />
            <PortfolioChart />
            <div className="rounded-md border border-brand-border bg-white px-3 py-2 text-xs text-slate-600">
              <p>Status: {results.status}</p>
              <p>Manual cache: {results.manual ? `${results.manual.result.rows.length} rows` : 'empty'}</p>
              <p>Monte Carlo cache: {results.monteCarlo ? 'present' : 'empty'}</p>
              {results.errorMessage ? <p className="text-red-600">Error: {results.errorMessage}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
