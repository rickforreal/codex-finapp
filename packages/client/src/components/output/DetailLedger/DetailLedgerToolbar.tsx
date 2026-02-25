import { AppMode, SimulationMode } from '@finapp/shared';

import { useAppStore } from '../../../store/useAppStore';
import { SegmentedToggle } from '../../shared/SegmentedToggle';

export const DetailLedgerToolbar = () => {
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const mcStale = useAppStore((state) => state.simulationResults.mcStale);
  const tableGranularity = useAppStore((state) => state.ui.tableGranularity);
  const tableAssetColumnsEnabled = useAppStore((state) => state.ui.tableAssetColumnsEnabled);
  const tableSpreadsheetMode = useAppStore((state) => state.ui.tableSpreadsheetMode);
  const setTableGranularity = useAppStore((state) => state.setTableGranularity);
  const setTableAssetColumnsEnabled = useAppStore((state) => state.setTableAssetColumnsEnabled);
  const setTableSpreadsheetMode = useAppStore((state) => state.setTableSpreadsheetMode);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
      <div>
        <h3 className="text-base font-semibold text-slate-800">Detail Ledger</h3>
        {simulationMode === SimulationMode.MonteCarlo ? (
          <p className="text-xs text-slate-500">
            Showing representative path values with Start Total (p50) reference.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <SegmentedToggle
          value={tableGranularity}
          onChange={(value) => setTableGranularity(value as 'monthly' | 'annual')}
          options={[
            { label: 'Monthly', value: 'monthly' },
            { label: 'Annual', value: 'annual' },
          ]}
        />
        <button
          type="button"
          onClick={() => setTableAssetColumnsEnabled(!tableAssetColumnsEnabled)}
          className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition ${
            tableAssetColumnsEnabled ? 'text-blue-500' : 'text-slate-500 hover:text-slate-700'
          }`}
          aria-pressed={tableAssetColumnsEnabled}
        >
          <span className="text-base leading-none">◷</span>
          <span>Breakdown</span>
        </button>
        <button
          type="button"
          onClick={() => setTableSpreadsheetMode(!tableSpreadsheetMode)}
          className={`grid h-8 w-8 place-items-center rounded-md border transition ${
            tableSpreadsheetMode
              ? 'border-blue-200 bg-blue-50 text-blue-500'
              : 'border-brand-border bg-white text-slate-500 hover:text-slate-700'
          }`}
          title={tableSpreadsheetMode ? 'Compress table view' : 'Expand table view'}
          aria-label={tableSpreadsheetMode ? 'Compress table view' : 'Expand table view'}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            {tableSpreadsheetMode ? (
              <>
                <path d="M15 9l6-6" />
                <path d="M21 9V3h-6" />
                <path d="M9 15l-6 6" />
                <path d="M3 15v6h6" />
              </>
            ) : (
              <>
                <path d="M9 3L3 9" />
                <path d="M3 3v6h6" />
                <path d="M15 21l6-6" />
                <path d="M21 21v-6h-6" />
              </>
            )}
          </svg>
        </button>
        {mode === AppMode.Tracking && mcStale ? (
          <span
            className="rounded-full px-2 py-1 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--theme-state-stale-background)',
              color: 'var(--theme-state-stale-text)',
            }}
          >
            Stale
          </span>
        ) : null}
      </div>
    </div>
  );
};
