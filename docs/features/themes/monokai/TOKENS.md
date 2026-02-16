# Monokai Token Direction

This document maps Monokai intent to existing semantic tokens. Values are implementation targets and may be tuned during QA.

## Color Direction

Core palette inspiration (Monokai family):
- Background: deep charcoal/ink (`#272822`-adjacent)
- Foreground text: warm light gray (`#F8F8F2`-adjacent)
- Accent green: `#A6E22E`
- Accent orange: `#FD971F`
- Accent pink/red: `#F92672`
- Accent purple: `#AE81FF`
- Accent blue/cyan: `#66D9EF`

## Semantic Mapping

- `appBackground` / `surfacePrimary` / `surfaceSecondary` / `surfaceMuted`:
  - layered dark neutrals with clear elevation steps.

- `textPrimary` / `textSecondary` / `textMuted`:
  - warm grayscale progression preserving readability on dark surfaces.

- `interactivePrimary`:
  - cool blue or Monokai-cyan based CTA with sufficient contrast.

- `positive` / `negative` / `warning` / `info`:
  - green / magenta-red / orange / cyan alignment with Monokai accents.

- `assetStocks` / `assetBonds` / `assetCash`:
  - maintain cross-chart distinction independent of semantic status colors.

- `mcBandOuter` / `mcBandInner` and `chart.*`:
  - ensure median line prominence over confidence bands.

- `stressScenarioA-D`:
  - assign four clearly separated hues against dark chart background.

- `state.editedCellBackground`, `state.preservedRowBackground`, `state.staleBackground`, `state.selectedCellOutline`:
  - prioritize unmistakable edit/selection feedback in dense table view.

## Typography Direction

- Keep body readability first:
  - `fontSans`: `ibmPlexSans` (default)
  - `fontMono`: `ibmPlexMono`
- Optional tuning:
  - slightly tighter/lower emphasis than High Contrast, but avoid low-contrast microtext.

## Accessibility Guardrails

- Expect at least warning-level WCAG checks to pass for:
  - primary text on primary surface
  - secondary text on primary surface
  - inverse text on primary interactive
  - tooltip text on tooltip background
- If warnings occur, adjust token values before shipping.
