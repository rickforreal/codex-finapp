import { useCallback } from 'react';

import { AppMode, type ActualMonthOverride } from '@finapp/shared';

import { useAppStore, useIsCompareActive } from '../../../store/useAppStore';
import { monthsBetween } from '../../../lib/dates';
import {
  type Column,
  isMonteCarloReferenceColumn,
  monteCarloReferenceColumnTint,
  monteCarloReferenceColumnText,
  monteCarloReferenceTooltip,
} from './cellHelpers';
import { CompareSlotTabs } from './CompareSlotTabs';
import { DetailLedgerToolbar } from './DetailLedgerToolbar';
import { useDetailColumns } from './useDetailColumns';
import { useDetailRows } from './useDetailRows';
import { useGridNavigation } from './useGridNavigation';
import { VirtualizedBody } from './VirtualizedBody';

export const DetailLedgerContainer = () => {
  const mode = useAppStore((state) => state.mode);
  const tableGranularity = useAppStore((state) => state.ui.tableGranularity);
  const tableAssetColumnsEnabled = useAppStore((state) => state.ui.tableAssetColumnsEnabled);
  const tableSpreadsheetMode = useAppStore((state) => state.ui.tableSpreadsheetMode);
  const tableSort = useAppStore((state) => state.ui.tableSort);
  const setTableSort = useAppStore((state) => state.setTableSort);
  const actualOverridesByMonth = useAppStore((state) => state.actualOverridesByMonth);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const trackingOutputsStale = useAppStore((state) => {
    if (state.mode !== AppMode.Tracking) {
      return false;
    }
    if (state.compareWorkspace.slotOrder.length <= 1) {
      return state.simulationResults.mcStale;
    }
    return state.compareWorkspace.slotOrder.some((slotId) => state.compareWorkspace.slots[slotId]?.simulationResults.mcStale);
  });
  const coreParams = useAppStore((state) => state.coreParams);
  const durationMonths = monthsBetween(coreParams.portfolioStart, coreParams.portfolioEnd);
  const upsertActualOverride = useAppStore((state) => state.upsertActualOverride);
  const clearActualRowOverrides = useAppStore((state) => state.clearActualRowOverrides);
  const isCompareActive = useIsCompareActive();
  const compareSlotOrder = useAppStore((state) => state.compareWorkspace.slotOrder);

  const { rows, activeLedgerSlotId, canonicalBoundary, runInflationRate } = useDetailRows();
  const { columns, tableMinWidthClass } = useDetailColumns();
  const trackingHorizonMonths = Math.max(0, durationMonths);
  const maxEditableMonthIndex =
    mode === AppMode.Tracking
      ? trackingHorizonMonths === 0
        ? 0
        : Math.max(1, Math.min(trackingHorizonMonths, (lastEditedMonthIndex ?? 0) + 1))
      : 0;
  const showResetColumn =
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    activeLedgerSlotId === 'A';

  // Commit handler for grid navigation
  const handleCommit = useCallback(
    (row: import('../../../lib/detailTable').DetailRow, column: Column, rawValue: string) => {
      const parsed = Number(rawValue.replace(/[^0-9.-]/g, ''));
      const normalized = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
      const monthIndex = row.monthIndex;
      const patch: Partial<ActualMonthOverride> = {};

      if (column.key === 'startStocks' || column.key === 'startBonds' || column.key === 'startCash') {
        const key = column.key === 'startStocks' ? 'stocks' : column.key === 'startBonds' ? 'bonds' : 'cash';
        patch.startBalances = { [key]: normalized };
      } else if (
        column.key === 'withdrawalStocks' ||
        column.key === 'withdrawalBonds' ||
        column.key === 'withdrawalCash'
      ) {
        const key = column.key === 'withdrawalStocks' ? 'stocks' : column.key === 'withdrawalBonds' ? 'bonds' : 'cash';
        patch.withdrawalsByAsset = { [key]: normalized };
      }

      upsertActualOverride(monthIndex, patch);
    },
    [upsertActualOverride],
  );

  const nav = useGridNavigation({
    rows,
    columns,
    mode,
    isCompareActive,
    tableGranularity,
    tableAssetColumnsEnabled,
    actualOverridesByMonth,
    maxEditableMonthIndex,
    runInflationRate,
    activeLedgerSlotId,
    onCommit: handleCommit,
  });

  // Sort handler
  const setSort = useCallback(
    (column: string) => {
      if (!tableSort || tableSort.column !== column) {
        setTableSort({ column, direction: 'asc' });
        return;
      }
      if (tableSort.direction === 'asc') {
        setTableSort({ column, direction: 'desc' });
        return;
      }
      setTableSort(null);
    },
    [tableSort, setTableSort],
  );

  const renderReferenceTooltip = () => (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-500 transition hover:text-slate-700"
        aria-label="About Start Total (p50)"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[120%] z-20 hidden w-64 -translate-x-1/2 whitespace-normal rounded-md border border-brand-border bg-white px-2 py-1.5 text-left text-[11px] font-normal leading-snug text-slate-600 shadow-panel group-hover:block group-focus-within:block">
        {monteCarloReferenceTooltip}
      </span>
    </span>
  );

  const renderColumnLabel = (column: Column, indicator = '') => {
    if (!isMonteCarloReferenceColumn(column)) {
      return (
        <>
          {column.label}
          <span className="text-slate-400">{indicator}</span>
        </>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5">
        <span>{column.label}</span>
        {renderReferenceTooltip()}
        <span className="text-slate-400">{indicator}</span>
      </span>
    );
  };

  const renderHeader = useCallback(
    () => (
      <thead className="sticky top-0 z-20 bg-white">
        <tr>
          {columns.map((column) => {
            const active = tableSort?.column === column.key;
            const indicator = !active ? '' : tableSort?.direction === 'asc' ? ' ▲' : ' ▼';
            return (
              <th
                key={column.key}
                className="border-b border-brand-border bg-white px-3 py-2 text-left font-semibold text-slate-700"
                style={
                  isMonteCarloReferenceColumn(column)
                    ? {
                        backgroundColor: monteCarloReferenceColumnTint,
                        color: monteCarloReferenceColumnText,
                      }
                    : undefined
                }
              >
                {column.sortable ? (
                  isMonteCarloReferenceColumn(column) ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-inherit"
                        onClick={() => setSort(column.key)}
                      >
                        {column.label}
                        <span className="text-slate-400">{indicator}</span>
                      </button>
                      {renderReferenceTooltip()}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="whitespace-nowrap text-inherit"
                      onClick={() => setSort(column.key)}
                    >
                      {renderColumnLabel(column, indicator)}
                    </button>
                  )
                ) : (
                  renderColumnLabel(column)
                )}
              </th>
            );
          })}
          {showResetColumn ? (
            <th className="border-b border-brand-border bg-white px-2 py-2 text-left font-semibold text-slate-700">
              Reset
            </th>
          ) : null}
        </tr>
      </thead>
    ),
    [columns, setSort, showResetColumn, tableSort],
  );

  return (
    <section className="relative overflow-hidden rounded-xl border border-brand-border bg-white shadow-panel">
      <div>
        <DetailLedgerToolbar />
        {isCompareActive ? <CompareSlotTabs slotOrder={compareSlotOrder} activeLedgerSlotId={activeLedgerSlotId} /> : null}
        {isCompareActive ? (
          <div className="border-b border-brand-border px-3 py-2 text-xs font-semibold text-slate-700">
            <span>Portfolio {activeLedgerSlotId}</span>
            {mode === AppMode.Tracking && activeLedgerSlotId !== 'A' ? (
              <span className="ml-2 font-normal text-slate-500">
                Actuals sourced from Portfolio A. This ledger is read-only.
              </span>
            ) : null}
          </div>
        ) : null}
        {mode === AppMode.Tracking && trackingOutputsStale ? (
          <div
            className="border-b border-brand-border px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--theme-color-surface-secondary) 84%, var(--theme-color-text-primary) 16%)',
              color: 'var(--theme-color-text-secondary)',
            }}
          >
            Projection is stale. Run Simulation to refresh
            {canonicalBoundary !== null ? ` from month ${canonicalBoundary + 1} onward.` : ' results.'}
          </div>
        ) : null}
      </div>

      <VirtualizedBody
        rows={rows}
        columns={columns}
        mode={mode}
        tableGranularity={tableGranularity}
        tableAssetColumnsEnabled={tableAssetColumnsEnabled}
        tableSpreadsheetMode={tableSpreadsheetMode}
        tableMinWidthClass={tableMinWidthClass}
        actualOverridesByMonth={actualOverridesByMonth}
        isCompareActive={isCompareActive}
        maxEditableMonthIndex={maxEditableMonthIndex}
        runInflationRate={runInflationRate}
        focusedCell={nav.focusedCell}
        editingCell={nav.editingCell}
        draftValue={nav.draftValue}
        lastEditedMonthIndex={lastEditedMonthIndex}
        isTrackingOutputsStale={trackingOutputsStale}
        showResetColumn={showResetColumn}
        activeLedgerSlotId={activeLedgerSlotId}
        canonicalBoundary={canonicalBoundary}
        onDraftChange={nav.setDraftValue}
        onCellClick={nav.handleCellClick}
        onCellDoubleClick={nav.handleCellDoubleClick}
        onCellKeyDown={nav.handleCellKeyDown}
        onEditorKeyDown={nav.handleEditorKeyDown}
        onEditorCommit={nav.commitEdit}
        registerRef={nav.registerCellRef}
        onResetRow={clearActualRowOverrides}
        renderHeader={renderHeader}
      />
    </section>
  );
};
