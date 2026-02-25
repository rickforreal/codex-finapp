# Detail Ledger Spreadsheet Refactor — Implementation Plan

## Delta From Baseline

Refactors `packages/client/src/components/output/DetailTable.tsx` (1287 lines, single file) into a decomposed component tree under `packages/client/src/components/output/DetailLedger/`.

## Approach

**TanStack Virtual** with a unified code path (normal = single-slot compare). Decompose the monolith into focused components with cell-level `React.memo` for surgical re-renders.

## New File Structure

All under `packages/client/src/components/output/DetailLedger/`:

| File | Purpose |
|---|---|
| `index.ts` | Re-exports `DetailLedgerContainer` as `DetailTable` |
| `DetailLedgerContainer.tsx` | Orchestrator: store subscriptions, layout, and event wiring |
| `DetailLedgerToolbar.tsx` | Controls bar (granularity, breakdown, spreadsheet toggles) |
| `CompareSlotTabs.tsx` | Circular slot tab picker (hidden when single slot) |
| `useDetailColumns.ts` | Column definitions from current column arrays |
| `useDetailRows.ts` | Unified data pipeline (abstracts normal vs compare data source) |
| `useGridNavigation.ts` | Keyboard nav: arrow keys, Tab, Enter, Escape, type-to-edit, copy/paste |
| `useReforecast.ts` | Extracted reforecast effect with longer debounce, no overlay |
| `VirtualizedBody.tsx` | TanStack Virtual row virtualizer + `<table>` structure |
| `DetailRow.tsx` | `React.memo` row component |
| `DetailCell.tsx` | `React.memo` cell component (display/edit/focus states) |
| `CellEditor.tsx` | Inline `<input>` for editing (auto-focus, commit/cancel) |
| `cellHelpers.ts` | Extracted pure functions (formatCell, displayCellValue, etc.) |

## Key Design Decisions

### 1. Unified Code Path
Normal mode = compare with only slot A active. `useDetailRows` abstracts the data source. `CompareSlotTabs` renders only when `slotOrder.length > 1`.

### 2. Keyboard Navigation (`useGridNavigation`)
- Arrow keys move focused cell by (row, col), clamped to bounds
- Tab / Shift-Tab jump to next/prev editable cell, wrapping rows
- Enter starts/commits editing; Escape cancels
- Type alphanumeric on non-editing editable cell starts editing with that keystroke
- Backspace/Delete starts editing with empty value
- Cmd/Ctrl+C copies formatted value; Cmd/Ctrl+V pastes into editable cell

### 3. Cell-Level Memoization
`DetailCell` uses `React.memo` with custom comparator. Editing one cell does NOT re-render any other cell.

### 4. Snappy Reforecast
Remove blocking overlay, increase debounce from 250ms to 500ms, optimistic display via `displayCellValue`.

### 5. TanStack Virtual
`useVirtualizer` with `estimateSize: 36px`, `overscan: 8`. Disabled in spreadsheet mode.

## Implementation Slices

### Slice 1: Extract helpers + install packages
### Slice 2: Build data and column hooks
### Slice 3: Build keyboard navigation hook
### Slice 4: Build new component tree behind feature flag
### Slice 5: Parity testing and cutover

## Canonical Docs Impact

- `SPECS.md` — keyboard navigation for affordance #52, new affordance numbers if needed
- `ARCHITECTURE.md` — TanStack Virtual now in use for Detail Ledger row virtualization
