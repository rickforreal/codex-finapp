import { afterEach, describe, expect, it } from 'vitest';

import { AppMode, AssetClass, HistoricalEra } from '@finapp/shared';

import { addMonths } from '../lib/dates';
import { useAppStore } from './useAppStore';

const resetStore = () => {
  useAppStore.setState(useAppStore.getInitialState(), true);
};

const activateCompare = () => {
  useAppStore.getState().addCompareSlotFromSource('A');
};

const widenTrackingEditWindow = () => {
  const now = new Date();
  useAppStore.getState().setCoreParam('portfolioStart', { month: now.getMonth() + 1, year: now.getFullYear() - 1 });
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

  it('starts with one default spending phase and supports add/remove back to one', () => {
    resetStore();
    const store = useAppStore.getState();
    expect(useAppStore.getState().spendingPhases).toHaveLength(1);

    store.removeSpendingPhase('missing-phase-id');
    expect(useAppStore.getState().spendingPhases).toHaveLength(1);

    store.addSpendingPhase();
    expect(useAppStore.getState().spendingPhases).toHaveLength(2);
    const createdId = useAppStore.getState().spendingPhases[1]?.id;
    if (!createdId) {
      throw new Error('Expected created spending phase');
    }
    store.removeSpendingPhase(createdId);
    expect(useAppStore.getState().spendingPhases).toHaveLength(1);
  });

  it('allows editing start and end dates for a single spending phase', () => {
    resetStore();
    const store = useAppStore.getState();
    const phase = useAppStore.getState().spendingPhases[0];
    if (!phase) {
      throw new Error('Expected default spending phase');
    }

    const portfolioStart = useAppStore.getState().coreParams.portfolioStart;
    const requestedStart = addMonths(portfolioStart, 12);
    const requestedEnd = addMonths(portfolioStart, 24);

    store.updateSpendingPhase(phase.id, { start: requestedStart, end: requestedEnd });

    const updated = useAppStore.getState().spendingPhases.find((entry) => entry.id === phase.id);
    expect(updated?.start).toEqual(requestedStart);
    expect(updated?.end).toEqual(requestedEnd);
  });

  it('defaults new income and expense event start dates to portfolio start', () => {
    resetStore();
    const store = useAppStore.getState();
    const portfolioStart = useAppStore.getState().coreParams.portfolioStart;

    store.addIncomeEvent();
    store.addExpenseEvent();

    const income = useAppStore.getState().incomeEvents.at(-1);
    const expense = useAppStore.getState().expenseEvents.at(-1);
    expect(income?.start).toEqual(portfolioStart);
    expect(expense?.start).toEqual(portfolioStart);
  });

  it('clamps income and expense event dates so they cannot start before portfolio start', () => {
    resetStore();
    const store = useAppStore.getState();
    const portfolioStart = useAppStore.getState().coreParams.portfolioStart;
    const beforeStart = addMonths(portfolioStart, -12);

    store.addIncomeEvent();
    store.addExpenseEvent();

    const incomeId = useAppStore.getState().incomeEvents.at(-1)?.id;
    const expenseId = useAppStore.getState().expenseEvents.at(-1)?.id;
    if (!incomeId || !expenseId) {
      throw new Error('Expected income and expense events');
    }

    store.updateIncomeEvent(incomeId, {
      start: beforeStart,
      end: addMonths(beforeStart, 1),
    });
    store.updateExpenseEvent(expenseId, {
      start: beforeStart,
      end: addMonths(beforeStart, 1),
    });

    const income = useAppStore.getState().incomeEvents.find((event) => event.id === incomeId);
    const expense = useAppStore.getState().expenseEvents.find((event) => event.id === expenseId);
    expect(income?.start).toEqual(portfolioStart);
    expect(expense?.start).toEqual(portfolioStart);
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
    store.upsertActualOverride(1, { startBalances: { stocks: 777_000 } });

    store.setCompareActiveSlot('B');
    store.upsertActualOverride(2, { startBalances: { stocks: 888_000 } });

    expect(useAppStore.getState().actualOverridesByMonth[2]).toBeUndefined();
    expect(useAppStore.getState().actualOverridesByMonth[1]?.startBalances?.stocks).toBe(777_000);
  });

  it('propagates A actual override clears to non-A canonical slots', () => {
    resetStore();
    activateCompare();

    const store = useAppStore.getState();
    store.setMode(AppMode.Tracking);
    widenTrackingEditWindow();
    store.setCompareActiveSlot('A');
    store.upsertActualOverride(1, { startBalances: { stocks: 1_234_500 } });

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().actualOverridesByMonth[1]?.startBalances?.stocks).toBe(1_234_500);

    store.setCompareActiveSlot('A');
    store.clearActualRowOverrides(1);

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().actualOverridesByMonth[1]).toBeUndefined();
  });

  it('supports family-level lock sync, unsync, and resync across slots', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');

    store.setCompareActiveSlot('A');
    store.toggleCompareFamilyLock('startingPortfolio');
    store.setPortfolioValue(AssetClass.Stocks, 1_111_000);

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().portfolio.stocks).toBe(1_111_000);
    store.setPortfolioValue(AssetClass.Stocks, 900_000);
    expect(useAppStore.getState().portfolio.stocks).toBe(1_111_000);

    store.setCompareSlotFamilySync('B', 'startingPortfolio', false);
    store.setPortfolioValue(AssetClass.Stocks, 900_000);
    expect(useAppStore.getState().portfolio.stocks).toBe(900_000);

    store.setCompareActiveSlot('A');
    store.setPortfolioValue(AssetClass.Stocks, 1_222_000);

    store.setCompareActiveSlot('C');
    expect(useAppStore.getState().portfolio.stocks).toBe(1_222_000);

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().portfolio.stocks).toBe(900_000);
    store.setCompareSlotFamilySync('B', 'startingPortfolio', true);
    expect(useAppStore.getState().portfolio.stocks).toBe(1_222_000);
  });

  it('propagates custom historical range through historicalEra lock/sync', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();

    store.setCompareActiveSlot('A');
    store.toggleCompareFamilyLock('historicalEra');
    store.setSelectedHistoricalEra(HistoricalEra.Custom);
    store.setCustomHistoricalRange({
      start: { year: 1990, month: 1 },
      end: { year: 2000, month: 12 },
    });

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().selectedHistoricalEra).toBe(HistoricalEra.Custom);
    expect(useAppStore.getState().customHistoricalRange).toEqual({
      start: { year: 1990, month: 1 },
      end: { year: 2000, month: 12 },
    });

    store.setCompareSlotFamilySync('B', 'historicalEra', false);
    store.setCustomHistoricalRange({
      start: { year: 2001, month: 1 },
      end: { year: 2005, month: 12 },
    });
    expect(useAppStore.getState().customHistoricalRange).toEqual({
      start: { year: 2001, month: 1 },
      end: { year: 2005, month: 12 },
    });

    store.setCompareActiveSlot('A');
    store.setCustomHistoricalRange({
      start: { year: 1985, month: 1 },
      end: { year: 1995, month: 12 },
    });

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().customHistoricalRange).toEqual({
      start: { year: 2001, month: 1 },
      end: { year: 2005, month: 12 },
    });
  });

  it('applies global list lock as exact mirror and blocks follower edits', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();

    store.setCompareActiveSlot('A');
    store.addIncomeEvent('socialSecurity');
    const aEventId = useAppStore.getState().incomeEvents[0]?.id;
    if (!aEventId) {
      throw new Error('Expected A income event for test');
    }
    store.toggleCompareFamilyLock('incomeEvents');

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().incomeEvents.map((entry) => entry.id)).toEqual([aEventId]);
    store.addIncomeEvent('pension');
    expect(useAppStore.getState().incomeEvents.map((entry) => entry.id)).toEqual([aEventId]);

    store.setCompareActiveSlot('A');
    store.removeIncomeEvent(aEventId);
    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().incomeEvents).toHaveLength(0);
  });

  it('supports instance-level list lock merge semantics and locked delete propagation', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();

    store.setCompareActiveSlot('A');
    store.addIncomeEvent('socialSecurity');
    store.addIncomeEvent('pension');
    const [first, second] = useAppStore.getState().incomeEvents;
    if (!first || !second) {
      throw new Error('Expected two income events');
    }
    store.toggleCompareInstanceLock('incomeEvents', first.id);

    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().incomeEvents.some((event) => event.id === first.id)).toBe(true);
    expect(useAppStore.getState().incomeEvents.some((event) => event.id === second.id)).toBe(false);
    store.addIncomeEvent('rentalIncome');
    const localBId = useAppStore.getState().incomeEvents.find((event) => event.id !== first.id)?.id;
    if (!localBId) {
      throw new Error('Expected local B-only income event');
    }

    store.setCompareActiveSlot('A');
    store.updateIncomeEvent(first.id, { amount: 9_999 });
    store.setCompareActiveSlot('B');
    const syncedFirst = useAppStore.getState().incomeEvents.find((event) => event.id === first.id);
    expect(syncedFirst?.amount).toBe(9_999);
    expect(useAppStore.getState().incomeEvents.some((event) => event.id === localBId)).toBe(true);

    store.setCompareActiveSlot('A');
    store.removeIncomeEvent(first.id);
    store.setCompareActiveSlot('B');
    expect(useAppStore.getState().incomeEvents.some((event) => event.id === first.id)).toBe(false);
    expect(useAppStore.getState().incomeEvents.some((event) => event.id === localBId)).toBe(true);
  });

  it('enforces spending-phase instance locks as a contiguous prefix from phase 1', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();
    store.setCompareActiveSlot('A');
    store.addSpendingPhase();
    store.addSpendingPhase();
    store.addSpendingPhase();
    const phases = useAppStore.getState().spendingPhases;
    const first = phases[0]?.id;
    const second = phases[1]?.id;
    const third = phases[2]?.id;
    if (!first || !second || !third) {
      throw new Error('Expected three phases');
    }

    store.toggleCompareInstanceLock('spendingPhases', third);
    expect(useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases[third]).toBeUndefined();

    store.toggleCompareInstanceLock('spendingPhases', first);
    expect(useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases[first]).toBe(true);
    store.toggleCompareInstanceLock('spendingPhases', third);
    expect(useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases[third]).toBeUndefined();

    store.toggleCompareInstanceLock('spendingPhases', second);
    store.toggleCompareInstanceLock('spendingPhases', third);
    expect(useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases[second]).toBe(true);
    expect(useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases[third]).toBe(true);
  });

  it('unlocking a spending phase cascades unlock to later locked phases', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();
    store.setCompareActiveSlot('A');
    store.addSpendingPhase();
    store.addSpendingPhase();
    store.addSpendingPhase();
    const phases = useAppStore.getState().spendingPhases;
    const first = phases[0]?.id;
    const second = phases[1]?.id;
    const third = phases[2]?.id;
    if (!first || !second || !third) {
      throw new Error('Expected three phases');
    }

    store.toggleCompareInstanceLock('spendingPhases', first);
    store.toggleCompareInstanceLock('spendingPhases', second);
    store.toggleCompareInstanceLock('spendingPhases', third);
    expect(useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases[third]).toBe(true);

    store.toggleCompareInstanceLock('spendingPhases', second);
    const locks = useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases;
    expect(locks[first]).toBe(true);
    expect(locks[second]).toBeUndefined();
    expect(locks[third]).toBeUndefined();
  });

  it('syncs spending phase list from A under global family lock', () => {
    resetStore();
    activateCompare();
    const store = useAppStore.getState();
    store.setCompareActiveSlot('A');
    expect(useAppStore.getState().spendingPhases).toHaveLength(1);
    store.toggleCompareFamilyLock('spendingPhases');

    store.setCompareActiveSlot('B');
    store.addSpendingPhase();
    expect(useAppStore.getState().spendingPhases).toHaveLength(1);
  });
});
