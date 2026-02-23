# CHANGE: Compare Slot A Non-Deletable Invariant

- Change ID: `CHG-0004`
- Status: `Done`
- Created: `2026-02-23`
- Updated: `2026-02-23`

## Why

Compare slot `A` should be a required anchor slot in Compare mode. Allowing removal of `A` introduces avoidable slot-identity churn and can degrade UX predictability.

## Scope

- Enforce that compare slot `A` cannot be removed.
- Apply enforcement in both:
  - store action (`removeCompareSlot`) for invariant safety
  - sidebar remove affordance visibility for UX consistency
- Extend store tests to validate the non-deletable `A` invariant.
- Update `SPECS.md` compare slot affordance behavior.

## Non-goals

- No changes to add/clone/baseline behaviors.
- No snapshot schema or API contract changes.
- No chart rendering or detail-table data behavior changes.

## Surfaces Touched

- `packages/client/src/store/useAppStore.ts`
- `packages/client/src/components/layout/Sidebar.tsx`
- `packages/client/src/store/useAppStore.compare.test.ts`
- `docs/SPECS.md`

## Classification Rationale

This is a minor change (not a feature wave, not an issue) because:
- It tightens an existing compare UX invariant without changing product scope or architecture.
- It does not alter model contracts or backend behavior.

## Canonical Docs Impact

- `SPECS.md`

No updates are expected for `PRD.md`, `DATA_MODEL.md`, `API.md`, `ARCHITECTURE.md`, or `ENGINEERING.md`.
