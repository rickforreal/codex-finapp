import { useEffect, useMemo, useRef, useState, type MutableRefObject, type UIEvent } from 'react';

import { AppMode, SimulationMode, type ActualMonthOverride } from '@finapp/shared';

import { runSimulation } from '../../api/simulationApi';
import { formatCurrency, formatPercent } from '../../lib/format';
import { buildAnnualDetailRows, buildMonthlyDetailRows, sortDetailRows, type DetailRow } from '../../lib/detailTable';
import { getCurrentConfig, useActiveSimulationResult, useAppStore, useCompareSimulationResults } from '../../store/useAppStore';
import { SegmentedToggle } from '../shared/SegmentedToggle';

type Column = {
  key: keyof DetailRow;
  label: string;
  type: 'text' | 'currency' | 'percent' | 'number';
  sortable?: boolean;
};

const primaryColumns: Column[] = [
  { key: 'period', label: 'Period', type: 'text', sortable: true },
  { key: 'age', label: 'Age', type: 'number', sortable: true },
];

const monteCarloReferenceColumns: Column[] = [
  { key: 'startTotalP50', label: 'Start Total (p50)', type: 'currency', sortable: true },
];

const baseColumns: Column[] = [
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
const monteCarloReferenceTooltip =
  'Median start-of-period portfolio for this row across Monte Carlo simulations. For month m: p50(startTotal[m]).';
const monteCarloReferenceColumnTint = 'var(--theme-color-interactive-secondary)';
const monteCarloReferenceColumnText = 'var(--theme-color-text-secondary)';

const formatCell = (value: string | number | null, column: Column): string | number => {
  if (value === null) {
    return '—';
  }
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
  if (column.key === 'startTotalP50') {
    return 'text-slate-600';
  }
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

const deriveMonthlyReturnsFromRows = (
  rows: Array<{
    startBalances: { stocks: number; bonds: number; cash: number };
    marketChange: { stocks: number; bonds: number; cash: number };
  }>,
) =>
  rows.map((row) => ({
    stocks: row.startBalances.stocks === 0 ? 0 : row.marketChange.stocks / row.startBalances.stocks,
    bonds: row.startBalances.bonds === 0 ? 0 : row.marketChange.bonds / row.startBalances.bonds,
    cash: row.startBalances.cash === 0 ? 0 : row.marketChange.cash / row.startBalances.cash,
  }));

const computeStartBalanceDeltas = (
  row: DetailRow,
  override: ActualMonthOverride | undefined,
): { stocks: number; bonds: number; cash: number; total: number } => {
  if (!override?.startBalances) {
    return { stocks: 0, bonds: 0, cash: 0, total: 0 };
  }
  const stocks =
    override.startBalances.stocks !== undefined ? override.startBalances.stocks - row.startStocks : 0;
  const bonds =
    override.startBalances.bonds !== undefined ? override.startBalances.bonds - row.startBonds : 0;
  const cash =
    override.startBalances.cash !== undefined ? override.startBalances.cash - row.startCash : 0;
  return { stocks, bonds, cash, total: stocks + bonds + cash };
};

const isMonteCarloReferenceColumn = (column: Column): boolean => column.key === 'startTotalP50';

export const DetailTable = () => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const headerControlsRef = useRef<HTMLDivElement | null>(null);
  const compareLeftViewportRef = useRef<HTMLDivElement | null>(null);
  const compareRightViewportRef = useRef<HTMLDivElement | null>(null);
  const compareScrollSyncingRef = useRef(false);
  const result = useActiveSimulationResult();
  const compareResults = useCompareSimulationResults();
  const startingAge = useAppStore((state) => state.coreParams.startingAge);
  const inflationRate = useAppStore((state) => state.coreParams.inflationRate);
  const retirementStartDate = useAppStore((state) => state.coreParams.retirementStartDate);
  const mode = useAppStore((state) => state.mode);
  const simulationMode = useAppStore((state) => state.simulationMode);
  const simulationStatus = useAppStore((state) => state.simulationResults.status);
  const mcStale = useAppStore((state) => state.simulationResults.mcStale);
  const actualOverridesByMonth = useAppStore((state) => state.actualOverridesByMonth);
  const lastEditedMonthIndex = useAppStore((state) => state.lastEditedMonthIndex);
  const upsertActualOverride = useAppStore((state) => state.upsertActualOverride);
  const clearActualRowOverrides = useAppStore((state) => state.clearActualRowOverrides);
  const setSimulationResult = useAppStore((state) => state.setSimulationResult);
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
  const [headerOffset, setHeaderOffset] = useState(44);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: keyof DetailRow } | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; column: keyof DetailRow } | null>(null);
  const [compareHoveredRowId, setCompareHoveredRowId] = useState<string | null>(null);

  const rawRows = useMemo(() => {
    const rows = result?.result.rows ?? [];
    const runStartingAge = result?.configSnapshot?.coreParams.startingAge ?? startingAge;
    const runInflationRate = result?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
    const runRetirementStartDate = result?.configSnapshot?.coreParams.retirementStartDate ?? retirementStartDate;
    const runMonteCarloTotalP50 =
      simulationMode === SimulationMode.MonteCarlo
        ? (result?.monteCarlo?.percentileCurves.total.p50 ?? null)
        : null;
    if (tableGranularity === 'annual') {
      return buildAnnualDetailRows(
        rows,
        runStartingAge,
        runInflationRate,
        runRetirementStartDate,
        runMonteCarloTotalP50,
      );
    }
    return buildMonthlyDetailRows(
      rows,
      runStartingAge,
      runInflationRate,
      runRetirementStartDate,
      runMonteCarloTotalP50,
    );
  }, [inflationRate, result, retirementStartDate, simulationMode, startingAge, tableGranularity]);

  const rows = useMemo(() => sortDetailRows(rawRows, tableSort), [rawRows, tableSort]);
  const columns = useMemo(() => {
    const modeColumns =
      simulationMode === SimulationMode.MonteCarlo ? [...primaryColumns, ...monteCarloReferenceColumns, ...baseColumns] : [...primaryColumns, ...baseColumns];
    return tableAssetColumnsEnabled ? [...modeColumns, ...assetColumns] : modeColumns;
  }, [simulationMode, tableAssetColumnsEnabled]);
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

  const renderReferenceTooltip = () => (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-500 transition hover:text-slate-700"
        aria-label="About Start Total (p50)"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[120%] z-20 hidden w-64 -translate-x-1/2 rounded-md border border-brand-border bg-white px-2 py-1.5 text-left text-[11px] font-normal leading-snug text-slate-600 shadow-panel group-hover:block group-focus-within:block">
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

  useEffect(() => {
    if (mode !== AppMode.Tracking || simulationMode !== SimulationMode.Manual) {
      return;
    }
    if (lastEditedMonthIndex === null) {
      return;
    }
    if (rows.length === 0) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setSimulationStatus('running');
      const baselineRows = useAppStore.getState().simulationResults.manual?.result.rows ?? [];
      const monthlyReturns = deriveMonthlyReturnsFromRows(baselineRows);
      void runSimulation({
        config: getCurrentConfig(),
        monthlyReturns,
        actualOverridesByMonth,
      })
        .then((response) => {
          const state = useAppStore.getState();
          const visibleRows =
            (state.simulationResults.reforecast ?? state.simulationResults.manual)?.result.rows ?? [];
          const boundary = state.lastEditedMonthIndex ?? 0;
          const mergedRows = [...response.result.rows];

          if (boundary > 0 && visibleRows.length === mergedRows.length) {
            for (let index = 0; index < boundary; index += 1) {
              mergedRows[index] = visibleRows[index] ?? mergedRows[index]!;
            }
          }

          const terminal = mergedRows[mergedRows.length - 1]?.endBalances;
          const terminalPortfolioValue = terminal
            ? terminal.stocks + terminal.bonds + terminal.cash
            : response.result.summary.terminalPortfolioValue;

          setSimulationResult(SimulationMode.Manual, {
            ...response,
            result: {
              ...response.result,
              rows: mergedRows,
              summary: {
                ...response.result.summary,
                terminalPortfolioValue,
              },
            },
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
    lastEditedMonthIndex,
    mode,
    rows.length,
    setSimulationResult,
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

  const displayCellValue = (row: DetailRow, column: Column): string | number | null => {
    const override = actualOverridesByMonth[row.monthIndex];
    const deltas = computeStartBalanceDeltas(row, override);
    if (!override) {
      return row[column.key] as string | number | null;
    }
    const startStocks = override.startBalances?.stocks ?? row.startStocks;
    const startBonds = override.startBalances?.bonds ?? row.startBonds;
    const startCash = override.startBalances?.cash ?? row.startCash;
    const moveStocks = row.moveStocks + deltas.stocks;
    const moveBonds = row.moveBonds + deltas.bonds;
    const moveCash = row.moveCash + deltas.cash;
    const wdStocks = override.withdrawalsByAsset?.stocks ?? row.withdrawalStocks;
    const wdBonds = override.withdrawalsByAsset?.bonds ?? row.withdrawalBonds;
    const wdCash = override.withdrawalsByAsset?.cash ?? row.withdrawalCash;
    const endStocks = startStocks + moveStocks - wdStocks;
    const endBonds = startBonds + moveBonds - wdBonds;
    const endCash = startCash + moveCash - wdCash;
    switch (column.key) {
      case 'startTotal':
        return row.startTotal + deltas.total;
      case 'marketMovement':
        return row.marketMovement + deltas.total;
      case 'returnPct': {
        const adjustedStart = row.startTotal + deltas.total;
        const adjustedMove = row.marketMovement + deltas.total;
        return adjustedStart === 0 ? 0 : adjustedMove / adjustedStart;
      }
      case 'startStocks':
        return override.startBalances?.stocks ?? row.startStocks;
      case 'startBonds':
        return override.startBalances?.bonds ?? row.startBonds;
      case 'startCash':
        return override.startBalances?.cash ?? row.startCash;
      case 'moveStocks':
        return row.moveStocks + deltas.stocks;
      case 'moveBonds':
        return row.moveBonds + deltas.bonds;
      case 'moveCash':
        return row.moveCash + deltas.cash;
      case 'withdrawalStocks':
        return override.withdrawalsByAsset?.stocks ?? row.withdrawalStocks;
      case 'withdrawalBonds':
        return override.withdrawalsByAsset?.bonds ?? row.withdrawalBonds;
      case 'withdrawalCash':
        return override.withdrawalsByAsset?.cash ?? row.withdrawalCash;
      case 'endStocks':
        return endStocks;
      case 'endBonds':
        return endBonds;
      case 'endCash':
        return endCash;
      case 'endTotal':
        return endStocks + endBonds + endCash;
      case 'income':
        return override.incomeTotal ?? row.income;
      case 'expenses':
        return override.expenseTotal ?? row.expenses;
      default:
        return row[column.key] as string | number | null;
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
    setSelectedCell({ rowId: row.id, column: column.key });
  };

  const moveSelection = (forward: boolean) => {
    if (rows.length === 0 || columns.length === 0) {
      return;
    }
    const currentRowIndex = selectedCell ? rows.findIndex((row) => row.id === selectedCell.rowId) : 0;
    const currentColumnIndex = selectedCell ? columns.findIndex((column) => column.key === selectedCell.column) : 0;
    const safeRowIndex = currentRowIndex < 0 ? 0 : currentRowIndex;
    const safeColumnIndex = currentColumnIndex < 0 ? 0 : currentColumnIndex;
    const currentFlat = safeRowIndex * columns.length + safeColumnIndex;
    const maxFlat = rows.length * columns.length - 1;
    const nextFlat = Math.max(0, Math.min(maxFlat, currentFlat + (forward ? 1 : -1)));
    const nextRow = rows[Math.floor(nextFlat / columns.length)];
    const nextColumn = columns[nextFlat % columns.length];
    if (!nextRow || !nextColumn) {
      return;
    }
    setSelectedCell({ rowId: nextRow.id, column: nextColumn.key });
  };

  const beginCellEdit = (row: DetailRow, column: Column) => {
    if (!isEditableCell(row, column)) {
      return;
    }
    setEditingCell({ rowId: row.id, column: column.key });
    setSelectedCell({ rowId: row.id, column: column.key });
    setDraftValue(String(Math.round(Number(displayCellValue(row, column)))));
  };

  useEffect(() => {
    if (editingCell) {
      return;
    }
    if (!selectedCell) {
      return;
    }
    let target = document.querySelector<HTMLElement>(
      `[data-cell-id="${selectedCell.rowId}:${String(selectedCell.column)}"]`,
    );
    if (!target && isVirtualized) {
      const rowIndex = rows.findIndex((row) => row.id === selectedCell.rowId);
      if (rowIndex >= 0) {
        const nextScrollTop = Math.max(0, rowIndex * rowHeight - rowHeight * 2);
        viewportRef.current?.scrollTo({ top: nextScrollTop });
        setScrollTop(nextScrollTop);
        target = document.querySelector<HTMLElement>(
          `[data-cell-id="${selectedCell.rowId}:${String(selectedCell.column)}"]`,
        );
      }
    }
    target?.focus();
  }, [editingCell, isVirtualized, rows, selectedCell]);

  useEffect(() => {
    const node = headerControlsRef.current;
    if (!node) {
      return;
    }
    const updateOffset = () => {
      setHeaderOffset(Math.max(0, Math.ceil(node.getBoundingClientRect().height)));
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(node);
    return () => observer.disconnect();
  }, [simulationMode]);

  useEffect(() => {
    if (tableSpreadsheetMode) {
      setScrollTop(0);
      return;
    }
    const next = viewportRef.current?.scrollTop ?? 0;
    setScrollTop(next);
  }, [tableSpreadsheetMode, tableGranularity, rows.length]);

  const BreakdownLabelToggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (next: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium transition ${
        checked ? 'text-blue-500' : 'text-slate-500 hover:text-slate-700'
      }`}
      aria-pressed={checked}
    >
      <span className="text-base leading-none">◷</span>
      <span>Breakdown</span>
    </button>
  );

  const moveSelectionByArrow = (rowDelta: number, columnDelta: number) => {
    if (!selectedCell || rows.length === 0 || columns.length === 0) {
      return;
    }
    const rowIndex = rows.findIndex((row) => row.id === selectedCell.rowId);
    const columnIndex = columns.findIndex((column) => column.key === selectedCell.column);
    if (rowIndex < 0 || columnIndex < 0) {
      return;
    }
    const nextRowIndex = Math.max(0, Math.min(rows.length - 1, rowIndex + rowDelta));
    const nextColumnIndex = Math.max(0, Math.min(columns.length - 1, columnIndex + columnDelta));
    const nextRow = rows[nextRowIndex];
    const nextColumn = columns[nextColumnIndex];
    if (!nextRow || !nextColumn) {
      return;
    }
    setSelectedCell({ rowId: nextRow.id, column: nextColumn.key });
  };

  const syncCompareScroll = (source: 'left' | 'right') => (event: UIEvent<HTMLDivElement>) => {
    if (compareScrollSyncingRef.current) {
      return;
    }
    const sourceNode = event.currentTarget;
    const targetNode = source === 'left' ? compareRightViewportRef.current : compareLeftViewportRef.current;
    if (!targetNode) {
      return;
    }
    compareScrollSyncingRef.current = true;
    targetNode.scrollTop = sourceNode.scrollTop;
    targetNode.scrollLeft = sourceNode.scrollLeft;
    requestAnimationFrame(() => {
      compareScrollSyncingRef.current = false;
    });
  };

  if (mode === AppMode.Compare) {
    const resolveSlotResult = (workspace: (typeof compareResults)['leftWorkspace']) => {
      if (!workspace) {
        return null;
      }
      const preferred =
        simulationMode === SimulationMode.Manual
          ? workspace.simulationResults.manual
          : workspace.simulationResults.monteCarlo;
      return preferred ?? workspace.simulationResults.manual ?? workspace.simulationResults.monteCarlo;
    };
    const leftResult = resolveSlotResult(compareResults.leftWorkspace);
    const rightResult = resolveSlotResult(compareResults.rightWorkspace);
    const toRows = (
      slotRows: Array<{
        monthIndex: number;
        year: number;
        monthInYear: number;
        startBalances: { stocks: number; bonds: number; cash: number };
        marketChange: { stocks: number; bonds: number; cash: number };
        withdrawals: {
          byAsset: { stocks: number; bonds: number; cash: number };
          requested: number;
          actual: number;
          shortfall: number;
        };
        incomeTotal: number;
        expenseTotal: number;
        endBalances: { stocks: number; bonds: number; cash: number };
      }>,
      slotResult: ReturnType<typeof resolveSlotResult>,
    ) => {
      const slotStartingAge = slotResult?.configSnapshot?.coreParams.startingAge ?? startingAge;
      const slotInflationRate = slotResult?.configSnapshot?.coreParams.inflationRate ?? inflationRate;
      const slotRetirementStartDate =
        slotResult?.configSnapshot?.coreParams.retirementStartDate ?? retirementStartDate;
      const slotMonteCarloTotalP50 =
        simulationMode === SimulationMode.MonteCarlo
          ? (slotResult?.monteCarlo?.percentileCurves.total.p50 ?? null)
          : null;
      if (tableGranularity === 'annual') {
        return buildAnnualDetailRows(
          slotRows,
          slotStartingAge,
          slotInflationRate,
          slotRetirementStartDate,
          slotMonteCarloTotalP50,
        );
      }
      return buildMonthlyDetailRows(
        slotRows,
        slotStartingAge,
        slotInflationRate,
        slotRetirementStartDate,
        slotMonteCarloTotalP50,
      );
    };
    const leftRows = sortDetailRows(toRows(leftResult?.result.rows ?? [], leftResult), tableSort);
    const rightRows = sortDetailRows(toRows(rightResult?.result.rows ?? [], rightResult), tableSort);

    const renderPane = (
      title: string,
      paneRows: DetailRow[],
      viewportRefForPane: MutableRefObject<HTMLDivElement | null>,
      onPaneScroll: (event: UIEvent<HTMLDivElement>) => void,
    ) => (
      <div className="min-w-0 flex-1 rounded-lg border border-brand-border bg-white">
        <div className="border-b border-brand-border px-3 py-2 text-xs font-semibold text-slate-700">{title}</div>
        <div ref={viewportRefForPane} className="max-h-[430px] overflow-auto" onScroll={onPaneScroll}>
          <table className={`${tableMinWidthClass} w-full border-collapse text-left text-xs`}>
            <thead className="sticky top-0 z-[1] bg-brand-surface text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="border-b border-brand-border px-2 py-2 font-semibold"
                    style={
                      isMonteCarloReferenceColumn(column)
                        ? {
                            backgroundColor: monteCarloReferenceColumnTint,
                            color: monteCarloReferenceColumnText,
                          }
                        : undefined
                    }
                  >
                    {renderColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paneRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-2 py-6 text-center text-slate-500">
                    Run compare simulation to populate this ledger.
                  </td>
                </tr>
              ) : (
                paneRows.map((row) => (
                  <tr
                    key={`${title}-${row.id}`}
                    className={`border-b border-slate-100 bg-brand-surface transition-colors hover:bg-brand-panel ${
                      compareHoveredRowId === row.id ? 'bg-brand-panel' : ''
                    }`}
                    onMouseEnter={() => setCompareHoveredRowId(row.id)}
                    onMouseLeave={() => setCompareHoveredRowId(null)}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${title}-${row.id}-${String(column.key)}`}
                        className={`whitespace-nowrap px-3 py-2 font-mono ${valueToneClass(row, column)}`}
                        style={
                          isMonteCarloReferenceColumn(column)
                            ? {
                                backgroundColor: monteCarloReferenceColumnTint,
                                color: monteCarloReferenceColumnText,
                              }
                            : undefined
                        }
                      >
                        {formatCell(row[column.key] as string | number | null, column)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

    return (
      <section className="rounded-xl border border-brand-border bg-white shadow-panel">
        <div className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Detail Ledger</h3>
            {simulationMode === SimulationMode.MonteCarlo ? (
              <p className="text-xs text-slate-500">Showing representative path values with Start Total (p50) reference.</p>
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
            >
              <span className="text-base leading-none">◷</span>
              <span>Breakdown</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
          {renderPane('Portfolio A', leftRows, compareLeftViewportRef, syncCompareScroll('left'))}
          {renderPane('Portfolio B', rightRows, compareRightViewportRef, syncCompareScroll('right'))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative rounded-xl border border-brand-border bg-white shadow-panel ${
        tableSpreadsheetMode ? 'overflow-visible' : 'overflow-hidden'
      }`}
    >
      <div
        ref={viewportRef}
        className={tableSpreadsheetMode ? 'overflow-visible' : 'max-h-[520px] overflow-auto'}
        onScroll={tableSpreadsheetMode ? undefined : (event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className={tableMinWidthClass}>
          <div ref={headerControlsRef} className="sticky top-0 z-30 border-b border-brand-border bg-white px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Detail Ledger</p>
                {simulationMode === SimulationMode.MonteCarlo ? (
                  <p className="text-xs text-slate-500">Showing representative path values with Start Total (p50) reference.</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedToggle
                  value={tableGranularity}
                  onChange={setTableGranularity}
                  options={[
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Annual', value: 'annual' },
                  ]}
                />
                <BreakdownLabelToggle checked={tableAssetColumnsEnabled} onChange={setTableAssetColumnsEnabled} />
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
                {mode === AppMode.Tracking && simulationMode === SimulationMode.MonteCarlo && mcStale ? (
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
          </div>

          {rows.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center px-6 text-sm text-slate-500">
              {mode === AppMode.Tracking
                ? 'Run a simulation in Tracking mode to initialize editable monthly rows.'
                : 'Run a simulation to populate monthly and annual detail rows.'}
            </div>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead
                className="sticky z-20 bg-white"
                style={{ top: headerOffset }}
              >
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
                        ? ''
                        : ''
                    }`}
                    style={
                      mode === AppMode.Tracking &&
                      tableGranularity === 'monthly' &&
                      lastEditedMonthIndex !== null &&
                      row.monthIndex <= lastEditedMonthIndex
                        ? { backgroundColor: 'var(--theme-state-preserved-row-background)' }
                        : undefined
                    }
                  >
                    {columns.map((column) => (
                      <td
                        key={`${row.id}-${column.key}`}
                        data-cell-id={`${row.id}:${String(column.key)}`}
                        tabIndex={
                          selectedCell?.rowId === row.id && selectedCell.column === column.key ? 0 : -1
                        }
                        className={`relative whitespace-nowrap px-3 py-2 font-mono outline-none ${valueToneClass(row, column)} ${
                          isCellEdited(row, column) ? 'font-semibold' : ''
                        }`}
                        style={{
                          backgroundColor:
                            selectedCell?.rowId === row.id && selectedCell.column === column.key
                              ? 'var(--theme-color-interactive-secondary)'
                              : isCellEdited(row, column)
                                ? 'var(--theme-state-edited-cell-background)'
                                : isMonteCarloReferenceColumn(column)
                                  ? monteCarloReferenceColumnTint
                                  : undefined,
                          boxShadow:
                            selectedCell?.rowId === row.id && selectedCell.column === column.key
                              ? 'inset 0 0 0 2px var(--theme-state-selected-cell-outline)'
                              : undefined,
                          color: isMonteCarloReferenceColumn(column) ? monteCarloReferenceColumnText : undefined,
                        }}
                        onClick={() => setSelectedCell({ rowId: row.id, column: column.key })}
                        onDoubleClick={() => beginCellEdit(row, column)}
                        onKeyDown={(event) => {
                          if (event.key === 'Tab') {
                            event.preventDefault();
                            moveSelection(!event.shiftKey);
                            return;
                          }
                          if (event.key === 'ArrowRight') {
                            event.preventDefault();
                            moveSelectionByArrow(0, 1);
                            return;
                          }
                          if (event.key === 'ArrowLeft') {
                            event.preventDefault();
                            moveSelectionByArrow(0, -1);
                            return;
                          }
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            moveSelectionByArrow(1, 0);
                            return;
                          }
                          if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            moveSelectionByArrow(-1, 0);
                            return;
                          }
                          if (event.key === 'Enter' && editingCell === null) {
                            event.preventDefault();
                            beginCellEdit(row, column);
                          }
                        }}
                      >
                        {editingCell?.rowId === row.id && editingCell.column === column.key ? (
                          <input
                            autoFocus
                            value={draftValue}
                            onChange={(event) => setDraftValue(event.target.value)}
                            onBlur={() => commitCellEdit(row, column)}
                            onFocus={(event) => event.currentTarget.select()}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitCellEdit(row, column);
                              }
                              if (event.key === 'Tab') {
                                event.preventDefault();
                                commitCellEdit(row, column);
                                moveSelection(!event.shiftKey);
                              }
                              if (event.key === 'Escape') {
                                setEditingCell(null);
                              }
                            }}
                            className="h-7 w-[110px] rounded border px-2 text-xs"
                            style={{
                              borderColor: 'var(--theme-state-selected-cell-outline)',
                              backgroundColor: 'var(--theme-color-surface-primary)',
                              color: 'var(--theme-color-text-primary)',
                            }}
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
                          <span
                            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: 'var(--theme-state-selected-cell-outline)' }}
                          />
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
      {simulationStatus === 'running' ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px]">
          <div className="rounded-md border border-brand-border bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue align-[-1px]" />
            Recomputing detail ledger...
          </div>
        </div>
      ) : null}
    </section>
  );
};
