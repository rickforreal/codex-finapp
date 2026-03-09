# Acceptance: Withdrawal Chart v1.1 (MC Confidence Bands)

## Functional
- [x] MC result includes `withdrawalPercentileCurvesReal` (additive field).
- [x] `withdrawalP50SeriesReal` remains present and equals `withdrawalPercentileCurvesReal.p50` for each month.
- [x] Single-portfolio MC Withdrawal Chart shows 10-90 and 25-75 bands with p50 line.
- [x] Compare MC Withdrawal Chart shows baseline-slot bands with slot median lines.
- [x] Switching baseline slot updates compare withdrawal band source.
- [x] Breakdown mode hides withdrawal confidence bands.
- [x] Legacy MC payloads without `withdrawalPercentileCurvesReal` still render p50-only behavior.

## Tooltip / Legend
- [x] Single MC tooltip includes percentile context (p10/p25/p50/p75/p90).
- [x] Compare MC tooltip includes baseline percentile block (p10/p25/p50/p75/p90).
- [x] Withdrawal chart legend includes percentile band keys consistent with Portfolio Chart.

## Regression / Parity
- [x] TS and Rust MC engines return matching withdrawal percentile curves for fixed seed/config.
- [x] Route-level MC response shape includes the new field without breaking existing fields.

## Gates
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run build -w @finapp/native-mc`
- [x] `npm run test -w @finapp/native-mc`
