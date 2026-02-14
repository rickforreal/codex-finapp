import { useAppStore } from '../../store/useAppStore';
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
          <div className="h-full min-h-[400px] rounded-xl border border-brand-border bg-white p-8 shadow-panel">
            <p className="mb-2 font-medium text-brand-navy">Output area placeholder</p>
            <p className="text-sm text-slate-500">
              Phase 3 keeps output rendering deferred. Run Simulation stores results in cache only.
            </p>
            <div className="mt-4 rounded border border-brand-border bg-brand-surface p-3 text-xs text-slate-600">
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
