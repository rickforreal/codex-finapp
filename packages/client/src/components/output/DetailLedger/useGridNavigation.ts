import { useCallback, useRef, useState } from 'react';

import { AppMode } from '@finapp/shared';

import type { DetailRow } from '../../../lib/detailTable';
import { type Column, editableColumnKeys, formatCell, displayCellValue } from './cellHelpers';

export type CellCoord = { rowIndex: number; colIndex: number };

export type GridNavigationState = {
  /** Currently focused cell coordinates, or null if no cell is focused */
  focusedCell: CellCoord | null;
  /** Currently editing cell coordinates, or null if not editing */
  editingCell: CellCoord | null;
  /** Draft value for the cell editor */
  draftValue: string;
};

export type GridNavigationActions = {
  /** Set the focused cell */
  setFocusedCell: (coord: CellCoord | null) => void;
  /** Start editing a cell */
  beginEdit: (coord: CellCoord, initialValue?: string) => void;
  /** Commit the current edit */
  commitEdit: () => void;
  /** Cancel the current edit */
  cancelEdit: () => void;
  /** Update the draft value */
  setDraftValue: (value: string) => void;
  /** Handle a keydown event on a cell */
  handleCellKeyDown: (event: React.KeyboardEvent, rowIndex: number, colIndex: number) => void;
  /** Handle a keydown event on the cell editor input */
  handleEditorKeyDown: (event: React.KeyboardEvent) => void;
  /** Handle click on a cell */
  handleCellClick: (rowIndex: number, colIndex: number) => void;
  /** Handle double-click on a cell */
  handleCellDoubleClick: (rowIndex: number, colIndex: number) => void;
  /** Ref map for cell elements */
  cellRefMap: React.MutableRefObject<Map<string, HTMLElement>>;
  /** Register a cell element ref */
  registerCellRef: (rowIndex: number, colIndex: number, el: HTMLElement | null) => void;
};

type UseGridNavigationOptions = {
  rows: DetailRow[];
  columns: Column[];
  mode: AppMode;
  tableGranularity: 'monthly' | 'annual';
  tableAssetColumnsEnabled: boolean;
  actualOverridesByMonth: Record<number, unknown>;
  activeLedgerSlotId: string;
  canonicalBoundary: number | null;
  onCommit: (row: DetailRow, column: Column, value: string) => void;
};

const coordKey = (rowIndex: number, colIndex: number) => `${rowIndex}:${colIndex}`;

