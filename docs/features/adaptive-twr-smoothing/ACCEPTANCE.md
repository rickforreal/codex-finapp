# Acceptance: Adaptive TWR Smoothing

## Functional
- [ ] Adaptive TWR accepts `smoothingEnabled` and `smoothingBlend` in API validation.
- [ ] With smoothing disabled, behavior matches pre-change Adaptive TWR.
- [ ] With smoothing enabled, withdrawals use prior final withdrawal blend before phase clamp.
- [ ] Prior final withdrawal anchor is month `(m-1)` final requested withdrawal.
- [ ] Legacy snapshots/bookmarks missing smoothing fields still load and run.

## UI
- [ ] Adaptive strategy panel shows smoothing toggle + blend slider.
- [ ] Slider displays prior/new split and is disabled when smoothing is off.
- [ ] Compare parameter diff table includes smoothing fields.

## Regression
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
