## Phase 9 Plan: Tracking Mode with Independent Workspaces

  ### Summary

  Implement Tracking Mode as a separate workspace from Planning Mode, with clone-once initialization, independent caches/history, and deterministic/manual/MC behavior aligned to your rules.

  Core outcomes:

  - Planning and Tracking inputs are isolated after first Tracking entry.
  - Tracking supports editable monthly actuals with authoritative partial overrides.
  - Manual in Tracking always keeps Stats/Chart/Table synchronized after edits.
  - Monte Carlo in Tracking freezes stale outputs after edits until rerun.
  - Table and chart clearly communicate edited region, stale state, and simulation boundary.

  ### Product Decisions Locked

  - Workspaces:
      - Planning and Tracking are independent state workspaces.
      - First switch to Tracking clones current Planning workspace once, then diverges permanently.
      - Per-mode result visibility only (no cross-mode output fallback).
  - Tracking initialization:
      - No auto-run on first switch.
      - User must click Run once in Tracking to bootstrap editable rows.
  - Edit model:
      - Editable fields: asset starts, by-asset withdrawals (nominal only), income, expenses.
      - Real values are derived only.
      - Partial override per edited cell; unedited cells remain computed.
      - Non-contiguous month edits are allowed.
      - Latest edited month defines projection boundary for future runs.
      - Input rules: zero allowed, negatives disallowed, no upper bound, blank equals zero.
  - Month operation ordering:
      - Edited withdrawals apply first.
      - Edited income/expenses apply after edited withdrawals.
  - Manual vs MC in Tracking:
      - Tracking + Manual: edits trigger immediate deterministic recalculation; Stats/Chart/Table stay in sync.
      - Tracking + MC: edits freeze outputs and mark stale; Run reruns MC and refreshes all.
      - Switching from stale MC to Manual clears stale in Manual.
      - Switching back to MC without rerun shows stale again.
  - UX:
      - Edited cells: bold + subtle tint + corner dot.
      - Actual region rows: tint all rows Month 1 through latest edited month.
      - Reset Row: monthly view only, one-click, clears row edits to current computed baseline.
      - Table stale signal: amber Stale pill in controls area (top-right).
      - Chart boundary: vertical dashed line + label Actuals -> Simulated.
      - Tracking + MC left of boundary: single realized path only (no percentile bands).
      - MC stale chart: dim MC layers + warning banner.

  ### Architecture and State Changes

  - Store refactor:
      - Introduce planningWorkspace and trackingWorkspace.
      - Each workspace holds:
          - full input config slices
          - simulation mode + selected era
          - simulation caches (manual, monteCarlo, reforecast, mcStale, status/error)
          - actual ledger and edit metadata
          - undo/redo stacks scoped to workspace
      - Root state holds:
          - activeMode
          - trackingInitialized flag
  - Mode switching:
      - On first switch to Tracking:
          - clone Planning workspace into Tracking.
          - clear Tracking result caches.
          - preserve Planning caches.
      - On subsequent switches:
          - swap active workspace only.
  - Active selectors:
      - useActiveWorkspaceConfig, useActiveSimulationResult, useActiveUi, useActiveActualsMeta.
      - Existing components consume active selectors to avoid cross-mode leakage.

  ### Tracking Data Model Additions

  - Shared/domain additions:
      - ActualCellKey enum/type for editable fields.
      - TrackingActualLedger keyed by monthIndex with optional fields:
          - startStocks, startBonds, startCash
          - withdrawalStocks, withdrawalBonds, withdrawalCash
          - income, expenses
      - lastEditedMonthIndex derived selector.
  - Route contract additions:
      - ReforecastRequest:
          - config (active tracking config)
          - actuals ledger
          - optional latestEditedMonthIndex hint
      - ReforecastResponse:
          - deterministic SinglePathResult
          - appliedBoundaryMonthIndex
  - Simulation route behavior in Tracking:
      - Manual Run in Tracking produces stochastic/projection run from boundary rule.
      - MC Run in Tracking locks edited months and runs MC from month after boundary.
      - MC response includes series suitable for left-of-boundary realized path + right-side bands.

  ### Server Implementation Plan

  - Add deterministic engine:
      - engine/deterministic.ts
      - fixed monthly return formula (1 + annual)^(1/12) - 1
      - apply actual overrides month-by-month with ordering:
          - market
          - edited withdrawals
          - edited income/expenses
          - computed remainder
  - Add reforecast route:
      - POST /api/v1/reforecast
      - strict validation for actual ledger (no negatives)
      - return deterministic path fast-path (<50ms target)
  - Extend MC/Manual runners for Tracking boundary:
      - split timeline into:
          - realized segment through latest edited month
          - simulated segment after boundary
      - MC bands generated only for simulated segment.
  - Add utilities:
      - merge/override helpers for partial actual row application
      - row-level recomputation hooks for prior-month end consistency

  ### Client Implementation Plan

  - Command bar:
      - mode switch uses workspace swap logic.
      - stale indicator logic tied to active Tracking+MC only.
  - Detail table:
      - add editable cell components in monthly view only.
      - add row-level reset icon action.
      - add cell edit markers and row-region tinting.
      - keep sorting/toggles enabled during stale frozen state.
      - show Stale pill in table controls when active Tracking+MC stale.
  - Stats and chart synchronization:
      - Tracking+Manual subscribes to reforecast result immediately.
      - Tracking+MC stale freezes displayed MC snapshot.
      - mode-switch behavior swaps displayed data source correctly.
  - Chart overlays:
      - boundary marker line + label.
      - MC rendering split:
          - left: realized single path
          - right: confidence bands + median
      - stale styling:
          - dim layers
          - warning banner text.

  ### Test Plan

  - Server tests:
      - deterministic.test.ts
          - fixed monthly formula
          - partial actual override precedence
          - non-contiguous edit handling
          - repeatability with identical inputs
      - routes/reforecast.test.ts
          - 200 response shape
          - validation errors
          - performance <50ms for representative case
      - tracking simulation tests
          - projection boundary starts after latest edited month
          - MC left segment without bands
  - Client store tests:
      - workspace separation across mode switch
      - clone-once Tracking init
      - per-mode result cache visibility
      - stale flag transitions:
          - edit in Tracking+MC sets stale
          - switch to Manual clears stale in Manual context
          - switch back to MC re-shows stale
  - Component tests (targeted):
      - editable monthly cell behavior and blank-to-zero
      - reset row action
      - stale pill visibility rules
      - chart boundary marker + stale banner toggles
  - Regression suite:
      - npm run test
      - npm run typecheck
      - npm run lint
      - npm run build

  ### DoD-aligned Acceptance Scenarios

  - First switch Tracking:
      - inputs cloned once from Planning, results empty, no auto-run.
  - Tracking bootstrap:
      - user runs once, monthly rows editable.
  - Tracking + Manual edit:
      - table/chart/stats update immediately and remain consistent.
  - Tracking + MC edit:
      - outputs freeze, stale indicators appear.
  - MC rerun:
      - stale clears, outputs refresh from boundary.
  - Mode switching:
      - Planning results preserved independently from Tracking.
  - Reset row:
      - one click clears row edits and recomputes baseline.
  - All phase validations pass and previous phases remain intact.

  ### Explicit Assumptions and Defaults

  - Annual view remains non-editable.
  - Row reset is undoable via workspace-local undo stack.
  - Edited month boundary uses maximum edited month index, not contiguous prefix.
  - Blank input normalization to zero occurs on blur/commit.
  - Existing snapshot format will be version-bumped to include both workspaces in Phase 11 compatibility work (if needed earlier, add migration shim in Phase 9).

