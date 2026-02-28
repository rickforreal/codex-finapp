# Plan: Withdrawal Chart (Side-by-Side)

## Implementation Slices

### Slice 1: Extract shared chart primitives
- New `packages/client/src/lib/chartPrimitives.ts`
- Move from PortfolioChart: `linePath()`, `areaPath()`, `inflationFactor()`, `stressScenarioColors`, constants
- Add coordinate helpers: `computeXAt()`, `computeYAt()`, `mouseIndexFromEvent()`
- Update PortfolioChart imports — no behavioral change

### Slice 2: Refactor PortfolioChart for external hosting
- Accept new props: `hoverIndex`, `onHoverChange`, `chartWidth`
- Remove: internal hover state, ResizeObserver, section wrapper, toggle controls, stale/loading overlays
- Return bare SVG + tooltip

### Slice 3: Create WithdrawalChart component
- Props: `hoverIndex`, `onHoverChange`, `chartWidth`
- All rendering modes: single, breakdown, compare, MC, stress, tracking
- Tooltip with withdrawal total, per-asset, shortfall

### Slice 4: Create ChartPanel wrapper + AppShell wiring
- Owns ResizeObserver, hoverIndex state, toggle controls
- Responsive layout: side-by-side (wide) / stacked (narrow)
- Replace `<PortfolioChart />` with `<ChartPanel />` in AppShell

## Critical Files
- `packages/client/src/components/output/PortfolioChart.tsx`
- `packages/client/src/components/output/WithdrawalChart.tsx` (new)
- `packages/client/src/components/output/ChartPanel.tsx` (new)
- `packages/client/src/lib/chartPrimitives.ts` (new)
- `packages/client/src/components/layout/AppShell.tsx`
