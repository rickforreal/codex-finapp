# Detail Ledger Spreadsheet Refactor

## Problem Statement

The Detail Ledger (`DetailTable.tsx`, 1287 lines) is a hand-rolled monolith with:

- Custom scroll-based virtualization that's fragile and hard to maintain
- Two divergent code paths for normal vs compare mode
- Clunky editing in Tracking mode: double-click to edit, full table re-render on each commit, blocking "running" overlay during reforecast
- No keyboard-first navigation (arrow keys, type-to-edit, Tab traversal)

Users expect spreadsheet-like interactions — snappy navigation, type-to-edit, no perceptible lag.

## Scope

Replace the monolithic `DetailTable.tsx` with a decomposed component tree using TanStack Virtual:

1. **Unified code path** — normal mode = single-slot compare, eliminating the `if (isCompareActive)` branch
2. **Keyboard navigation** — arrow keys, Tab/Shift-Tab, Enter, Escape, type-to-edit, Cmd+C/V
3. **Cell-level memoization** — `React.memo` with custom comparator so editing one cell doesn't re-render others
4. **Snappy reforecast** — remove blocking overlay, increase debounce, optimistic display
5. **TanStack Virtual** — replace hand-rolled scroll virtualization

## Intent

Make the Detail Ledger feel like Google Sheets: instant keyboard navigation, type-to-edit without double-clicking, no visible jank when editing multiple cells in sequence, and no blocking overlay during reforecast.

## Out of Scope

- Changing what cells are editable (same Tracking Mode constraints apply)
- Changing the reforecast computation pipeline (same engine API, same `computeStartBalanceDeltas` logic)
- Adding new columns or data transformations
- Multi-cell selection or drag-fill
