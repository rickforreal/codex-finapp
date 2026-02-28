import { afterEach, describe, expect, it } from 'vitest';

import { AppMode, AssetClass, HistoricalEra, SimulationMode } from '@finapp/shared';

import {
  applySnapshot,
  PACKED_ROW_COLUMNS,
  parseSnapshot,
  serializeSnapshot,
  SNAPSHOT_SCHEMA_VERSION,
  SnapshotLoadError,
} from './snapshot';
import { getSnapshotState, useAppStore } from './useAppStore';

const sampleResponse = {
  simulationMode: SimulationMode.Manual,
  result: {
    rows: [
      {
        monthIndex: 1,
        year: 1,
        monthInYear: 1,
        startBalances: { stocks: 2_000_000, bonds: 250_000, cash: 50_000 },
        marketChange: { stocks: 12_000, bonds: 1_000, cash: 10 },
        withdrawals: {
          byAsset: { stocks: 0, bonds: 0, cash: 8_000 },
          requested: 8_000,
          actual: 8_000,
          shortfall: 0,
        },
        incomeTotal: 0,
        expenseTotal: 0,
        endBalances: { stocks: 2_012_000, bonds: 251_000, cash: 42_010 },
      },
    ],
    summary: {
      totalWithdrawn: 8_000,
      totalShortfall: 0,
      terminalPortfolioValue: 2_305_010,
    },
  },
};

const resetStore = () => {
  useAppStore.setState(useAppStore.getInitialState(), true);
};

