# Compare Portfolios v3.1 — Acceptance

## Functional Acceptance

1. Section-level controls
- Slot `A` can lock/unlock each input family.
- Follower slots show synced/unsynced control when family lock is active.

2. Family-level behavior
- Locked family values in `A` propagate to synced followers.
- Synced followers are read-only for that family.
- Unsynced followers can edit locally.
- Resync overwrites follower values from `A`.

3. List behavior
- Global list lock mirrors A exactly for synced followers.
- Instance lock upserts/replaces only that instance in synced followers.
- Deleting locked A instance removes synced follower mirror.

4. Slot lifecycle
- New slot inherits active locks as synced.

5. Persistence
- Snapshot and bookmark load restore `compareSync` state.
- Older snapshots missing `compareSync` default to unlocked state.

## Regression Acceptance

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build` passes.
