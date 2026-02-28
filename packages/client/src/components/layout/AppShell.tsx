import { useAppStore } from '../../store/useAppStore';
import { ChartPanel } from '../output/ChartPanel';
import { CompareParameterDiffTable } from '../output/CompareParameterDiffTable';
import { DetailTable } from '../output/DetailLedger';
import { StressTestPanel } from '../output/StressTestPanel';
import { SummaryStatsBar } from '../output/SummaryStatsBar';
import { Sidebar } from './Sidebar';
import { CommandBar } from './CommandBar';

export const AppShell = () => {
  const results = useAppStore((state) => state.simulationResults);

  return (
    <div className="theme-app-shell-root min-h-screen">
      <CommandBar />
      <main className="flex min-h-[calc(100vh-65px)]">
        <aside className="theme-app-shell-sidebar w-[400px] shrink-0 overflow-y-auto border-r p-4">
          <Sidebar />
        </aside>

        <section className="min-w-0 flex-1 p-6">
          <div className="space-y-4">
            <SummaryStatsBar />
            <CompareParameterDiffTable />
            <ChartPanel />
            <DetailTable />
            <StressTestPanel />
            <div className="theme-debug-status-panel rounded-md border px-3 py-2 text-xs">
              <p>Status: {results.status}</p>
              <p>Manual cache: {results.manual ? `${results.manual.result.rows.length} rows` : 'empty'}</p>
              <p>Monte Carlo cache: {results.monteCarlo ? 'present' : 'empty'}</p>
              {results.errorMessage ? <p className="theme-debug-status-error">Error: {results.errorMessage}</p> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
