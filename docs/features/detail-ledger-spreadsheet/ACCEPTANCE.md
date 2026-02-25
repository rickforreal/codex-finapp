# Detail Ledger Spreadsheet Refactor — Acceptance Checklist

## Automated Gates
- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run test` passes
- [x] `npm run build` passes

## Visual/Functional Parity
- [x] Planning + Manual: ledger populates after run, sort columns, toggle monthly/annual, expand breakdown
- [x] Planning + Monte Carlo: p50 column appears, confidence bands data matches
- [x] Tracking + Manual: edit cells via keyboard, dot indicators, reforecast fires without overlay, values update
- [x] Tracking + MC: stale indicator after edit, re-run shows fresh data
- [x] Compare (2+ slots): slot tabs, switch slots, canonical boundary lock on non-A, unified toolbar
- [x] Spreadsheet mode: all rows render (no virtualization), expand/compress toggle works
- [x] Empty states: correct messages before first run in Planning and Tracking

## Keyboard Navigation
- [x] Arrow keys move focus ring (up/down/left/right), clamped to bounds
- [x] Tab/Shift-Tab skip non-editable cells, wrap across rows
- [x] Enter on editable cell starts edit mode
- [x] Enter while editing commits and moves focus down
- [x] Escape cancels edit, reverts draft
- [x] Type alphanumeric on non-editing editable cell starts editing with keystroke
- [x] Backspace/Delete on non-editing editable cell starts editing with empty value
- [x] Cmd+C copies formatted cell value to clipboard
- [x] Cmd+V pastes from clipboard into editable cell

## Editing Rules Preserved
- [x] Editable only in Tracking Mode + Monthly view
- [x] 8 editable columns (3 start balances, 3 withdrawal-by-asset, income, expenses)
- [x] Compact view: only Income and Expenses editable
- [x] Compare canonical boundary lock: non-A slot rows at/before A.lastEditedMonthIndex read-only
- [x] Validation: non-negative integers only, blank -> 0, non-numeric -> 0
- [x] Dot indicator on user-entered cells
- [x] MC stale flag set after any edit
- [x] Reforecast accuracy: same pipeline, identical values

## Performance
- [x] Rapidly edit 10 cells in sequence: no visible jank
- [x] No blocking overlay during reforecast
- [x] Virtualized scrolling smooth with 480 rows
