# ACCEPTANCE: Monte Carlo Detail Ledger Start Total (p50) Reference Column

- Change ID: `CHG-0002`

## Functional Acceptance

- [x] In Monte Carlo mode, Detail Ledger includes `Start Total (p50)` after `Age` and before `Start Total`.
- [x] In Manual mode, `Start Total (p50)` is not shown.
- [x] Monthly Monte Carlo rows compute month `N` as cross-run p50 start-of-period total for month `N`.
- [x] Annual Monte Carlo rows compute year `Y` from p50 start-of-period at that year's first month.
- [x] Tracking-mode edits do not mutate `Start Total (p50)` until Monte Carlo rerun.

## Visual / Interaction Checks (if UI)

- [x] `Start Total (p50)` column uses subtle differentiated styling.
- [x] Header includes an info tooltip icon.
- [x] Tooltip copy is: `Median start-of-period portfolio for this row across Monte Carlo simulations. For month m: p50(startTotal[m]).`
- [x] Compare mode renders the same `Start Total (p50)` behavior in both panes when Monte Carlo mode is active.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0002`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0002`
- [x] Canonical docs updated if required by change scope
