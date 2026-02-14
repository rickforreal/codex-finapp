import { useMemo, useState } from 'react';

import { formatCurrency, formatPercent } from '../../lib/format';
import { buildAnnualDetailRows, buildMonthlyDetailRows, sortDetailRows, type DetailRow } from '../../lib/detailTable';
import { useActiveSimulationResult, useAppStore } from '../../store/useAppStore';
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

const formatCell = (row: DetailRow, column: Column): string | number => {
  const value = row[column.key];
  if (column.type === 'currency') {
    return formatCurrency(Math.round(Number(value)));
  }
  if (column.type === 'percent') {
    return formatPercent(Number(value), 2);
  }
  return value as string | number;
};

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
  const tableGranularity = useAppStore((state) => state.ui.tableGranularity);
  const tableAssetColumnsEnabled = useAppStore((state) => state.ui.tableAssetColumnsEnabled);
  const tableSpreadsheetMode = useAppStore((state) => state.ui.tableSpreadsheetMode);
  const tableSort = useAppStore((state) => state.ui.tableSort);
  const setTableGranularity = useAppStore((state) => state.setTableGranularity);
  const setTableAssetColumnsEnabled = useAppStore((state) => state.setTableAssetColumnsEnabled);
  const setTableSpreadsheetMode = useAppStore((state) => state.setTableSpreadsheetMode);
  const setTableSort = useAppStore((state) => state.setTableSort);
  const [scrollTop, setScrollTop] = useState(0);

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
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center px-6 text-sm text-slate-500">
              Run a simulation to populate monthly and annual detail rows.
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
                </tr>
              </thead>
              <tbody>
                {topSpacerHeight > 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ height: topSpacerHeight }} />
                  </tr>
                ) : null}

                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-brand-surface">
                    {columns.map((column) => (
                      <td
                        key={`${row.id}-${column.key}`}
                        className={`whitespace-nowrap px-3 py-2 font-mono ${valueToneClass(row, column)}`}
                      >
                        {formatCell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}

                {bottomSpacerHeight > 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ height: bottomSpacerHeight }} />
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
