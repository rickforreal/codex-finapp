# Synthwave '84 Token Direction

This maps Synthwave '84 style intent to existing semantic theme tokens.

## Palette Direction

Visual inspiration anchors:
- Deep background: midnight navy/purple
- Neon pink accent
- Neon cyan accent
- Violet/indigo secondary accent
- Warm amber/peach for warning and cash-like highlights

## Semantic Mapping

- `appBackground`, `surfacePrimary`, `surfaceSecondary`, `surfaceMuted`:
  - layered dark indigo/purple tones with clear elevation steps.

- `textPrimary`, `textSecondary`, `textMuted`:
  - bright cool-neutral text with stepped muting; avoid low-contrast pastel-on-near-black issues.

- `interactivePrimary`, `interactivePrimaryHover`:
  - neon-cyan or neon-pink CTA treatment with strong contrast.

- `positive`, `negative`, `warning`, `info`:
  - keep semantic meanings clear (green/red/orange/cyan) even within synthwave palette.

- `assetStocks`, `assetBonds`, `assetCash`:
  - choose highly separable colors that do not conflict with stress scenario lines.

- `mcBandOuter`, `mcBandInner`, `chart.*`:
  - preserve strong visual hierarchy: median/manual line must remain dominant over filled bands.

- `stressScenarioA-D`:
  - four distinct high-contrast line hues on dark background.

- `state.*` tokens:
  - edited/preserved/stale/selected states should remain unmistakable in dense ledger view.

## Typography Direction

- Keep readability-first body typography (`ibmPlexSans` + `ibmPlexMono`).
- Optional minor tuning to letter spacing/weights is acceptable if it strengthens the synthwave aesthetic without harming legibility.

## Accessibility Guardrails

Minimum practical checks:
- primary text on primary surface
- secondary text on primary surface
- inverse text on primary interactive button
- chart tooltip text on tooltip background

Tune colors if warnings indicate poor legibility on core flows.
