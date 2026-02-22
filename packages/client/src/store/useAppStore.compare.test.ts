import { afterEach, describe, expect, it } from 'vitest';

import { AppMode, AssetClass } from '@finapp/shared';

import { useAppStore } from './useAppStore';

const resetStore = () => {
  useAppStore.setState(useAppStore.getInitialState(), true);
};

const enterCompareMode = () => {
  useAppStore.getState().setMode(AppMode.Compare);
};

describe('useAppStore compare slot behavior', () => {
  afterEach(() => {
    resetStore();
  });

  it('addCompareSlotFromSource clones source slot data and keeps slotOrder sorted', () => {
    resetStore();
    enterCompareMode();

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

  it('removeCompareSlot enforces min-2 guard and normalizes slot order alphabetically', () => {
    resetStore();
    enterCompareMode();

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
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A', 'C']);
  });

  it('removing an active baseline slot falls back to first sorted slot for both', () => {
    resetStore();
    enterCompareMode();

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

  it('re-adding after deleting A reuses A and keeps sorted A.. order', () => {
    resetStore();
    enterCompareMode();

    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    store.addCompareSlotFromSource('A');
    store.removeCompareSlot('A');
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['B', 'C', 'D']);

    store.addCompareSlotFromSource('B');
    expect(useAppStore.getState().compareWorkspace.slotOrder).toEqual(['A', 'B', 'C', 'D']);
  });
});
