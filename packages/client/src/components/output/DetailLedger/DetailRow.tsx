import React from 'react';

import { AppMode, type ActualMonthOverride } from '@finapp/shared';

import type { DetailRow as DetailRowType } from '../../../lib/detailTable';
import type { Column } from './cellHelpers';
import { DetailCell } from './DetailCell';
import type { CellCoord } from './useGridNavigation';

type DetailRowProps = {
  row: DetailRowType;
  rowIndex: number;
  columns: Column[];
  mode: AppMode;
  tableGranularity: 'monthly' | 'annual';
  tableAssetColumnsEnabled: boolean;
  actualOverridesByMonth: Record<number, ActualMonthOverride>;
  focusedCell: CellCoord | null;
  editingCell: CellCoord | null;
  draftValue: string;
  lastEditedMonthIndex: number | null;
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
};

const DetailRowInner = ({
  row,
  rowIndex,
  columns,
  mode,
  tableGranularity,
  tableAssetColumnsEnabled,
  actualOverridesByMonth,
  focusedCell,
  editingCell,
  draftValue,
  lastEditedMonthIndex,
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
}: DetailRowProps) => {
  const isPreservedRow =
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    ((canonicalBoundary !== null && row.monthIndex <= canonicalBoundary) ||
      (canonicalBoundary === null && lastEditedMonthIndex !== null && row.monthIndex <= lastEditedMonthIndex));

  const isLockedRow =
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    activeLedgerSlotId !== 'A' &&
    canonicalBoundary !== null &&
    row.monthIndex <= canonicalBoundary;

  const isResetDisabled =
    activeLedgerSlotId !== 'A' && canonicalBoundary !== null && row.monthIndex <= canonicalBoundary;

  return (
    <tr
      className="border-b border-slate-100 hover:bg-brand-surface"
      style={isPreservedRow ? { backgroundColor: 'var(--theme-state-preserved-row-background)' } : undefined}
    >
      {columns.map((column, colIndex) => (
        <DetailCell
          key={`${row.id}-${column.key}`}
          row={row}
          column={column}
          rowIndex={rowIndex}
          colIndex={colIndex}
          mode={mode}
          tableGranularity={tableGranularity}
          tableAssetColumnsEnabled={tableAssetColumnsEnabled}
          actualOverridesByMonth={actualOverridesByMonth}
          isFocused={focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === colIndex}
          isEditing={editingCell?.rowIndex === rowIndex && editingCell?.colIndex === colIndex}
          isLocked={isLockedRow}
          draftValue={draftValue}
          onDraftChange={onDraftChange}
          onCellClick={onCellClick}
          onCellDoubleClick={onCellDoubleClick}
          onCellKeyDown={onCellKeyDown}
          onEditorKeyDown={onEditorKeyDown}
          onEditorCommit={onEditorCommit}
          onEditStart={onEditStart}
          registerRef={registerRef}
        />
      ))}
      {mode === AppMode.Tracking && tableGranularity === 'monthly' ? (
        <td className="px-2 py-2">
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            title="Reset row"
            onClick={() => onResetRow(row.monthIndex)}
            disabled={isResetDisabled}
          >
            ↺
          </button>
        </td>
      ) : null}
    </tr>
  );
};

export const DetailRowComponent = React.memo(DetailRowInner);
