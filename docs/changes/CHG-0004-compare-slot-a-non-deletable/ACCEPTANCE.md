# ACCEPTANCE: Compare Slot A Non-Deletable Invariant

- Change ID: `CHG-0004`

## Functional Acceptance

- [x] `removeCompareSlot('A')` is a no-op even when compare has more than two slots.
- [x] Removing non-`A` slots still works when slot count > 2.
- [x] Existing min-2 guard remains intact.
- [x] Sidebar remove affordance never appears for slot `A`.

## Regression Gate

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`

## Closure Checklist

- [x] Root `TASKS.md` updated with `CHG-0004`
- [x] `PROGRESS.txt` includes completion summary with `CHG-0004`
- [x] Canonical docs updated if required by scope (`SPECS.md`)
