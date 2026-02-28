# FEATURE: Theme Families + Per-Theme Appearance (Light/Dark) v1

Move from a flat theme list to a two-level model:

- `themeFamilyId` (Default, Monokai, Synthwave '84, Stay The Course, High Contrast)
- `appearance` (`light | dark`, with High Contrast remaining a single dark A11y family)

Primary intent:
- make Light/Dark standalone entries redundant by treating them as variants of the Default family
- allow each family to remember its own selected appearance
- preserve existing startup precedence and snapshot/bookmark compatibility
