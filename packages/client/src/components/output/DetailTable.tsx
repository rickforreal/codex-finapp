import { useEffect, useMemo, useState } from 'react';

import { AppMode, SimulationMode, type ActualMonthOverride } from '@finapp/shared';

import { runReforecast } from '../../api/reforecastApi';
import { formatCurrency, formatPercent } from '../../lib/format';
import { buildAnnualDetailRows, buildMonthlyDetailRows, sortDetailRows, type DetailRow } from '../../lib/detailTable';
import { getCurrentConfig, useActiveSimulationResult, useAppStore } from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';
import { ToggleSwitch } from '../shared/ToggleSwitch';

type Column = {
  key: keyof DetailRow;
  label: string;
  type: 'text' | 'currency' | 'percent' | 'number';
  sortable?: boolean;
};

const baseColumns: Column[] = [
  { key: 'period', label: 'Period', type: 'text', sortable: true },
  { key: 'age', label: 'Age', type: 'number', sortable: true },
  { key: 'startTotal', label: 'Start Total', type: 'currency', sortable: true },
  { key: 'marketMovement', label: 'Market Move', type: 'currency', sortable: true },
  { key: 'returnPct', label: 'Return %', type: 'percent', sortable: true },
  { key: 'withdrawalNominal', label: 'Withdrawal', type: 'currency', sortable: true },
  { key: 'withdrawalReal', label: 'Withdrawal (Real)', type: 'currency', sortable: true },
  { key: 'income', label: 'Income', type: 'currency', sortable: true },
  { key: 'expenses', label: 'Expenses', type: 'currency', sortable: true },
  { key: 'endTotal', label: 'End Total', type: 'currency', sortable: true },
];

const assetColumns: Column[] = [
  { key: 'startStocks', label: 'Start Stocks', type: 'currency', sortable: true },
  { key: 'startBonds', label: 'Start Bonds', type: 'currency', sortable: true },
  { key: 'startCash', label: 'Start Cash', type: 'currency', sortable: true },
  { key: 'moveStocks', label: 'Move Stocks', type: 'currency', sortable: true },
  { key: 'moveBonds', label: 'Move Bonds', type: 'currency', sortable: true },
  { key: 'moveCash', label: 'Move Cash', type: 'currency', sortable: true },
  { key: 'withdrawalStocks', label: 'Wd Stocks', type: 'currency', sortable: true },
  { key: 'withdrawalBonds', label: 'Wd Bonds', type: 'currency', sortable: true },
  { key: 'withdrawalCash', label: 'Wd Cash', type: 'currency', sortable: true },
  { key: 'endStocks', label: 'End Stocks', type: 'currency', sortable: true },
  { key: 'endBonds', label: 'End Bonds', type: 'currency', sortable: true },
  { key: 'endCash', label: 'End Cash', type: 'currency', sortable: true },
];

const rowHeight = 36;
const viewportHeight = 430;
const overscan = 8;

const formatCell = (value: string | number, column: Column): string | number => {
  if (column.type === 'currency') {
    return formatCurrency(Math.round(Number(value)));
  }
  if (column.type === 'percent') {
    return formatPercent(Number(value), 2);
  }
  return value as string | number;
};

const editableColumnKeys = new Set<keyof DetailRow>([
  'startStocks',
  'startBonds',
  'startCash',
  'withdrawalStocks',
  'withdrawalBonds',
  'withdrawalCash',
  'income',
  'expenses',
]);

const valueToneClass = (row: DetailRow, column: Column): string => {
  if (
    column.key !== 'marketMovement' &&
    column.key !== 'returnPct' &&
    column.key !== 'moveStocks' &&
    column.key !== 'moveBonds' &&
    column.key !== 'moveCash'
  ) {
    return 'text-slate-700';
  }
  const value = Number(row[column.key]);
  if (value > 0) {
    return 'text-emerald-700';
  }
  if (value < 0) {
    return 'text-rose-700';
  }
  return 'text-slate-700';
};

