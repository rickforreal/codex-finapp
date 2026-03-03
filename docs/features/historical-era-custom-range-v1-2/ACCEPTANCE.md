# Acceptance: Historical Era Custom Range v1.2 (Event Snap)

## Functional
- [x] Start thumb snaps to nearest event month when within 1 month threshold.
- [x] End thumb snaps to nearest event month when within 1 month threshold.
- [x] Non-event months beyond threshold remain selectable.

## Tests
- [x] Snap helper tests cover threshold snapping.
- [x] Snap helper tests reject out-of-range event snapping.

## Regression
- [x] Existing custom-range, exact-event labeling, and decay behavior remain intact.
- [x] `npm run typecheck -w @finapp/client`
- [x] `npm run lint -w @finapp/client`
- [x] `npm run test -w @finapp/client`
