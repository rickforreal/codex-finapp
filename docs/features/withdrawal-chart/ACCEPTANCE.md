# Acceptance: Withdrawal Chart (Side-by-Side)

## Criteria

- [ ] Both charts render side-by-side in a shared `ChartPanel` container
- [ ] Nominal/Real toggle affects both charts simultaneously
- [ ] Breakdown toggle shows stacked asset areas on withdrawal chart
- [ ] Hovering one chart shows crosshair on the other at the same month
- [ ] Compare mode shows one withdrawal line per slot with correct colors
- [ ] MC mode shows representative path withdrawals (no percentile bands)
- [ ] Stress scenarios show dashed withdrawal lines
- [ ] Tracking mode shows actuals boundary and stale dimming
- [ ] Charts stack vertically at narrow widths (<900px)
- [ ] Zero-withdrawal months show flat line at 0
- [ ] Shortfall tooltip shows both actual and requested when they differ
- [ ] `npm run typecheck && npm run lint && npm test && npm run build` passes
