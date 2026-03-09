# Feature: Withdrawal Chart v1.1 (MC Confidence Bands)

## Summary
Extend the Withdrawal Chart so Monte Carlo mode renders confidence bands from cross-run monthly withdrawal percentiles, matching the interpretation style used in Portfolio Value.

## Motivation
The current MC withdrawal chart shows only a median/reference line, which hides distribution spread. Users need month-level downside/upside context (10-90 and 25-75) for withdrawal income in both single-portfolio and compare workflows.

## Scope

### In scope
- Add withdrawal percentile curves to MC result payload (additive)
- Render MC confidence bands in single-portfolio Withdrawal Chart
- Render baseline-slot MC confidence bands in compare Withdrawal Chart
- Keep median line and slot median lines
- Tooltip and legend updates for percentile context
- Legacy fallback to p50-only rendering when percentile curves are absent

### Out of scope
- Any request DTO changes
- Any endpoint path changes
- Snapshot/bookmark migration work
- Changes to Portfolio Chart behavior
