# Plan: Absolute Date Parameters V1.1 (Defaults & Range Slider)

## Summary
Refine the absolute date core parameters with improved defaults and a more intuitive range slider UI for managing the portfolio timeline.

## Proposed Changes

### 1. Updated Defaults
- **Birth Date:** Default to `4/1977`.
- **Portfolio Start:** Default to the current month and year.
- **Portfolio End:** Default to 40 years from the portfolio start date.
- **Spending Phases:** `minMonthlySpend` and `maxMonthlySpend` should be blank (undefined) by default for new phases and the initial state.

### 2. UI Refinements
- **Labels:** Remove "(Age Ref)" from the Birth Date label in `CoreParameters.tsx`.
- **Range Slider:**
    - Implement a custom `RangeSlider` component (two-thumb slider).
    - Add the slider below the Portfolio Start/End pickers in `CoreParameters.tsx`.
    - The slider controls both `portfolioStart` and `portfolioEnd`.
    - **Horizon Label:** Display the total portfolio length in years and months above the slider, updating in real-time as the thumbs move.

## Implementation Steps

1.  **Shared/Store Defaults:**
    - Update `coreParamsInitialState` in `slices/coreParams.ts`.
    - Update `getInitialState` and `defaultPhase` in `useAppStore.ts`.
2.  **Shared Component:**
    - Create `packages/client/src/components/shared/RangeSlider.tsx`.
3.  **UI Integration:**
    - Update `packages/client/src/components/inputs/CoreParameters.tsx` to include the slider and update labels.
4.  **Verification:**
    - Run typechecks and tests.
    - Manually verify the slider behavior and real-time label updates.
