# CHANGE: Theme Menu Ordering + Outside-Click Close

- Change ID: `CHG-0007`
- Status: `Done`
- Created: `2026-03-01`
- Updated: `2026-03-01`

## Why

With 40+ themes, the list needed a more intentional top section, and command bar menus should dismiss when clicking outside instead of requiring a second button click.

## Scope

- Reorder theme menu families with pinned top order:
  1. Default
  2. High Contrast
  3. Money Never Sleeps
  4. Patagonia Vest
  5. Stay The Course
- Keep remaining families in a stable pseudo-random order.
- Close command bar popover menus (Theme, Bookmarks) on outside click/tap.

## Non-goals

- No changes to theme IDs, palette tokens, or selection persistence model.
- No changes to menu visual styling beyond ordering/dismiss behavior.

## Surfaces Touched

- `packages/client/src/components/layout/CommandBar.tsx`

## Classification Rationale

Minor UX refinement to ordering and menu dismissal behavior with no contract/model impact.

## Canonical Docs Impact

No canonical doc impact.

Rationale: behavior remains within existing Theme Selector affordance contract.
