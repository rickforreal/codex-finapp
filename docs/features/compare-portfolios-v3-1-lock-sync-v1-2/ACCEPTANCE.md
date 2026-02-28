# CPV31.2 — Acceptance Checklist

- [ ] Initial client state has `spendingPhases.length === 0`.
- [ ] Spending Phases section shows empty-state explanation and Add CTA when empty.
- [ ] Removing the last spending phase is allowed.
- [ ] Shared schema accepts `spendingPhases: []` and still validates per-phase bounds when entries exist.
- [ ] Deterministic engine handles empty phases with no throw and no phase clamp.
- [ ] Monte Carlo engine handles empty phases with no throw and no phase clamp.
- [ ] Snapshot/bookmark load clears legacy phase arrays and spending-phase instance lock overrides.
- [ ] Compare lock/sync logic remains stable with empty spending-phase lists.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
