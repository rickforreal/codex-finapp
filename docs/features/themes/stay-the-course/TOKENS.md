# Stay The Course Token Direction

## Palette (Source of Truth)

- `#04F2C6` (`rgba(4, 242, 198, 1)`)
- `#04F2AE` (`rgba(4, 242, 174, 1)`)
- `#048C65` (`rgba(4, 140, 101, 1)`)
- `#04F29B` (`rgba(4, 242, 155, 1)`)
- `#0C0C0C` (`rgba(12, 12, 12, 1)`)

## Dark Theme Direction

- Base background/shell: `#0C0C0C`
- Elevated surfaces: near-black with subtle lift from base
- Primary accents/interactions: `#04F2C6` and `#04F2AE`
- Positive/success states: `#04F29B`
- Supporting depth/state/divider tinting: `#048C65`

## Semantic Mapping Guidance

- `appBackground`, `surfacePrimary`, `surfaceSecondary`, `surfaceMuted`:
  - anchored to `#0C0C0C` with stepped dark variants.
- `interactivePrimary`:
  - `#04F2C6` (hover/active can shift toward `#04F2AE`).
- `interactiveSecondary` / outlines/dividers:
  - `#048C65`-leaning values for subtle structure.
- `positive`:
  - `#04F29B`.
- `info`:
  - `#04F2AE`.
- `warning` / `negative`:
  - tuned derivatives that preserve contrast and are distinct from teal accents.

## Chart + Dense Data Guidance

- Keep line/band/table state colors visually separable against dark surfaces.
- Preserve clear differentiation for:
  - compare slot colors
  - stress scenarios
  - MC bands vs median/manual lines
  - ledger edited/stale/focus/read-only states

## Accessibility Guardrails

- Prioritize readable contrast for text on dark surfaces, tooltips, and primary buttons.
- If validation flags contrast warnings on key pairs, tune token values before shipping.
