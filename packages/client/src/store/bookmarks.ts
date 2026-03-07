import { gzip, ungzip } from 'pako';
import {
  BookmarkRecord,
  BOOKMARKS_STORAGE_KEY,
  BOOKMARKS_STORAGE_VERSION,
  BookmarksStorageEnvelope,
} from '@finapp/shared';

import * as bookmarksApi from '../api/bookmarksApi';
import { parseSnapshot, serializeSnapshot } from './snapshot';

type BookmarkStorageErrorCode =
  | 'invalid_storage'
  | 'version_mismatch'
  | 'bookmark_not_found'
  | 'invalid_bookmark_payload'
  | 'quota_exceeded'
  | 'api_error';

export class BookmarkStorageError extends Error {
  code: BookmarkStorageErrorCode;

  constructor(code: BookmarkStorageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// Robust Base64 implementation for all characters
const bytesToBase64 = (bytes: Uint8Array): string => {
  const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binString);
};

const base64ToBytes = (encoded: string): Uint8Array => {
  const binString = atob(encoded);
  return Uint8Array.from(binString, (m) => m.charCodeAt(0));
};

const encodeBookmarkPayload = (rawSnapshot: string): string => {
  const compressed = gzip(rawSnapshot);
  return bytesToBase64(compressed);
};

const decodeBookmarkPayload = (payload: string): string => {
  try {
    const bytes = base64ToBytes(payload);
    return ungzip(bytes, { to: 'string' });
  } catch {
    throw new BookmarkStorageError(
      'invalid_bookmark_payload',
      'This bookmark is invalid and could not be loaded.',
    );
  }
};

const asBookmarksEnvelope = (parsed: unknown): BookmarksStorageEnvelope => {
  if (!parsed || typeof parsed !== 'object') {
    throw new BookmarkStorageError('invalid_storage', 'Bookmark storage payload is invalid.');
  }

  const record = parsed as { version?: unknown; bookmarks?: unknown };
  if (record.version !== BOOKMARKS_STORAGE_VERSION) {
    throw new BookmarkStorageError('version_mismatch', 'Stored bookmark version is not supported.');
  }

  if (!Array.isArray(record.bookmarks)) {
    throw new BookmarkStorageError('invalid_storage', 'Bookmark list is invalid.');
  }

  const bookmarks = record.bookmarks.map((bookmark) => {
    if (!bookmark || typeof bookmark !== 'object') {
      throw new BookmarkStorageError('invalid_storage', 'Bookmark record is invalid.');
    }
    const entry = bookmark as Record<string, unknown>;
    if (
      typeof entry.id !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.savedAt !== 'string' ||
      typeof entry.payload !== 'string'
    ) {
      throw new BookmarkStorageError('invalid_storage', 'Bookmark record fields are invalid.');
    }

    return {
      id: entry.id,
      name: entry.name,
      savedAt: entry.savedAt,
      payload: entry.payload,
      description: typeof entry.description === 'string' ? entry.description : undefined,
    };
  });

  return {
    version: BOOKMARKS_STORAGE_VERSION,
    bookmarks,
  };
};

const readLocalEnvelope = (): BookmarksStorageEnvelope | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  return asBookmarksEnvelope(parsed);
};

const writeLocalEnvelope = (envelope: BookmarksStorageEnvelope): void => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(envelope));
};

export const migrateLocalStorageToDatabase = async (): Promise<void> => {
  const envelope = readLocalEnvelope();
  if (!envelope || envelope.bookmarks.length === 0) {
    return;
  }

  try {
    const existing = await bookmarksApi.listBookmarks();
    const existingIds = new Set(existing.map((bookmark) => bookmark.id));
    const pending = envelope.bookmarks.filter((bookmark) => !existingIds.has(bookmark.id));

    if (pending.length === 0) {
      window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
      return;
    }

    const failed: BookmarkRecord[] = [];
    for (const bookmark of pending) {
      try {
        await bookmarksApi.createBookmark(bookmark);
      } catch (error) {
        console.error(`Failed to migrate bookmark ${bookmark.id}:`, error);
        failed.push(bookmark);
      }
    }

    if (failed.length === 0) {
      window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
      console.log('Successfully migrated bookmarks from localStorage to SQLite.');
      return;
    }

    writeLocalEnvelope({
      version: BOOKMARKS_STORAGE_VERSION,
      bookmarks: failed,
    });
    console.warn(
      `Partially migrated bookmarks. ${failed.length} bookmark(s) remain in localStorage for retry.`,
    );
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

export const listBookmarks = async (): Promise<BookmarkRecord[]> => {
  const localBookmarks = (() => {
    try {
      return readLocalEnvelope()?.bookmarks ?? [];
    } catch (error) {
      console.error('Failed to read local bookmark cache:', error);
      return [];
    }
  })();

  try {
    const remoteBookmarks = await bookmarksApi.listBookmarks();
    if (localBookmarks.length === 0) {
      return remoteBookmarks;
    }

    const mergedById = new Map<string, BookmarkRecord>();
    for (const bookmark of remoteBookmarks) {
      mergedById.set(bookmark.id, bookmark);
    }
    for (const bookmark of localBookmarks) {
      if (!mergedById.has(bookmark.id)) {
        mergedById.set(bookmark.id, bookmark);
      }
    }

    return Array.from(mergedById.values()).sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  } catch (error) {
    if (localBookmarks.length > 0) {
      return localBookmarks;
    }

    throw new BookmarkStorageError(
      'api_error',
      error instanceof Error ? error.message : 'API error',
    );
  }
};

export const createBookmark = async (
  name: string,
  options: { description?: string } = {},
): Promise<BookmarkRecord> => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new BookmarkStorageError('invalid_bookmark_payload', 'Bookmark name is required.');
  }

  const { description } = options;
  const { json } = serializeSnapshot(trimmedName);
  
  try {
    return await bookmarksApi.createBookmark({
      name: trimmedName,
      payload: encodeBookmarkPayload(json),
      description: description?.trim() || undefined,
    });
  } catch (error) {
    throw new BookmarkStorageError('api_error', error instanceof Error ? error.message : 'API error');
  }
};

export const deleteBookmark = async (bookmarkId: string): Promise<boolean> => {
  try {
    await bookmarksApi.deleteBookmark(bookmarkId);
    return true;
  } catch (error) {
    console.error('Failed to delete bookmark via API:', error);
    try {
      const local = readLocalEnvelope();
      if (!local) {
        return false;
      }
      const next = local.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId);
      if (next.length === local.bookmarks.length) {
        return false;
      }
      if (next.length === 0) {
        window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
      } else {
        writeLocalEnvelope({
          version: BOOKMARKS_STORAGE_VERSION,
          bookmarks: next,
        });
      }
      return true;
    } catch (fallbackError) {
      console.error('Failed to delete bookmark from local fallback:', fallbackError);
      return false;
    }
  }
};

export const applyBookmark = async (
  bookmarkId: string,
): Promise<{ bookmark: BookmarkRecord; data: ReturnType<typeof parseSnapshot>['data'] }> => {
  const bookmarks = await listBookmarks();
  const bookmark = bookmarks.find((entry) => entry.id === bookmarkId);

  if (!bookmark) {
    throw new BookmarkStorageError(
      'bookmark_not_found',
      'The selected bookmark could not be found.',
    );
  }

  const rawSnapshot = decodeBookmarkPayload(bookmark.payload);
  const parsedSnapshot = parseSnapshot(rawSnapshot);
  return { bookmark, data: parsedSnapshot.data };
};
