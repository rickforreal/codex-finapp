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

export const migrateLocalStorageToDatabase = async (): Promise<void> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const envelope = asBookmarksEnvelope(parsed);
    
    for (const bookmark of envelope.bookmarks) {
      try {
        await bookmarksApi.createBookmark(bookmark);
      } catch (error) {
        console.error(`Failed to migrate bookmark ${bookmark.id}:`, error);
      }
    }

    window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
    console.log('Successfully migrated bookmarks from localStorage to SQLite.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

export const listBookmarks = async (): Promise<BookmarkRecord[]> => {
  try {
    return await bookmarksApi.listBookmarks();
  } catch (error) {
    throw new BookmarkStorageError('api_error', error instanceof Error ? error.message : 'API error');
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
    console.error('Failed to delete bookmark:', error);
    return false;
  }
};

export const applyBookmark = async (bookmarkId: string): Promise<{ bookmark: BookmarkRecord, data: any }> => {
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
