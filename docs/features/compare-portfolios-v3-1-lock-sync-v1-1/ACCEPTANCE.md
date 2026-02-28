# Compare Portfolios v3.1.1 — Acceptance

## Functional Acceptance

1. Cannot lock Phase N unless Phase N-1 is already locked (except Phase 1).
2. Unlocking Phase N unlocks Phase N+1..end if locked.
3. Followers never receive non-prefix Spending phase lock combinations.
4. Income/Expense instance-lock behavior remains unchanged.

## Regression Acceptance

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
