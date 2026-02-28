# Bookmarks Implementation Plan

## Summary
Implement compressed, full-state client-side bookmarks as a fast companion to snapshot files. Reuse existing snapshot serialization and validation path so bookmark payloads remain contract-aligned.

## Decisions Locked
- Bookmark load is immediate full-state replace (no load confirmation).
- Duplicate bookmark names are allowed.
- Create flow uses modal (not `prompt`).
- Storage format uses gzip + Base64 payloads under `localStorage` key `finapp:bookmarks:v1`.
- Hard cap is 100 bookmarks; newest inserted first; oldest evicted by count when over cap.
- If storage quota is exceeded, save fails with clear error; no silent downgrade.
- Delete uses confirmation prompt.

## Implementation Steps
1. Add bookmark persistence module in `packages/client/src/store/bookmarks.ts`.
2. Add unit tests for bookmark storage/load/error/cap behavior.
3. Integrate command bar UI:
- Create Bookmark button
- Create Bookmark modal
- Bookmarks dropdown list
- Hover delete icon with confirmation
4. Keep snapshot Save/Load actions unchanged.
5. Update canonical docs (`PRD`, `SPECS`, `SCENARIOS`, `ARCHITECTURE`, `DATA_MODEL`, `API`).
6. Update root trackers (`TASKS.md`, `PROGRESS.txt`).
7. Run full regression gate.

## Canonical Docs Impact
- `docs/SPECS.md`: add bookmark affordances and interaction rules.
- `docs/SCENARIOS.md`: add bookmark create/load/delete/quota scenario coverage.
- `docs/PRD.md`: include bookmarks as fast local persistence companion to snapshots.
- `docs/ARCHITECTURE.md`: add bookmark persistence subsection in client architecture.
- `docs/DATA_MODEL.md`: add bookmark storage envelope/types.
- `docs/API.md`: document that bookmarks have no backend endpoint.
