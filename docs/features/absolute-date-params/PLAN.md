# Plan: Absolute Date Core Parameters

## Phase 1: Shared Domain & Contracts

1.  **Update `domain/simulation.ts`:**
    *   Modify `SimulationConfig['coreParams']` to replace `startingAge`, `retirementDuration`, `withdrawalsStartAt`, and `retirementStartDate` with `birthDate`, `portfolioStart`, and `portfolioEnd` (all `{ month, year }`).
    *   Update the `SpendingPhase` interface: change `startYear` and `endYear` to `start` and `end` (`{ month, year }`), and make `minMonthlySpend` and `maxMonthlySpend` optional.
2.  **Update `contracts/schemas.ts`:**
    *   Update `SimulationConfig` Zod schemas to match the new domain types.
    *   Add `.refine()` blocks to enforce logical chronological ordering: `birthDate` < `portfolioStart` < `portfolioEnd`.
    *   Update `SpendingPhase` schema to make min/max optional and validate `{ month, year }` bounds.
3.  **Update Global Docs:** (Completed during planning phase)
    *   `DATA_MODEL.md` updated to reflect `coreParams` and `SpendingPhase` changes.
    *   `ARCHITECTURE.md` updated to reflect the new `coreParams` shape.

## Phase 2: Server Engine Overhaul

1.  **Update `simulator.ts` Loop:**
    *   Rewrite the main iteration loop. Instead of `1` to `retirementDuration * 12`, calculate total months between `portfolioStart` and `portfolioEnd`.
2.  **Update Withdrawal Logic (`applyWithdrawal` / Strategy runners):**
    *   Remove logic that relies on `currentAge >= withdrawalsStartAt`.
    *   Find the active `SpendingPhase` for the current month index.
    *   If an active phase is found, run the strategy. If `minMonthlySpend` or `maxMonthlySpend` are undefined, do not clamp the strategy result.
    *   If no phase is active (though UI should prevent this, engine should be safe), withdrawal is $0.
3.  **Update Server Tests:**
    *   Massive refactor of all `tests/` files in `@finapp/server`. Every test using a mock `SimulationConfig` must be rewritten to provide absolute dates.

## Phase 3: Client Store & Validation

1.  **Update Initial State & Types (`useAppStore.ts` & `slices/coreParams.ts`):**
    *   Update the default state to use absolute dates (e.g., `birthDate: { month: 1, year: 1970 }`).
    *   Ensure default `spendingPhases` has exactly 1 phase spanning the entire portfolio.
2.  **Update Phase Contiguity Logic:**
    *   Rewrite `recalculatePhaseBoundaries` and related logic in the Zustand store. Moving from integers (`startYear: 1`) to objects (`start: { month: 1, year: 2030 }`) will require dedicated date-math helper functions.
3.  **Remove `withdrawalsStartAt` references:**
    *   Remove all getters, setters, and UI constraints related to `withdrawalsStartAt`.
4.  **Update Client Tests:**
    *   Rewrite mock configs in `@finapp/client` tests.

## Phase 4: UI Updates

1.  **`CoreParameters.tsx`:**
    *   Swap `NumericInput` for `MonthYearPicker` for Age, Portfolio Start, and Portfolio End.
    *   Remove the "Withdrawals Start" input.
2.  **`SpendingPhases.tsx`:**
    *   Update the UI to use `MonthYearPicker` for phase bounds.
    *   Remove the "delete" button if it's the only remaining phase.
    *   Update min/max inputs to allow empty/null values.
3.  **Detail Ledger & Charts:**
    *   Update the `useDetailRows.ts` math to calculate dynamic Age based on the row's `monthIndex` offset from `portfolioStart` minus `birthDate`.

## Phase 5: Verification

1.  Run complete typechecks and linting across the monorepo.
2.  Run server and client test suites to ensure the massive mock refactoring is complete and correct.
3.  Manually test the UI to ensure Phase contiguity logic works perfectly with Month/Year objects.
