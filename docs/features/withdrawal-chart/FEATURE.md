# Feature: Withdrawal Chart (Side-by-Side)

## Summary
Add a Withdrawal Chart rendered side-by-side with the existing Portfolio Chart, giving users a complete view of both portfolio trajectory and spending patterns over time.

## Motivation
Users currently see only portfolio value over time. Simultaneously viewing withdrawal evolution over the same period provides a complete financial picture — essential for retirement planning.

## Scope

### In scope
- New `WithdrawalChart` component rendering monthly withdrawal amounts over time
- Side-by-side layout with Portfolio Chart in a shared `ChartPanel` container
- Shared Nominal/Real toggle affecting both charts
- Shared Breakdown toggle — stacked area by asset class (stocks/bonds/cash withdrawals)
- Compare mode: one withdrawal line per slot (A-H), same slot colors
- Stress overlays: dashed withdrawal lines per stress scenario
- Tracking mode: actuals boundary, stale-state dimming
- Synchronized hover: crosshair on one chart highlights same month on the other
- Responsive: vertical stacking at narrow widths

### Out of scope
- Monte Carlo withdrawal percentile bands (server MC engine only computes portfolio value percentiles)
- New store state (both charts consume existing selectors)
- Server changes

## Key Decisions
1. **Container approach:** New `ChartPanel` wrapper holds both charts + shared controls
2. **MC mode:** Show representative path withdrawals only — no percentile bands
3. **Y-axis independence:** Each chart has its own scale
4. **Synchronized hover:** Shared `hoverIndex` state in `ChartPanel`
5. **Breakdown + stress:** When breakdown is on, stress overlays hide
6. **Responsive breakpoint:** Below ~900px container width, charts stack vertically
