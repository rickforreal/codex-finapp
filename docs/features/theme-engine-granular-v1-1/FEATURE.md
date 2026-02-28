# Feature: Theme Engine Granular v1.1

## Problem
The current theme engine supports semantic palette tokens but many UI surfaces still depend on broad utility remaps and hardcoded state colors. This limits per-element customization and makes inheritance behavior implicit.

## Goal
Introduce a tiered, inheritance-first token model that supports granular component-slot theming across all currently rendered UI surfaces, while keeping snapshot/local preference behavior unchanged.

## Scope
- Expand server theme contract with token-model metadata and slot catalog.
- Add semantic + slot + override maps to `ThemeDefinition`.
- Compile and apply `--theme-slot-*` CSS variables client-side.
- Migrate key UI shells/controls/cards to slot-driven classes.
- Preserve backward behavior for existing built-in themes and theme selection precedence.

## Out of Scope
- Runtime user-authored themes.
- New theme persistence endpoints.
- Breaking changes to snapshot schema version.

## Canonical Docs Impact
- `docs/SPECS.md`
- `docs/DATA_MODEL.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