export const DetailTable = () => {
  const result = useActiveSimulationResult();
  const startingAge = useAppStore((state) => state.coreParams.startingAge);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const mcStale = useAppStore((state) => state.simulationResults.mcStale);
  const actualOverridesByMonth = useAppStore((state) => state.actualOverridesByMonth);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const upsertActualOverride = useAppStore((state) => state.upsertActualOverride);
  const clearActualRowOverrides = useAppStore((state) => state.clearActualRowOverrides);
  const setReforecastResult = useAppStore((state) => state.setReforecastResult);
  const setSimulationStatus = useAppStore((state) => state.setSimulationStatus);
  const tableGranularity = useAppStore((state) => state.ui.tableGranularity);
  const tableAssetColumnsEnabled = useAppStore((state) => state.ui.tableAssetColumnsEnabled);
  const tableSpreadsheetMode = useAppStore((state) => state.ui.tableSpreadsheetMode);
  const tableSort = useAppStore((state) => state.ui.tableSort);
  const setTableGranularity = useAppStore((state) => state.setTableGranularity);
  const setTableAssetColumnsEnabled = useAppStore((state) => state.setTableAssetColumnsEnabled);
  const setTableSpreadsheetMode = useAppStore((state) => state.setTableSpreadsheetMode);
  const setTableSort = useAppStore((state) => state.setTableSort);
  const [scrollTop, setScrollTop] = useState(0);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: keyof DetailRow } | null>(null);
  const [draftValue, setDraftValue] = useState('');

  const rawRows = useMemo(() => {
    const rows = result?.result.rows ?? [];
    if (tableGranularity === 'annual') {
      return buildAnnualDetailRows(rows, startingAge, inflationRate);
    }
    return buildMonthlyDetailRows(rows, startingAge, inflationRate);
  }, [inflationRate, result, startingAge, tableGranularity]);

  const rows = useMemo(() => sortDetailRows(rawRows, tableSort), [rawRows, tableSort]);
  const columns = tableAssetColumnsEnabled ? [...baseColumns, ...assetColumns] : baseColumns;
  const tableMinWidthClass = tableAssetColumnsEnabled ? 'min-w-[2300px]' : 'min-w-[1200px]';

  const isVirtualized = tableGranularity === 'monthly' && !tableSpreadsheetMode;
  const totalHeight = rows.length * rowHeight;
  const visibleCount = Math.ceil(viewportHeight / rowHeight);
  const startIndex = isVirtualized ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan) : 0;
  const endIndex = isVirtualized
    ? Math.min(rows.length, Math.floor(scrollTop / rowHeight) + visibleCount + overscan)
    : rows.length;
  const visibleRows = rows.slice(startIndex, endIndex);
  const topSpacerHeight = isVirtualized ? startIndex * rowHeight : 0;
  const bottomSpacerHeight = isVirtualized ? Math.max(0, totalHeight - topSpacerHeight - visibleRows.length * rowHeight) : 0;

  const setSort = (column: string) => {
    if (!tableSort || tableSort.column !== column) {
      setTableSort({ column, direction: 'asc' });
      return;
    }
    if (tableSort.direction === 'asc') {
      setTableSort({ column, direction: 'desc' });
      return;
    }
    setTableSort(null);
  };

  useEffect(() => {
    if (mode !== AppMode.Tracking || simulationMode !== SimulationMode.Manual) {
      return;
    }
    if (rows.length === 0) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setSimulationStatus('running');
      void runReforecast({
        config: getCurrentConfig(),
        actualOverridesByMonth,
      })
        .then((response) => {
          setReforecastResult({
            simulationMode: SimulationMode.Manual,
            result: response.result,
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }
          const message = error instanceof Error ? error.message : 'Reforecast failed';
          setSimulationStatus('error', message);
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    actualOverridesByMonth,
    mode,
    rows.length,
    setReforecastResult,
    setSimulationStatus,
    simulationMode,
  ]);

  const isEditableCell = (row: DetailRow, column: Column): boolean =>
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    editableColumnKeys.has(column.key) &&
    (column.key === 'income' || column.key === 'expenses' || tableAssetColumnsEnabled);

  const isCellEdited = (row: DetailRow, column: Column): boolean => {
    const override = actualOverridesByMonth[row.monthIndex];
    if (!override) {
      return false;
    }
    switch (column.key) {
      case 'startStocks':
        return override.startBalances?.stocks !== undefined;
      case 'startBonds':
        return override.startBalances?.bonds !== undefined;
      case 'startCash':
        return override.startBalances?.cash !== undefined;
      case 'withdrawalStocks':
        return override.withdrawalsByAsset?.stocks !== undefined;
      case 'withdrawalBonds':
        return override.withdrawalsByAsset?.bonds !== undefined;
      case 'withdrawalCash':
        return override.withdrawalsByAsset?.cash !== undefined;
      case 'income':
        return override.incomeTotal !== undefined;
      case 'expenses':
        return override.expenseTotal !== undefined;
      default:
        return false;
    }
  };

  const displayCellValue = (row: DetailRow, column: Column): string | number => {
    const override = actualOverridesByMonth[row.monthIndex];
    if (!override) {
      return row[column.key] as string | number;
    }
    switch (column.key) {
      case 'startStocks':
        return override.startBalances?.stocks ?? row.startStocks;
      case 'startBonds':
        return override.startBalances?.bonds ?? row.startBonds;
      case 'startCash':
        return override.startBalances?.cash ?? row.startCash;
      case 'withdrawalStocks':
        return override.withdrawalsByAsset?.stocks ?? row.withdrawalStocks;
      case 'withdrawalBonds':
        return override.withdrawalsByAsset?.bonds ?? row.withdrawalBonds;
      case 'withdrawalCash':
        return override.withdrawalsByAsset?.cash ?? row.withdrawalCash;
      case 'income':
        return override.incomeTotal ?? row.income;
      case 'expenses':
        return override.expenseTotal ?? row.expenses;
      default:
        return row[column.key] as string | number;
    }
  };

  const commitCellEdit = (row: DetailRow, column: Column) => {
    const parsed = Number(draftValue.replace(/[^0-9.-]/g, ''));
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
    } else if (column.key === 'income') {
      patch.incomeTotal = normalized;
    } else if (column.key === 'expenses') {
      patch.expenseTotal = normalized;
    }

    upsertActualOverride(monthIndex, patch);
    setEditingCell(null);
  };

  return (
    <section
      className={`rounded-xl border border-brand-border bg-white shadow-panel ${
        tableSpreadsheetMode ? 'overflow-visible' : 'overflow-hidden'
      }`}
    >
      <div
        className={tableSpreadsheetMode ? 'overflow-visible' : 'max-h-[520px] overflow-auto'}
        onScroll={tableSpreadsheetMode ? undefined : (event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className={tableMinWidthClass}>
          <div className="sticky top-0 z-30 border-b border-brand-border bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedToggle
                value={tableGranularity}
                onChange={setTableGranularity}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Annual', value: 'annual' },
                ]}
              />
              <ToggleSwitch
                checked={tableAssetColumnsEnabled}
                onChange={setTableAssetColumnsEnabled}
                label="Show Asset Columns"
              />
              <ToggleSwitch
                checked={tableSpreadsheetMode}
                onChange={setTableSpreadsheetMode}
                label="Spreadsheet Mode"
              />
              {mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && mcStale ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  Stale
                </span>
              ) : null}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center px-6 text-sm text-slate-500">
              {mode === AppMode.Tracking
                ? 'Run a simulation in Tracking mode to initialize editable monthly rows.'
                : 'Run a simulation to populate monthly and annual detail rows.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-[60px] z-20 bg-white">
                <tr>
                  {columns.map((column) => {
                    const active = tableSort?.column === column.key;
                    const indicator = !active ? '' : tableSort?.direction === 'asc' ? ' ▲' : ' ▼';
                    return (
                      <th
                        key={column.key}
                        className="border-b border-brand-border bg-white px-3 py-2 text-left font-semibold text-slate-700"
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            className="whitespace-nowrap"
                            onClick={() => setSort(column.key)}
                          >
                            {column.label}
                            <span className="text-slate-400">{indicator}</span>
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    );
                  })}
                  {mode === AppMode.Tracking && tableGranularity === 'monthly' ? (
                    <th className="border-b border-brand-border bg-white px-2 py-2 text-left font-semibold text-slate-700">
                      Reset
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {topSpacerHeight > 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (mode === AppMode.Tracking && tableGranularity === 'monthly' ? 1 : 0)}
                      style={{ height: topSpacerHeight }}
                    />
                  </tr>
                ) : null}

                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 hover:bg-brand-surface ${
                      mode === AppMode.Tracking &&
                      tableGranularity === 'monthly' &&
                      lastEditedMonthIndex !== null &&
                      row.monthIndex <= lastEditedMonthIndex
                        ? 'bg-sky-50/40'
                        : ''
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${row.id}-${column.key}`}
                        className={`relative whitespace-nowrap px-3 py-2 font-mono ${valueToneClass(row, column)} ${
                          isCellEdited(row, column) ? 'bg-sky-100/70 font-semibold text-sky-900' : ''
                        }`}
                        onDoubleClick={() => {
                          if (!isEditableCell(row, column)) {
                            return;
                          }
                          setEditingCell({ rowId: row.id, column: column.key });
                          setDraftValue(String(Math.round(Number(row[column.key]))));
                        }}
                      >
                        {editingCell?.rowId === row.id && editingCell.column === column.key ? (
                          <input
                            autoFocus
                            value={draftValue}
                            onChange={(event) => setDraftValue(event.target.value)}
                            onBlur={() => commitCellEdit(row, column)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitCellEdit(row, column);
                              }
                              if (event.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="h-7 w-[110px] rounded border border-sky-400 px-2 text-xs"
                          />
                        ) : (
                          <>
                            {formatCell(displayCellValue(row, column), column)}
                            {isEditableCell(row, column) ? (
                              <span className="ml-1 text-[10px] text-slate-400">(edit)</span>
                            ) : null}
                          </>
                        )}
                        {isCellEdited(row, column) ? (
                          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sky-600" />
                        ) : null}
                      </td>
                    ))}
                    {mode === AppMode.Tracking && tableGranularity === 'monthly' ? (
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Reset row"
                          onClick={() => clearActualRowOverrides(row.monthIndex)}
                        >
                          ↺
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}

                {bottomSpacerHeight > 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (mode === AppMode.Tracking && tableGranularity === 'monthly' ? 1 : 0)}
                      style={{ height: bottomSpacerHeight }}
                    />
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
};
