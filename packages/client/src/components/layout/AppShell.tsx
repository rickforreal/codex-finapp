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
  const isSidebarCollapsed = useAppStore((state) => state.ui.isSidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  return (
    <div className="theme-app-shell-root min-h-screen">
      <CommandBar />
      <main className="flex min-h-[calc(100vh-65px)] overflow-hidden">
        <div className="relative flex shrink-0">
          <aside
            className={`theme-app-shell-sidebar shrink-0 overflow-y-auto overflow-x-hidden border-r transition-all duration-300 ease-in-out ${
              isSidebarCollapsed ? 'w-6 border-r-[var(--theme-color-border-primary)] p-0' : 'w-[400px] p-4'
            }`}
          >
            <div className={`transition-opacity duration-300 ${isSidebarCollapsed ? 'invisible opacity-0' : 'visible opacity-100'}`}>
              <div className="w-[368px]"> {/* 400px - 2*16px padding */}
                <Sidebar />
              </div>
            </div>
          </aside>

          <div
            className="absolute z-50 transition-all duration-300"
            style={{
              top: '60px', // Center of the Compare Slot card
              right: isSidebarCollapsed ? '-16px' : '-16px',
            }}
          >
             <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--theme-color-surface-primary)] shadow-md transition-all duration-200 hover:scale-110 hover:bg-[var(--theme-color-surface-secondary)] active:scale-95"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`}
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>

        <section className="min-w-0 flex-1 overflow-y-auto p-6 transition-all duration-300 ease-in-out">
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
