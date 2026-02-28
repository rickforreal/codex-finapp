import { afterEach, describe, expect, it } from 'vitest';

import { AssetClass } from '@finapp/shared';

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
    expect(listBookmarks({ storage }).map((entry) => entry.id)).toEqual(['bookmark-3', 'bookmark-1']);
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
});
