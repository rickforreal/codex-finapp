import { afterEach, describe, expect, it } from 'vitest';

import { AppMode, AssetClass } from '@finapp/shared';

import { useAppStore } from './useAppStore';

const resetStore = () => {
  useAppStore.setState(useAppStore.getInitialState(), true);
};

describe('useAppStore tracking contract', () => {
  afterEach(() => {
    resetStore();
  });

  it('marks tracking outputs stale after core input changes', () => {
    resetStore();
    const store = useAppStore.getState();
    store.setMode(AppMode.Tracking);

    store.setPortfolioValue(AssetClass.Stocks, 2_250_000);

    expect(useAppStore.getState().simulationResults.mcStale).toBe(true);
  });

  it('enforces sequential month edit window: last edited month + 1', () => {
    resetStore();
    const store = useAppStore.getState();
    store.setMode(AppMode.Tracking);
    store.setCoreParam('retirementDuration', 30);

    // Initial state: month 1 editable, month 2 blocked.
    store.upsertActualOverride(2, { startBalances: { stocks: 999_000 } });
    expect(useAppStore.getState().actualOverridesByMonth[2]).toBeUndefined();
    store.upsertActualOverride(1, { startBalances: { stocks: 2_000_000 } });
    expect(useAppStore.getState().actualOverridesByMonth[1]?.startBalances?.stocks).toBe(2_000_000);

    // After editing month 1, month 2 becomes editable; month 3 remains blocked.
    store.upsertActualOverride(3, { startBalances: { stocks: 777_000 } });
    expect(useAppStore.getState().actualOverridesByMonth[3]).toBeUndefined();
    store.upsertActualOverride(2, { startBalances: { stocks: 1_900_000 } });
    expect(useAppStore.getState().actualOverridesByMonth[2]?.startBalances?.stocks).toBe(1_900_000);
  });
});
