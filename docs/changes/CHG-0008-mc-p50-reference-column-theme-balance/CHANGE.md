# CHANGE: MC Start Total (p50) Reference Column Theme Balance

- Change ID: `CHG-0008`
- Status: `Done`
- Created: `2026-03-01`
- Updated: `2026-03-01`

## Why

In light themes, the Monte Carlo `Start Total (p50)` reference column could render too dark because it used a generic interactive-secondary tint not tuned for this surface.

## Scope

- Switch MC reference column tint/text to detail-ledger reference slot tokens.
- Keep existing table behavior and data unchanged.

## Non-goals

- No data/model/API changes.
- No changes to Monte Carlo calculations or table column set.

## Surfaces Touched

- `packages/client/src/components/output/DetailLedger/cellHelpers.ts`

## Classification Rationale

Minor UX polish for readability/contrast without behavior or contract changes.

## Canonical Docs Impact

No canonical doc impact.

Rationale: this is a presentation-token refinement for an existing column.
