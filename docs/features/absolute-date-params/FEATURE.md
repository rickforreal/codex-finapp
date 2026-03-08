# Feature: Absolute Date Core Parameters

## Problem
The application currently uses a "Retirement" specific mental model (e.g., Starting Age, Retirement Duration, Withdrawals Start At). This limits the tool's perceived utility as a general portfolio analysis application. Furthermore, using relative values (like Duration or Age) makes it difficult for users to align external financial events (like Social Security or mortgage payoffs) with the exact timeline of the simulation.

## Goal
Migrate the core parameter data model from relative years/durations to absolute Month/Year dates. This shift will anchor the simulation in reality, clarify the timeline, and rebrand the application toward general portfolio analysis.

## Key Changes
1.  **Age (Month/Year):** Replace `startingAge` with `birthDate` (Month/Year). This is primarily used in the Detail Ledger to calculate the exact age at any given point in the simulation.
2.  **Portfolio Start:** Rename `retirementStartDate` to `portfolioStart` (Month/Year). This becomes T=0 for the simulation and acts as the floor for all financial events.
3.  **Withdrawal Start Removed:** The `withdrawalsStartAt` parameter is removed. Instead, the application will rely entirely on **Spending Phases** to dictate when withdrawals are permitted. 
4.  **Spending Phases Updated:** 
    *   `SpendingPhase` date bounds (`startYear`, `endYear`) are converted to absolute Month/Year dates (`start`, `end`).
    *   There must always be at least 1 default Spending Phase.
    *   `minMonthlySpend` and `maxMonthlySpend` become optional. If left blank, the withdrawal amount is dictated purely by the selected Withdrawal Strategy.
5.  **Portfolio End:** Replace `retirementDuration` with `portfolioEnd` (Month/Year). This defines the exact end date of the portfolio simulation.

## Non-Goals (Explicit Exclusions)
*   **Data Migration:** Existing saved snapshot files (`.json`) and SQLite bookmarks will **not** be migrated to the new schema. This is an accepted breaking change for existing data payloads. We are abandoning backward compatibility for `SimulationConfig` payloads in this phase.
