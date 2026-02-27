# ACCEPTANCE — Tracking Detail Ledger Contract v1.0

## Functional
- [x] Tracking monthly ledger allows edits only on Slot `A` for:
  - `Start Stocks`, `Start Bonds`, `Start Cash`, `Wd Stocks`, `Wd Bonds`, `Wd Cash`.
- [x] `Withdrawal Total`, `Income`, and `Expenses` are not editable.
- [x] Non-`A` compare ledger tabs are read-only and show canonical-source notice.
- [x] Month edit window enforces sequential editability: `monthIndex <= min(horizonMonths, (lastEditedMonthIndex ?? 0) + 1)` with Month 1 editable initially.
- [x] Same-row derived values update immediately after start/withdrawal edits.
- [x] Tracking edits/input changes mark outputs stale; no auto rerun.
- [x] Run Simulation preserves rows through `A.lastEditedMonthIndex` and refreshes future rows.
- [x] Compare Tracking run uses Slot `A` actual history for all slots.

## Snapshot Compatibility
- [x] Legacy snapshots load without schema break.
- [x] Legacy non-`A` overrides and legacy row income/expense overrides do not drive runtime Tracking behavior.

## Regression Gates
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Closure
- [x] Root `TASKS.md` includes and marks TLC tasks complete.
- [x] `PROGRESS.txt` has append-only TLC entries.
