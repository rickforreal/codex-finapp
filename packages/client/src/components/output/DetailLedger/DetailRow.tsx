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
  registerRef,
  onResetRow,
}: DetailRowProps) => {
  const preservedBoundary = canonicalBoundary ?? lastEditedMonthIndex;
  const isPreservedRow =
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    preservedBoundary !== null &&
    row.monthIndex <= preservedBoundary;

  const isLockedRow =
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    isCompareActive &&
    activeLedgerSlotId !== 'A';

  const isProjectionStaleRow =
    mode === AppMode.Tracking &&
    tableGranularity === 'monthly' &&
    isTrackingOutputsStale &&
    !isPreservedRow &&
    (preservedBoundary === null || row.monthIndex > preservedBoundary);

  const isResetDisabled =
    activeLedgerSlotId !== 'A' ||
    row.monthIndex > maxEditableMonthIndex ||
    mode !== AppMode.Tracking ||
    tableGranularity !== 'monthly';

  return (
    <tr
      className={`border-b border-slate-100 ${isProjectionStaleRow ? '' : 'hover:bg-brand-surface'}`}
      style={
        isPreservedRow
          ? { backgroundColor: 'var(--theme-state-preserved-row-background)' }
          : isProjectionStaleRow
            ? {
                backgroundColor:
                  'color-mix(in srgb, var(--theme-color-surface-secondary) 80%, var(--theme-color-text-primary) 20%)',
                opacity: 0.62,
              }
            : undefined
      }
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
          activeLedgerSlotId={activeLedgerSlotId}
          isCompareActive={isCompareActive}
          maxEditableMonthIndex={maxEditableMonthIndex}
          runInflationRate={runInflationRate}
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
          registerRef={registerRef}
        />
      ))}
      {showResetColumn ? (
        <td className="px-1 py-0 align-middle leading-none">
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded text-[11px] leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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
