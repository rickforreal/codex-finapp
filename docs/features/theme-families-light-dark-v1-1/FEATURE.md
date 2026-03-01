# Theme Families + Per-Theme Appearance v1.1 — Replacement Wave

## Problem Statement

The current catalog still exposes two legacy style families (Monokai and Synthwave '84) that no longer align with the finance-meme direction and overlap heavily with other neon/dark offerings.

## Goal

Deprecate Monokai and Synthwave '84 as user-facing themes and replace them with:

- Circuit Breaker (`monokai` internal family ID)
- Powell Pivot (`synthwave84` internal family ID)

while preserving snapshot/bookmark/local-preference compatibility by keeping legacy IDs stable.

## Scope

In scope:
- Replace dark variants for `monokai` and `synthwave84` with new names and palettes.
- Add targeted light-variant overrides for these two families to avoid samey generated lights.
- Update family/catalog display metadata returned by `/api/v1/themes`.
- Update tests and canonical UX docs.

Out of scope:
- Introducing any new theme IDs or changing enum/schema contracts.
- Removing legacy compatibility aliases.
- Theme system architecture or token-model changes.

## Canonical Docs Impact

- Update `docs/SPECS.md` (Theme Selector family list).
- No contract-shape changes expected in `docs/API.md`, `docs/DATA_MODEL.md`, or `docs/ARCHITECTURE.md`.
- `docs/SCENARIOS.md` remains unchanged unless named-family references are introduced.
