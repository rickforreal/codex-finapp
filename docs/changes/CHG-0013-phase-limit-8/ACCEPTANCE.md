# ACCEPTANCE: Raise Return and Spending Phase Limits to 8

- Change ID: `CHG-0013`

## Functional Acceptance

- [x] `config.returnPhases` accepts up to 8 entries and rejects 9.
- [x] `config.spendingPhases` accepts up to 8 entries and rejects 9.
- [x] Client allows adding return phases up to 8 and blocks add at 8.
- [x] Client allows adding spending phases up to 8 and blocks add at 8.
- [x] Existing contiguity/boundary sync semantics remain unchanged.

## Visual / Interaction Checks (if UI)

- [x] Returns section add button disables at 8 phases.
- [x] Spending Phases section add button disables at 8 phases.
- [x] User-facing copy reflects 8-phase maximum where shown.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run build -w @finapp/native-mc`
- [x] `npm run test -w @finapp/native-mc`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0013`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0013`
- [x] Canonical docs updated if required by change scope
