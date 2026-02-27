import { afterEach, describe, expect, it } from 'vitest';

import { AppMode, AssetClass } from '@finapp/shared';

import { useAppStore } from './useAppStore';

const resetStore = () => {
  useAppStore.setState(useAppStore.getInitialState(), true);
};

const activateCompare = () => {
  useAppStore.getState().addCompareSlotFromSource('A');
};

const widenTrackingEditWindow = () => {
  const now = new Date();
  useAppStore.getState().setCoreParam('retirementStartDate', { month: now.getMonth() + 1, year: now.getFullYear() - 1 });
};

describe('useAppStore compare slot behavior', () => {
  afterEach(() => {
    resetStore();
  });

  it('addCompareSlotFromSource clones source slot data and keeps slotOrder sorted', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.setCompareActiveSlot('B');
    store.setPortfolioValue(AssetClass.Stocks, 1_234_567);
    store.setCompareActiveSlot('A');
    store.setCompareActiveSlot('B');
    store.addCompareSlotFromSource('B');

    const state = useAppStore.getState();
    expect(state.compareWorkspace.slotOrder).toEqual(['A', 'B', 'C']);
    expect(state.compareWorkspace.slots.B?.portfolio.stocks).toBe(1_234_567);
    expect(state.compareWorkspace.slots.C?.portfolio.stocks).toBe(1_234_567);
    expect(state.compareWorkspace.slots.A?.portfolio.stocks).not.toBe(1_234_567);
  });

  it('initializes compare workspace with A-only and activates compare at 2+ slots', () => {
    resetStore();
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A']);

    activateCompare();
    const state = useAppStore.getState();
    expect(state.compareWorkspace.slotOrder).toEqual(['A', 'B']);
    expect(state.compareWorkspace.slots.A).toBeDefined();
    expect(state.compareWorkspace.slots.B).toBeDefined();
  });

  it('removeCompareSlot enforces min-2 guard and normalizes slot order alphabetically', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    useAppStore.setState((current) => ({
      compareWorkspace: {
        ...current.compareWorkspace,
        slotOrder: ['C', 'A', 'B'],
      },
    }));

    useAppStore.getState().removeCompareSlot('B');
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A', 'C']);

    useAppStore.getState().removeCompareSlot('C');
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A']);
  });

  it('removing an active baseline slot falls back to first sorted slot for both', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    store.setCompareActiveSlot('C');
    store.setCompareBaselineSlot('C');

    store.removeCompareSlot('C');

    const state = useAppStore.getState();
    expect(state.compareWorkspace.slotOrder).toEqual(['A', 'B']);
    expect(state.compareWorkspace.activeSlotId).toBe('A');
    expect(state.compareWorkspace.baselineSlotId).toBe('A');
  });

  it('removeCompareSlot keeps A non-deletable even when there are more than two slots', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    store.setCompareActiveSlot('A');
    store.setCompareBaselineSlot('A');
    const before = useAppStore.getState().compareWorkspace;

    store.removeCompareSlot('A');

    const after = useAppStore.getState().compareWorkspace;
    expect(after.slotOrder).toEqual(before.slotOrder);
    expect(after.activeSlotId).toBe(before.activeSlotId);
    expect(after.baselineSlotId).toBe(before.baselineSlotId);
    expect(after.slots.A).toEqual(before.slots.A);
  });

  it('removeCompareSlot still removes non-A slots when A is present', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A', 'B', 'C']);

    store.removeCompareSlot('C');
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A', 'B']);
  });

  it('blocks non-A actual edits in tracking compare', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.setMode(AppMode.Tracking);
    widenTrackingEditWindow();
    store.setCompareActiveSlot('A');
    store.upsertActualOverride(3, { startBalances: { stocks: 777_000 } });

    store.setCompareActiveSlot('B');
    store.upsertActualOverride(4, { startBalances: { stocks: 888_000 } });

    expect(useAppStore.getState().actualOverridesByMonth[4]).toBeUndefined();
    expect(useAppStore.getState().actualOverridesByMonth[3]?.startBalances?.stocks).toBe(777_000);
  });

  it('propagates A actual override clears to non-A canonical slots', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.setMode(AppMode.Tracking);
    widenTrackingEditWindow();
    store.setCompareActiveSlot('A');
    store.upsertActualOverride(5, { startBalances: { stocks: 1_234_500 } });

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().actualOverridesByMonth[5]?.startBalances?.stocks).toBe(1_234_500);

    store.setCompareActiveSlot('A');
    store.clearActualRowOverrides(5);

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().actualOverridesByMonth[5]).toBeUndefined();
  });
});