describe('snapshot', () => {
  afterEach(() => {
    resetStore();
  });

  it('round-trips and restores cached outputs', () => {
    resetStore();
    useAppStore.setState((state) => ({
      ...state,
      mode: AppMode.Tracking,
      simulationMode: SimulationMode.MonteCarlo,
      selectedHistoricalEra: HistoricalEra.PostWarBoom,
      simulationResults: {
        ...state.simulationResults,
        manual: sampleResponse,
        status: 'complete',
      },
    }));

    const before = getSnapshotState();
    const { json } = serializeSnapshot('Tracking Snapshot');
    const serialized = JSON.parse(json) as {
      schemaVersion: number;
      data: {
        simulationResults: {
          manual: { result: { rowsPacked: { columns: string[]; data: number[][] } } } | null;
        };
      };
    };
    expect(serialized.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    expect(serialized.data.simulationResults.manual?.result.rowsPacked.columns).toEqual(PACKED_ROW_COLUMNS);
    expect(Array.isArray(serialized.data.simulationResults.manual?.result.rowsPacked.data)).toBe(true);

    useAppStore.setState((state) => ({
      ...state,
      coreParams: { ...state.coreParams, startingAge: 99 },
      simulationResults: { ...state.simulationResults, manual: null },
    }));

    applySnapshot(json);

    const after = useAppStore.getState();
    expect(after.mode).toBe(before.mode);
    expect(after.simulationMode).toBe(before.simulationMode);
    expect(after.selectedHistoricalEra).toBe(before.selectedHistoricalEra);
    expect(after.simulationResults.manual).toEqual(before.simulationResults.manual);
    expect(after.simulationResults.manual?.result.rows[0]?.endBalances.stocks).toBe(2_012_000);
  });

  it('rejects strict schema version mismatches', () => {
    resetStore();
    const { json } = serializeSnapshot('Versioned Snapshot');
    const parsed = JSON.parse(json) as { schemaVersion: number };
    parsed.schemaVersion += 1;

    expect(() => parseSnapshot(JSON.stringify(parsed))).toThrowError(SnapshotLoadError);
    expect(() => parseSnapshot(JSON.stringify(parsed))).toThrowError(/not supported/i);
  });

  it('rejects legacy compare-mode snapshots explicitly', () => {
    resetStore();
    const { json } = serializeSnapshot('Legacy Compare Snapshot');
    const parsed = JSON.parse(json) as { data: { mode: string } };
    parsed.data.mode = 'compare';

    expect(() => parseSnapshot(JSON.stringify(parsed))).toThrowError(SnapshotLoadError);
    expect(() => parseSnapshot(JSON.stringify(parsed))).toThrowError(/compare mode.*not supported/i);
  });

  it('rejects malformed packed row columns', () => {
    resetStore();
    useAppStore.setState((state) => ({
      ...state,
      simulationResults: {
        ...state.simulationResults,
        manual: sampleResponse,
        status: 'complete',
      },
    }));

    const { json } = serializeSnapshot('Malformed Columns');
    const parsed = JSON.parse(json) as {
      data: {
        simulationResults: {
          manual: { result: { rowsPacked: { columns: string[] } } } | null;
        };
      };
    };

    if (!parsed.data.simulationResults.manual) {
      throw new Error('Expected manual result in snapshot test setup.');
    }

    parsed.data.simulationResults.manual.result.rowsPacked.columns[0] = 'wrong';
    expect(() => applySnapshot(JSON.stringify(parsed))).toThrowError(SnapshotLoadError);
    expect(() => applySnapshot(JSON.stringify(parsed))).toThrowError(/valid snapshot/i);
  });

  it('rejects malformed packed row width', () => {
    resetStore();
    useAppStore.setState((state) => ({
      ...state,
      simulationResults: {
        ...state.simulationResults,
        manual: sampleResponse,
        status: 'complete',
      },
    }));

    const { json } = serializeSnapshot('Malformed Width');
    const parsed = JSON.parse(json) as {
      data: {
        simulationResults: {
          manual: { result: { rowsPacked: { data: number[][] } } } | null;
        };
      };
    };

    if (!parsed.data.simulationResults.manual) {
      throw new Error('Expected manual result in snapshot test setup.');
    }

    parsed.data.simulationResults.manual.result.rowsPacked.data[0]?.pop();
    expect(() => applySnapshot(JSON.stringify(parsed))).toThrowError(SnapshotLoadError);
    expect(() => applySnapshot(JSON.stringify(parsed))).toThrowError(/valid snapshot/i);
  });

  it('persists and restores compareSync lock state', () => {
    resetStore();
    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    store.setCompareActiveSlot('A');
    store.toggleCompareFamilyLock('startingPortfolio');
    store.setCompareSlotFamilySync('B', 'startingPortfolio', false);

    const { json } = serializeSnapshot('Compare Sync');
    applySnapshot(json);

    const compareSync = useAppStore.getState().compareWorkspace.compareSync;
    expect(compareSync.familyLocks.startingPortfolio).toBe(true);
    expect(compareSync.unsyncedBySlot.B?.families.startingPortfolio).toBe(true);
  });

  it('loads older snapshots without compareSync by defaulting lock state', () => {
    resetStore();
    const { json } = serializeSnapshot('Legacy Compare Sync Missing');
    const parsed = JSON.parse(json) as {
      data: { compareWorkspace?: Record<string, unknown> };
    };
    if (!parsed.data.compareWorkspace) {
      throw new Error('Expected compare workspace in snapshot');
    }
    delete parsed.data.compareWorkspace.compareSync;

    applySnapshot(JSON.stringify(parsed));
    const compareSync = useAppStore.getState().compareWorkspace.compareSync;
    expect(compareSync.familyLocks.coreParams).toBe(false);
    expect(compareSync.familyLocks.expenseEvents).toBe(false);
  });

  it('normalizes non-prefix spending phase locks from loaded snapshot state', () => {
    resetStore();
    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    store.setCompareActiveSlot('A');
    store.addSpendingPhase();
    store.addSpendingPhase();
    const phases = useAppStore.getState().spendingPhases;
    const first = phases[0]?.id;
    const third = phases[2]?.id;
    if (!first || !third) {
      throw new Error('Expected three phases');
    }

    const { json } = serializeSnapshot('Non Prefix Spending Locks');
    const parsed = JSON.parse(json) as {
      data: {
        compareWorkspace?: {
          compareSync?: {
            instanceLocks?: {
              spendingPhases?: Record<string, boolean>;
              incomeEvents?: Record<string, boolean>;
              expenseEvents?: Record<string, boolean>;
            };
          };
        };
      };
    };
    if (!parsed.data.compareWorkspace?.compareSync) {
      throw new Error('Expected compare sync in serialized snapshot');
    }
    parsed.data.compareWorkspace.compareSync.instanceLocks = {
      spendingPhases: { [first]: true, [third]: true },
      incomeEvents: {},
      expenseEvents: {},
    };
    applySnapshot(JSON.stringify(parsed));

    const locks = useAppStore.getState().compareWorkspace.compareSync.instanceLocks.spendingPhases;
    expect(locks[first]).toBe(true);
    expect(locks[third]).toBeUndefined();
  });

  it('rejects invalid files and preserves existing state', () => {
    resetStore();
    useAppStore.getState().setPortfolioValue(AssetClass.Stocks, 2_100_000);
    const previousStocks = useAppStore.getState().portfolio.stocks;

    try {
      applySnapshot('{"invalid":true}');
      throw new Error('Expected snapshot parsing to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(SnapshotLoadError);
      expect((error as SnapshotLoadError).code).toBe('invalid_snapshot');
    }

    expect(useAppStore.getState().portfolio.stocks).toBe(previousStocks);
  });
});
