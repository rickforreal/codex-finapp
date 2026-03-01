# Meme Themes v1 Plan

## Delta From Baseline

Baseline reference:

- `docs/features/theme-families-light-dark-v1/`

Changes from baseline assumptions:

1. Added 40+ new theme families to the enum definitions.
2. Each family has a dark variant defined with unique color tokens.
3. Light variants are auto-generated from dark variants.
4. Client store updated with new family defaults.

## Scope

In scope:

- shared type changes: ThemeFamilyId, ThemeVariantId entries
- server registry: dark variants + family definitions
- client store: appearance defaults for new families
- canonical docs updates

Out of scope:

- Custom user themes
- Additional theme customization beyond light/dark

## Implementation Notes

1. Shared contracts:

- Added ThemeFamilyId entries for all 40+ new families
- Added ThemeVariantId entries (light + dark for each family)

2. Server:

- Each dark variant defined with unique color tokens matching theme personality
- Light variants auto-generated preserving family accent colors
- Family catalog includes all new families with descriptions

3. Client:

- Store defaults updated with new family appearance preferences
- All new families default to dark appearance

## Canonical Docs Impact

Update required:

- `docs/SPECS.md` - add new theme families to catalog
- `docs/DATA_MODEL.md` - document new enum values
- `docs/API.md` - confirm /themes response includes new families
- `docs/ARCHITECTURE.md` - confirm theme system supports extended catalog
- `docs/features/themes/GUIDE.md` - confirm theme authoring guidance