export const useGridNavigation = (
  options: UseGridNavigationOptions,
): GridNavigationState & GridNavigationActions => {
  const { rows, columns, mode, tableGranularity, tableAssetColumnsEnabled, actualOverridesByMonth, activeLedgerSlotId, canonicalBoundary, onCommit } = options;

  const [focusedCell, setFocusedCell] = useState<CellCoord | null>(null);
  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const cellRefMap = useRef<Map<string, HTMLElement>>(new Map());

  const registerCellRef = useCallback((rowIndex: number, colIndex: number, el: HTMLElement | null) => {
    const key = coordKey(rowIndex, colIndex);
    if (el) {
      cellRefMap.current.set(key, el);
    } else {
      cellRefMap.current.delete(key);
    }
  }, []);

  const focusCell = useCallback((coord: CellCoord) => {
    setFocusedCell(coord);
    const el = cellRefMap.current.get(coordKey(coord.rowIndex, coord.colIndex));
    el?.focus();
  }, []);

  const isEditable = useCallback(
    (rowIndex: number, colIndex: number): boolean => {
      const column = columns[colIndex];
      if (!column) return false;
      return (
        mode === AppMode.Tracking &&
        tableGranularity === 'monthly' &&
        editableColumnKeys.has(column.key) &&
        (column.key === 'income' || column.key === 'expenses' || tableAssetColumnsEnabled)
      );
    },
    [columns, mode, tableGranularity, tableAssetColumnsEnabled],
  );

  const isLockedByCanonicalBoundary = useCallback(
    (rowIndex: number, colIndex: number): boolean => {
      const row = rows[rowIndex];
      if (!row) return false;
      return (
        mode === AppMode.Tracking &&
        tableGranularity === 'monthly' &&
        activeLedgerSlotId !== 'A' &&
        canonicalBoundary !== null &&
        row.monthIndex <= canonicalBoundary &&
        isEditable(rowIndex, colIndex)
      );
    },
    [rows, mode, tableGranularity, activeLedgerSlotId, canonicalBoundary, isEditable],
  );

  const canEdit = useCallback(
    (rowIndex: number, colIndex: number): boolean => {
      return isEditable(rowIndex, colIndex) && !isLockedByCanonicalBoundary(rowIndex, colIndex);
    },
    [isEditable, isLockedByCanonicalBoundary],
  );

  const beginEdit = useCallback(
    (coord: CellCoord, initialValue?: string) => {
      if (!canEdit(coord.rowIndex, coord.colIndex)) return;
      const row = rows[coord.rowIndex];
      const column = columns[coord.colIndex];
      if (!row || !column) return;

      setEditingCell(coord);
      setFocusedCell(coord);
      if (initialValue !== undefined) {
        setDraftValue(initialValue);
      } else {
        const raw = displayCellValue(row, column, actualOverridesByMonth as Record<number, import('@finapp/shared').ActualMonthOverride>);
        setDraftValue(String(Math.round(Number(raw))));
      }
    },
    [canEdit, rows, columns, actualOverridesByMonth],
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const row = rows[editingCell.rowIndex];
    const column = columns[editingCell.colIndex];
    if (row && column) {
      onCommit(row, column, draftValue);
    }
    setEditingCell(null);
  }, [editingCell, rows, columns, draftValue, onCommit]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const moveByArrow = useCallback(
    (rowDelta: number, colDelta: number) => {
      if (!focusedCell || rows.length === 0 || columns.length === 0) return;
      const nextRow = Math.max(0, Math.min(rows.length - 1, focusedCell.rowIndex + rowDelta));
      const nextCol = Math.max(0, Math.min(columns.length - 1, focusedCell.colIndex + colDelta));
      focusCell({ rowIndex: nextRow, colIndex: nextCol });
    },
    [focusedCell, rows.length, columns.length, focusCell],
  );

  const moveByTab = useCallback(
    (forward: boolean) => {
      if (rows.length === 0 || columns.length === 0) return;
      const startRow = focusedCell?.rowIndex ?? 0;
      const startCol = focusedCell?.colIndex ?? 0;
      const totalCells = rows.length * columns.length;
      const startFlat = startRow * columns.length + startCol;
      const step = forward ? 1 : -1;

      // Search for the next editable cell, wrapping around
      for (let i = 1; i < totalCells; i++) {
        const candidateFlat = ((startFlat + i * step) % totalCells + totalCells) % totalCells;
        const candidateRow = Math.floor(candidateFlat / columns.length);
        const candidateCol = candidateFlat % columns.length;
        if (isEditable(candidateRow, candidateCol)) {
          focusCell({ rowIndex: candidateRow, colIndex: candidateCol });
          return;
        }
      }

      // No editable cell found — just move by one cell
      const nextFlat = Math.max(0, Math.min(totalCells - 1, startFlat + step));
      const nextRowIndex = Math.floor(nextFlat / columns.length);
      const nextColIndex = nextFlat % columns.length;
      focusCell({ rowIndex: nextRowIndex, colIndex: nextColIndex });
    },
    [focusedCell, rows.length, columns.length, focusCell, isEditable],
  );

  const copyCell = useCallback(() => {
    if (!focusedCell) return;
    const row = rows[focusedCell.rowIndex];
    const column = columns[focusedCell.colIndex];
    if (!row || !column) return;
    const value = displayCellValue(row, column, actualOverridesByMonth as Record<number, import('@finapp/shared').ActualMonthOverride>);
    const formatted = String(formatCell(value, column));
    void navigator.clipboard.writeText(formatted);
  }, [focusedCell, rows, columns, actualOverridesByMonth]);

  const pasteCell = useCallback(() => {
    if (!focusedCell) return;
    if (!canEdit(focusedCell.rowIndex, focusedCell.colIndex)) return;
    void navigator.clipboard.readText().then((text) => {
      beginEdit(focusedCell, text.trim());
    });
  }, [focusedCell, canEdit, beginEdit]);

  const handleCellKeyDown = useCallback(
    (event: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
      if (editingCell) return; // Editor handles its own keys

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          moveByArrow(-1, 0);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveByArrow(1, 0);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveByArrow(0, -1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveByArrow(0, 1);
          break;
        case 'Tab':
          event.preventDefault();
          moveByTab(!event.shiftKey);
          break;
        case 'Enter':
          event.preventDefault();
          beginEdit({ rowIndex, colIndex });
          break;
        case 'Backspace':
        case 'Delete':
          event.preventDefault();
          if (canEdit(rowIndex, colIndex)) {
            beginEdit({ rowIndex, colIndex }, '');
          }
          break;
        default:
          // Type-to-edit: single printable character starts editing
          if (
            event.key.length === 1 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            canEdit(rowIndex, colIndex)
          ) {
            event.preventDefault();
            beginEdit({ rowIndex, colIndex }, event.key);
          }
          // Copy
          if (event.key === 'c' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            copyCell();
          }
          // Paste
          if (event.key === 'v' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            pasteCell();
          }
          break;
      }
    },
    [editingCell, moveByArrow, moveByTab, beginEdit, canEdit, copyCell, pasteCell],
  );

  const handleEditorKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        commitEdit();
        // Move focus down after commit
        if (editingCell) {
          const nextRow = Math.min(rows.length - 1, editingCell.rowIndex + 1);
          focusCell({ rowIndex: nextRow, colIndex: editingCell.colIndex });
        }
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        commitEdit();
        moveByTab(!event.shiftKey);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit, editingCell, rows.length, focusCell, moveByTab],
  );

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      setFocusedCell({ rowIndex, colIndex });
    },
    [],
  );

  const handleCellDoubleClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      beginEdit({ rowIndex, colIndex });
    },
    [beginEdit],
  );

  return {
    focusedCell,
    editingCell,
    draftValue,
    setFocusedCell,
    beginEdit,
    commitEdit,
    cancelEdit,
    setDraftValue,
    handleCellKeyDown,
    handleEditorKeyDown,
    handleCellClick,
    handleCellDoubleClick,
    cellRefMap,
    registerCellRef,
  };
};
