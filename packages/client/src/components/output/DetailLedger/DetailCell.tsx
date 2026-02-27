import React, { useCallback } from 'react';

import { AppMode, type ActualMonthOverride } from '@finapp/shared';

import type { DetailRow } from '../../../lib/detailTable';
import {
  type Column,
  formatCell,
  valueToneClass,
  isMonteCarloReferenceColumn,
  monteCarloReferenceColumnTint,
  monteCarloReferenceColumnText,
  isEditableCell,
  isCellEdited,
  displayCellValue,
} from './cellHelpers';
import { CellEditor } from './CellEditor';

type DetailCellProps = {
  row: DetailRow;
  column: Column;
  rowIndex: number;
  colIndex: number;
  mode: AppMode;
  tableGranularity: 'monthly' | 'annual';
  tableAssetColumnsEnabled: boolean;
  actualOverridesByMonth: Record<number, ActualMonthOverride>;
  activeLedgerSlotId: string;
  isCompareActive: boolean;
  maxEditableMonthIndex: number;
  runInflationRate: number | null;
  isFocused: boolean;
  isEditing: boolean;
  isLocked: boolean;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onCellClick: (rowIndex: number, colIndex: number) => void;
  onCellDoubleClick: (rowIndex: number, colIndex: number) => void;
  onCellKeyDown: (event: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  onEditorKeyDown: (event: React.KeyboardEvent) => void;
  onEditorCommit: () => void;
  onEditStart: (rowIndex: number, colIndex: number) => void;
  registerRef: (rowIndex: number, colIndex: number, el: HTMLElement | null) => void;
};

const DetailCellInner = ({
  row,
  column,
  rowIndex,
  colIndex,
  mode,
  tableGranularity,
  tableAssetColumnsEnabled,
  actualOverridesByMonth,
  activeLedgerSlotId,
  isCompareActive,
  maxEditableMonthIndex,
  runInflationRate,
  isFocused,
  isEditing,
  isLocked,
  draftValue,
  onDraftChange,
  onCellClick,
  onCellDoubleClick,
  onCellKeyDown,
  onEditorKeyDown,
  onEditorCommit,
  onEditStart,
  registerRef,
}: DetailCellProps) => {
  const edited = (!isCompareActive || activeLedgerSlotId === 'A')
    && isCellEdited(row, column, actualOverridesByMonth);
  const editable = isEditableCell(
    row,
    column,
    mode,
    tableGranularity,
    tableAssetColumnsEnabled,
    activeLedgerSlotId,
    isCompareActive,
    maxEditableMonthIndex,
  );

  const cellValue =
    mode === AppMode.Tracking && tableGranularity === 'monthly'
      ? displayCellValue(row, column, actualOverridesByMonth, runInflationRate)
      : (row[column.key] as string | number | null);

  const refCallback = useCallback(
    (el: HTMLElement | null) => registerRef(rowIndex, colIndex, el),
    [registerRef, rowIndex, colIndex],
  );

  return (
    <td
      ref={refCallback}
      data-cell-id={`${row.id}:${String(column.key)}`}
      tabIndex={isFocused ? 0 : -1}
      className={`relative whitespace-nowrap px-3 py-2 font-mono outline-none ${valueToneClass(row, column)} ${
        edited ? 'font-semibold' : ''
      } ${isLocked ? 'cursor-not-allowed opacity-75' : ''}`}
      style={{
        backgroundColor: isFocused
          ? 'var(--theme-color-interactive-secondary)'
          : edited
            ? 'var(--theme-state-edited-cell-background)'
            : isMonteCarloReferenceColumn(column)
              ? monteCarloReferenceColumnTint
              : undefined,
        boxShadow: isFocused
          ? 'inset 0 0 0 2px var(--theme-state-selected-cell-outline)'
          : undefined,
        color: isMonteCarloReferenceColumn(column) ? monteCarloReferenceColumnText : undefined,
      }}
      onClick={() => onCellClick(rowIndex, colIndex)}
      onDoubleClick={() => {
        if (!isLocked) {
          onCellDoubleClick(rowIndex, colIndex);
        }
      }}
      onKeyDown={(event) => onCellKeyDown(event, rowIndex, colIndex)}
    >
      {isEditing ? (
        <CellEditor
          value={draftValue}
          onChange={onDraftChange}
          onCommit={onEditorCommit}
          onKeyDown={onEditorKeyDown}
        />
      ) : (
        <>
          {formatCell(cellValue, column)}
          {edited ? (
            <span
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--theme-state-selected-cell-outline)' }}
            />
          ) : null}
          {editable && !isLocked ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEditStart(rowIndex, colIndex);
              }}
              className="ml-1 cursor-pointer text-[10px] text-slate-400 hover:text-slate-600"
            >
              (edit)
            </button>
          ) : null}
        </>
      )}
    </td>
  );
};

export const DetailCell = React.memo(DetailCellInner, (prev, next) => {
  // Custom comparator: only re-render when these specific props change
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.isEditing !== next.isEditing) return false;
  if (prev.isLocked !== next.isLocked) return false;
  if (prev.draftValue !== next.draftValue && next.isEditing) return false;
  if (prev.row !== next.row) return false;
  if (prev.column !== next.column) return false;
  if (prev.mode !== next.mode) return false;
  if (prev.tableGranularity !== next.tableGranularity) return false;
  if (prev.tableAssetColumnsEnabled !== next.tableAssetColumnsEnabled) return false;
  if (prev.activeLedgerSlotId !== next.activeLedgerSlotId) return false;
  if (prev.isCompareActive !== next.isCompareActive) return false;
  if (prev.maxEditableMonthIndex !== next.maxEditableMonthIndex) return false;
  if (prev.runInflationRate !== next.runInflationRate) return false;
  // Check if the override for this specific row changed
  const prevOverride = prev.actualOverridesByMonth[prev.row.monthIndex];
  const nextOverride = next.actualOverridesByMonth[next.row.monthIndex];
  if (prevOverride !== nextOverride) return false;
  return true;
});
