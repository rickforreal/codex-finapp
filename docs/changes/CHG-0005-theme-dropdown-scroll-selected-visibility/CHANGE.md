# CHANGE: Theme Dropdown Scroll + Selected-Row Visibility

- Change ID: `CHG-0005`
- Status: `Done`
- Created: `2026-02-28`
- Updated: `2026-02-28`

## Why

With 40+ theme families, the command bar theme dropdown became too tall and difficult to navigate. The selected family could also be out of view when reopening the menu.

## Scope

- Add a bounded scroll container for the theme family list in the command bar popover.
- Ensure the currently selected theme family row auto-scrolls into view when the popover opens.
- Style command bar popover scrollbars with theme-slot colors so dark and light themes remain visually coherent.
- Preserve existing family selection and light/dark appearance toggle interactions.

## Non-goals

- No changes to theme palettes, token values, typography, or visual styling direction.
- No changes to theme contracts, snapshot schema, API responses, or store data shape.
- No changes to bookmark, simulation, chart, or sidebar behavior.

## Surfaces Touched

- `packages/client/src/components/layout/CommandBar.tsx`

## Classification Rationale

This is a minor UX refinement to improve list usability in an existing control without changing product scope, architecture, or data contracts.

## Canonical Docs Impact

No canonical doc impact.

Rationale: behavior change is implementation-level usability polish inside an existing control and does not alter documented product contract or model semantics.
