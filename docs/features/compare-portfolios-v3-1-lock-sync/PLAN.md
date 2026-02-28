# Compare Portfolios v3.1 — Implementation Plan

## Summary

Add a compare-only sync model under `compareWorkspace` that allows Slot `A` to lock specific input families/instances and propagate those values to synced followers, with per-slot unsync/resync controls.

## Delta From Baseline

Baseline reference:
- `docs/features/compare-portfolios-v3-0/`

Changes vs baseline assumptions:
1. Compare now has parameter-level coupling controls in addition to slot cloning.
2. Slot `A` gains explicit lock-master behavior for input families/instances.
3. Follower slots can intentionally diverge via unsync and return via resync.
4. Compare workspace persistence includes lock/sync metadata.

## Locked Product Decisions

1. Master is always Slot `A`.
2. Family lock in `A` keeps `A` editable and makes synced followers read-only.
3. Global list-family lock is exact mirror from `A`.
4. Instance lock uses merge-by-instance-id semantics.
5. Deleting a locked instance in `A` auto-removes synced follower mirrors.
6. New slots inherit all active locks as synced.

## Interface and Store Changes

- Add `compareWorkspace.compareSync` with:
  - `familyLocks`
  - `instanceLocks`
  - `unsyncedBySlot`
- Add store actions:
  - `toggleCompareFamilyLock`
  - `toggleCompareInstanceLock`
  - `setCompareSlotFamilySync`
  - `setCompareSlotInstanceSync`
- Add selectors/hooks for family/instance lock UI state.
- Update snapshot schema from `v5` to `v6` with backwards default for missing `compareSync`.

## Validation Plan

Automated:
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Behavior tests:
1. Family lock propagation and follower read-only guard.
2. Per-slot unsync/resync overwrite semantics.
3. Global list lock exact mirror behavior.
4. Instance lock merge + delete propagation.
5. Snapshot/bookmark compareSync persistence.

## Canonical Docs Impact

- Update `SPECS`, `SCENARIOS`, `DATA_MODEL`, `ARCHITECTURE` for compare lock/sync behavior.
- No API contract changes.
