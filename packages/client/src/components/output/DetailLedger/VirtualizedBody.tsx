import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { AppMode, type ActualMonthOverride } from '@finapp/shared';

import type { DetailRow as DetailRowType } from '../../../lib/detailTable';
import type { Column } from './cellHelpers';
import { DetailRowComponent } from './DetailRow';
import type { CellCoord } from './useGridNavigation';

type VirtualizedBodyProps = {
  rows: DetailRowType[];
  columns: Column[];
  mode: AppMode;
  tableGranularity: 'monthly' | 'annual';
  tableAssetColumnsEnabled: boolean;
  tableSpreadsheetMode: boolean;
  tableMinWidthClass: string;
  actualOverridesByMonth: Record<number, ActualMonthOverride>;
  isCompareActive: boolean;
  maxEditableMonthIndex: number;
  runInflationRate: number | null;
  focusedCell: CellCoord | null;
  editingCell: CellCoord | null;
  draftValue: string;
  lastEditedMonthIndex: number | null;
  isTrackingOutputsStale: boolean;
  showResetColumn: boolean;
  activeLedgerSlotId: string;
  canonicalBoundary: number | null;
  onDraftChange: (value: string) => void;
  onCellClick: (rowIndex: number, colIndex: number) => void;
  onCellDoubleClick: (rowIndex: number, colIndex: number) => void;
  onCellKeyDown: (event: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  onEditorKeyDown: (event: React.KeyboardEvent) => void;
  onEditorCommit: () => void;
  onEditStart: (rowIndex: number, colIndex: number) => void;
  registerRef: (rowIndex: number, colIndex: number, el: HTMLElement | null) => void;
  onResetRow: (monthIndex: number) => void;
  renderHeader: () => React.ReactNode;
};

export const VirtualizedBody = ({
  rows,
  columns,
  mode,
  tableGranularity,
  tableAssetColumnsEnabled,
  tableSpreadsheetMode,
  tableMinWidthClass,
  actualOverridesByMonth,
  isCompareActive,
  maxEditableMonthIndex,
  runInflationRate,
  focusedCell,
  editingCell,
  draftValue,
  lastEditedMonthIndex,
  isTrackingOutputsStale,
  showResetColumn,
  activeLedgerSlotId,
  canonicalBoundary,
  onDraftChange,
  onCellClick,
  onCellDoubleClick,
  onCellKeyDown,
  onEditorKeyDown,
  onEditorCommit,
  onEditStart,
  registerRef,
  onResetRow,
  renderHeader,
}: VirtualizedBodyProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const isVirtualized = tableGranularity === 'monthly' && !tableSpreadsheetMode;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
    enabled: isVirtualized,
  });

  if (rows.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center px-6 text-sm text-slate-500">
        {mode === AppMode.Tracking
          ? 'Run a simulation in Tracking mode to initialize editable monthly rows.'
          : 'Run a simulation to populate monthly and annual detail rows.'}
      </div>
    );
  }

  if (!isVirtualized) {
    // Non-virtualized: render all rows (annual view or spreadsheet mode)
    return (
      <div className={tableSpreadsheetMode ? 'overflow-x-auto' : 'max-h-[474px] overflow-auto'}>
        <table className={`w-full border-collapse text-xs ${tableMinWidthClass}`}>
          {renderHeader()}
          <tbody>
            {rows.map((row, rowIndex) => (
              <DetailRowComponent
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                columns={columns}
                mode={mode}
                tableGranularity={tableGranularity}
                tableAssetColumnsEnabled={tableAssetColumnsEnabled}
                actualOverridesByMonth={actualOverridesByMonth}
                isCompareActive={isCompareActive}
                maxEditableMonthIndex={maxEditableMonthIndex}
                runInflationRate={runInflationRate}
                focusedCell={focusedCell}
                editingCell={editingCell}
                draftValue={draftValue}
                lastEditedMonthIndex={lastEditedMonthIndex}
                isTrackingOutputsStale={isTrackingOutputsStale}
                showResetColumn={showResetColumn}
                activeLedgerSlotId={activeLedgerSlotId}
                canonicalBoundary={canonicalBoundary}
                onDraftChange={onDraftChange}
                onCellClick={onCellClick}
                onCellDoubleClick={onCellDoubleClick}
                onCellKeyDown={onCellKeyDown}
                onEditorKeyDown={onEditorKeyDown}
                onEditorCommit={onEditorCommit}
                onEditStart={onEditStart}
                registerRef={registerRef}
                onResetRow={onResetRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Virtualized: TanStack Virtual
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="max-h-[474px] overflow-auto"
    >
      <table className={`w-full border-collapse text-xs ${tableMinWidthClass}`}>
        {renderHeader()}
        <tbody>
          {virtualItems.length > 0 && virtualItems[0]!.start > 0 ? (
            <tr>
                <td
                colSpan={columns.length + (showResetColumn ? 1 : 0)}
                style={{ height: virtualItems[0]!.start }}
              />
            </tr>
          ) : null}
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <DetailRowComponent
                key={row.id}
                row={row}
                rowIndex={virtualRow.index}
                columns={columns}
                mode={mode}
                tableGranularity={tableGranularity}
                tableAssetColumnsEnabled={tableAssetColumnsEnabled}
                actualOverridesByMonth={actualOverridesByMonth}
                isCompareActive={isCompareActive}
                maxEditableMonthIndex={maxEditableMonthIndex}
                runInflationRate={runInflationRate}
                focusedCell={focusedCell}
                editingCell={editingCell}
                draftValue={draftValue}
                lastEditedMonthIndex={lastEditedMonthIndex}
                isTrackingOutputsStale={isTrackingOutputsStale}
                showResetColumn={showResetColumn}
                activeLedgerSlotId={activeLedgerSlotId}
                canonicalBoundary={canonicalBoundary}
                onDraftChange={onDraftChange}
                onCellClick={onCellClick}
                onCellDoubleClick={onCellDoubleClick}
                onCellKeyDown={onCellKeyDown}
                onEditorKeyDown={onEditorKeyDown}
                onEditorCommit={onEditorCommit}
                onEditStart={onEditStart}
                registerRef={registerRef}
                onResetRow={onResetRow}
              />
            );
          })}
          {virtualItems.length > 0 ? (() => {
            const lastItem = virtualItems[virtualItems.length - 1]!;
            const remaining = virtualizer.getTotalSize() - lastItem.end;
            return remaining > 0 ? (
              <tr>
                  <td
                  colSpan={columns.length + (showResetColumn ? 1 : 0)}
                  style={{ height: remaining }}
                />
              </tr>
            ) : null;
          })() : null}
        </tbody>
      </table>
    </div>
  );
};
