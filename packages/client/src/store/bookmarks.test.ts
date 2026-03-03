import { afterEach, describe, expect, it } from 'vitest';
import { gzip, ungzip } from 'pako';

import { AssetClass, HistoricalEra, SimulationMode } from '@finapp/shared';

import {
  applyBookmark,
  BOOKMARKS_STORAGE_KEY,
  BOOKMARKS_STORAGE_VERSION,
  BookmarkStorageError,
  createBookmark,
  deleteBookmark,
  listBookmarks,
  MAX_BOOKMARKS,
} from './bookmarks';
import { useAppStore } from './useAppStore';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

class QuotaStorage extends MemoryStorage {
  setItem(): void {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  }
}

const resetStore = () => {
  useAppStore.setState(useAppStore.getInitialState(), true);
};

describe('bookmarks', () => {
  afterEach(() => {
    resetStore();
  });

  it('creates and applies a full-state bookmark round-trip', () => {
    const storage = new MemoryStorage();
    resetStore();
    useAppStore.getState().setPortfolioValue(AssetClass.Stocks, 2_500_000);
    const created = createBookmark('Baseline', { storage, createId: () => 'bookmark-1' });

    useAppStore.getState().setPortfolioValue(AssetClass.Stocks, 900_000);
    const beforeApply = useAppStore.getState().portfolio.stocks;

    const applied = applyBookmark(created.id, { storage });

    expect(beforeApply).toBe(900_000);
    expect(applied.id).toBe(created.id);
    expect(useAppStore.getState().portfolio.stocks).toBe(2_500_000);
  });

  it('persists and restores custom historical era range via bookmark', () => {
    const storage = new MemoryStorage();
    resetStore();
    useAppStore.setState((state) => ({
      ...state,
      simulationMode: SimulationMode.MonteCarlo,
      selectedHistoricalEra: HistoricalEra.Custom,
      customHistoricalRange: {
        start: { month: 9, year: 1939 },
        end: { month: 2, year: 2020 },
      },
    }));

    createBookmark('Custom Era', { storage, createId: () => 'bookmark-custom-era' });

    useAppStore.setState((state) => ({
      ...state,
      selectedHistoricalEra: HistoricalEra.FullHistory,
      customHistoricalRange: null,
    }));

    applyBookmark('bookmark-custom-era', { storage });

    const restored = useAppStore.getState();
    expect(restored.simulationMode).toBe(SimulationMode.MonteCarlo);
    expect(restored.selectedHistoricalEra).toBe(HistoricalEra.Custom);
    expect(restored.customHistoricalRange).toEqual({
      start: { month: 9, year: 1939 },
      end: { month: 2, year: 2020 },
    });
  });

  it('preserves spending phases on bookmark create/load', () => {
    const storage = new MemoryStorage();
    resetStore();
    useAppStore.setState((state) => ({
      ...state,
      spendingPhases: [
        {
          id: 'phase-a',
          name: 'Travel Window',
          startYear: 1,
          endYear: 30,
          minMonthlySpend: 5_300,
          maxMonthlySpend: 7_100,
        },
      ],
    }));
    const before = useAppStore.getState().spendingPhases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      startYear: phase.startYear,
      endYear: phase.endYear,
      minMonthlySpend: phase.minMonthlySpend,
      maxMonthlySpend: phase.maxMonthlySpend,
    }));

    const created = createBookmark('Phases', { storage, createId: () => 'bookmark-phases' });
    resetStore();
    applyBookmark(created.id, { storage });

    const after = useAppStore.getState().spendingPhases.map((phase) => ({
      id: phase.id,
      name: phase.name,
      startYear: phase.startYear,
      endYear: phase.endYear,
      minMonthlySpend: phase.minMonthlySpend,
      maxMonthlySpend: phase.maxMonthlySpend,
    }));
    expect(after).toEqual(before);
  });

  it('keeps newest bookmarks at the top and allows duplicate names', () => {
    const storage = new MemoryStorage();

    createBookmark('Plan', { storage, createId: () => 'bookmark-1' });
    createBookmark('Plan', { storage, createId: () => 'bookmark-2' });
    createBookmark('Alt', { storage, createId: () => 'bookmark-3' });

    const bookmarks = listBookmarks({ storage });
    expect(bookmarks.map((entry) => entry.id)).toEqual(['bookmark-3', 'bookmark-2', 'bookmark-1']);
    expect(bookmarks.filter((entry) => entry.name === 'Plan')).toHaveLength(2);
  });

  it('deletes only the selected bookmark', () => {
    const storage = new MemoryStorage();

    createBookmark('One', { storage, createId: () => 'bookmark-1' });
    createBookmark('Two', { storage, createId: () => 'bookmark-2' });
    createBookmark('Three', { storage, createId: () => 'bookmark-3' });

    const removed = deleteBookmark('bookmark-2', { storage });

    expect(removed).toBe(true);
    expect(listBookmarks({ storage }).map((entry) => entry.id)).toEqual([
      'bookmark-3',
      'bookmark-1',
    ]);
  });

  it('evicts oldest bookmarks after reaching max capacity', () => {
    const storage = new MemoryStorage();

    for (let index = 1; index <= MAX_BOOKMARKS + 1; index += 1) {
      createBookmark(`Bookmark ${index}`, {
        storage,
        createId: () => `bookmark-${index}`,
      });
    }

    const bookmarks = listBookmarks({ storage });
    expect(bookmarks).toHaveLength(MAX_BOOKMARKS);
    expect(bookmarks[0]?.id).toBe(`bookmark-${MAX_BOOKMARKS + 1}`);
    expect(bookmarks.some((entry) => entry.id === 'bookmark-1')).toBe(false);
  });

  it('rejects corrupted bookmark payloads and preserves state', () => {
    const storage = new MemoryStorage();

    createBookmark('Valid', { storage, createId: () => 'bookmark-1' });
    const raw = storage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      throw new Error('Expected bookmark payload in storage');
    }

    const parsed = JSON.parse(raw) as {
      version: number;
      bookmarks: Array<{ id: string; name: string; savedAt: string; payload: string }>;
    };
    parsed.bookmarks[0]!.payload = 'not-valid-base64';
    storage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(parsed));

    useAppStore.getState().setPortfolioValue(AssetClass.Stocks, 1_700_000);
    const before = useAppStore.getState().portfolio.stocks;

    expect(() => applyBookmark('bookmark-1', { storage })).toThrowError(BookmarkStorageError);
    expect(() => applyBookmark('bookmark-1', { storage })).toThrowError(/invalid/i);
    expect(useAppStore.getState().portfolio.stocks).toBe(before);
  });

  it('rejects unsupported bookmark envelope versions', () => {
    const storage = new MemoryStorage();

    storage.setItem(
      BOOKMARKS_STORAGE_KEY,
      JSON.stringify({
        version: BOOKMARKS_STORAGE_VERSION + 1,
        bookmarks: [],
      }),
    );

    try {
      listBookmarks({ storage });
      throw new Error('Expected version mismatch');
    } catch (error) {
      expect(error).toBeInstanceOf(BookmarkStorageError);
      expect((error as BookmarkStorageError).code).toBe('version_mismatch');
    }
  });

  it('surfaces quota exceeded on save', () => {
    const storage = new QuotaStorage();

    try {
      createBookmark('Quota', { storage, createId: () => 'bookmark-quota' });
      throw new Error('Expected quota failure');
    } catch (error) {
      expect(error).toBeInstanceOf(BookmarkStorageError);
      expect((error as BookmarkStorageError).code).toBe('quota_exceeded');
    }
  });

  it('restores compareSync lock state through bookmark round-trip', () => {
    const storage = new MemoryStorage();
    resetStore();
    const store = useAppStore.getState();
    store.addCompareSlotFromSource('A');
    store.toggleCompareFamilyLock('spendingPhases');
    store.setCompareSlotFamilySync('B', 'spendingPhases', false);

    createBookmark('Compare Sync', { storage, createId: () => 'bookmark-sync' });
    store.toggleCompareFamilyLock('spendingPhases');

    applyBookmark('bookmark-sync', { storage });
    const compareSync = useAppStore.getState().compareWorkspace.compareSync;
    expect(compareSync.familyLocks.spendingPhases).toBe(true);
    expect(compareSync.unsyncedBySlot.B?.families.spendingPhases).toBe(true);
  });

  it('auto-clears spending phases when applying legacy bookmark payloads', () => {
    const storage = new MemoryStorage();
    resetStore();
    const store = useAppStore.getState();
    store.addSpendingPhase();
    store.addSpendingPhase();
    expect(useAppStore.getState().spendingPhases.length).toBeGreaterThan(0);
    createBookmark('With Phases', { storage, createId: () => 'bookmark-phases' });

    const raw = storage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      throw new Error('Expected bookmark payload in storage');
    }
    const parsed = JSON.parse(raw) as {
      version: number;
      bookmarks: Array<{ id: string; name: string; savedAt: string; payload: string }>;
    };
    const target = parsed.bookmarks.find((entry) => entry.id === 'bookmark-phases');
    if (!target) {
      throw new Error('Expected bookmark-phases in storage');
    }
    const decoded = atob(target.payload);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    const json = ungzip(bytes, { to: 'string' });
    const snapshot = JSON.parse(json) as { data: { compareWorkspace?: Record<string, unknown> } };
    if (snapshot.data.compareWorkspace) {
      delete snapshot.data.compareWorkspace.compareSync;
    }
    const recompressed = gzip(JSON.stringify(snapshot));
    target.payload = btoa(String.fromCharCode(...recompressed));
    storage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(parsed));

    store.removeSpendingPhase(useAppStore.getState().spendingPhases[0]?.id ?? '');
    applyBookmark('bookmark-phases', { storage });
    expect(useAppStore.getState().spendingPhases).toHaveLength(0);
  });

  it('loads legacy v6 bookmark payloads by backfilling custom-range and block-bootstrap defaults', () => {
    const storage = new MemoryStorage();
    resetStore();
    createBookmark('Legacy v6', { storage, createId: () => 'bookmark-v6' });

    const raw = storage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) {
      throw new Error('Expected bookmark payload in storage');
    }
    const parsed = JSON.parse(raw) as {
      version: number;
      bookmarks: Array<{ id: string; name: string; savedAt: string; payload: string }>;
    };
    const target = parsed.bookmarks.find((entry) => entry.id === 'bookmark-v6');
    if (!target) {
      throw new Error('Expected bookmark-v6 in storage');
    }

    const decoded = atob(target.payload);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    const json = ungzip(bytes, { to: 'string' });
    const snapshot = JSON.parse(json) as {
      schemaVersion: number;
      data: {
        customHistoricalRange?: unknown;
        blockBootstrapEnabled?: unknown;
        blockBootstrapLength?: unknown;
      };
    };
    snapshot.schemaVersion = 6;
    delete snapshot.data.customHistoricalRange;
    delete snapshot.data.blockBootstrapEnabled;
    delete snapshot.data.blockBootstrapLength;

    const recompressed = gzip(JSON.stringify(snapshot));
    target.payload = btoa(String.fromCharCode(...recompressed));
    storage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(parsed));

    applyBookmark('bookmark-v6', { storage });
    const restored = useAppStore.getState();
    expect(restored.customHistoricalRange).toBeNull();
    expect(restored.blockBootstrapEnabled).toBe(false);
    expect(restored.blockBootstrapLength).toBe(12);
  });

  it('saves and retrieves bookmark description', () => {
    const storage = new MemoryStorage();
    resetStore();
    const created = createBookmark('Test Bookmark', {
      storage,
      createId: () => 'bookmark-desc',
      description: 'My test description',
    });

    expect(created.description).toBe('My test description');

    const list = listBookmarks({ storage });
    expect(list[0]?.description).toBe('My test description');

    const applied = applyBookmark('bookmark-desc', { storage });
    expect(applied.description).toBe('My test description');
  });

  it('handles undefined description for backwards compatibility', () => {
    const storage = new MemoryStorage();
    resetStore();
    createBookmark('Legacy Bookmark', { storage, createId: () => 'bookmark-legacy' });

    const list = listBookmarks({ storage });
    expect(list[0]?.description).toBeUndefined();
  });

  it('trims whitespace from description', () => {
    const storage = new MemoryStorage();
    resetStore();
    const created = createBookmark('Trim Test', {
      storage,
      createId: () => 'bookmark-trim',
      description: '  spaces around  ',
    });

    expect(created.description).toBe('spaces around');
  });
});
