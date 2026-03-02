import { gzip, ungzip } from 'pako';

import { parseSnapshot, serializeSnapshot } from './snapshot';
import { useAppStore } from './useAppStore';

export const BOOKMARKS_STORAGE_KEY = 'finapp:bookmarks:v1';
export const BOOKMARKS_STORAGE_VERSION = 1;
export const MAX_BOOKMARKS = 100;

export type BookmarkRecord = {
  id: string;
  name: string;
  savedAt: string;
  payload: string;
  description?: string;
};

export type BookmarksStorageEnvelope = {
  version: number;
  bookmarks: BookmarkRecord[];
};

type BookmarkStorageErrorCode =
  | 'invalid_storage'
  | 'version_mismatch'
  | 'bookmark_not_found'
  | 'invalid_bookmark_payload'
  | 'quota_exceeded';

export class BookmarkStorageError extends Error {
  code: BookmarkStorageErrorCode;

  constructor(code: BookmarkStorageErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type BookmarkStorageOptions = {
  storage?: Storage;
  createId?: () => string;
};

const defaultCreateId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `bookmark-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const resolveStorage = (storage?: Storage): Storage => {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    throw new BookmarkStorageError(
      'invalid_storage',
      'Bookmark storage is not available in this environment.',
    );
  }

  return window.localStorage;
};

const isQuotaExceeded = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) {
    return false;
  }

  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  );
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

const readEnvelope = (storage: Storage): BookmarksStorageEnvelope => {
  const raw = storage.getItem(BOOKMARKS_STORAGE_KEY);
  if (!raw) {
    return {
      version: BOOKMARKS_STORAGE_VERSION,
      bookmarks: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BookmarkStorageError(
      'invalid_storage',
      'Bookmark storage payload is not valid JSON.',
    );
  }

  return asBookmarksEnvelope(parsed);
};

const writeEnvelope = (storage: Storage, envelope: BookmarksStorageEnvelope): void => {
  try {
    storage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    if (isQuotaExceeded(error)) {
      throw new BookmarkStorageError(
        'quota_exceeded',
        'Bookmark storage is full. Delete some bookmarks or use Save Snapshot.',
      );
    }

    throw error;
  }
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof btoa !== 'function') {
    throw new BookmarkStorageError('invalid_storage', 'Base64 encoding is not available.');
  }

  return btoa(binary);
};

const base64ToBytes = (encoded: string): Uint8Array => {
  if (typeof atob !== 'function') {
    throw new BookmarkStorageError('invalid_storage', 'Base64 decoding is not available.');
  }

  const binary = atob(encoded);

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
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

export const listBookmarks = (
  options: Pick<BookmarkStorageOptions, 'storage'> = {},
): BookmarkRecord[] => {
  const storage = resolveStorage(options.storage);
  return [...readEnvelope(storage).bookmarks];
};

export const createBookmark = (
  name: string,
  options: BookmarkStorageOptions & { description?: string } = {},
): BookmarkRecord => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new BookmarkStorageError('invalid_bookmark_payload', 'Bookmark name is required.');
  }

  const { description, storage, createId } = options;
  const resolvedStorage = resolveStorage(storage);
  const resolvedCreateId = createId ?? defaultCreateId;
  const envelope = readEnvelope(resolvedStorage);
  const { json } = serializeSnapshot(trimmedName);
  const parsed = JSON.parse(json) as { savedAt?: unknown };
  const savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString();

  const nextBookmark: BookmarkRecord = {
    id: resolvedCreateId(),
    name: trimmedName,
    savedAt,
    payload: encodeBookmarkPayload(json),
    description: description?.trim() || undefined,
  };

  const nextEnvelope: BookmarksStorageEnvelope = {
    version: BOOKMARKS_STORAGE_VERSION,
    bookmarks: [nextBookmark, ...envelope.bookmarks].slice(0, MAX_BOOKMARKS),
  };

  writeEnvelope(resolvedStorage, nextEnvelope);
  return nextBookmark;
};

export const deleteBookmark = (
  bookmarkId: string,
  options: Pick<BookmarkStorageOptions, 'storage'> = {},
): boolean => {
  const storage = resolveStorage(options.storage);
  const envelope = readEnvelope(storage);
  const nextBookmarks = envelope.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId);

  if (nextBookmarks.length === envelope.bookmarks.length) {
    return false;
  }

  writeEnvelope(storage, {
    version: BOOKMARKS_STORAGE_VERSION,
    bookmarks: nextBookmarks,
  });
  return true;
};

export const applyBookmark = (
  bookmarkId: string,
  options: Pick<BookmarkStorageOptions, 'storage'> = {},
): BookmarkRecord => {
  const storage = resolveStorage(options.storage);
  const envelope = readEnvelope(storage);
  const bookmark = envelope.bookmarks.find((entry) => entry.id === bookmarkId);

  if (!bookmark) {
    throw new BookmarkStorageError(
      'bookmark_not_found',
      'The selected bookmark could not be found.',
    );
  }

  const rawSnapshot = decodeBookmarkPayload(bookmark.payload);
  const parsedSnapshot = parseSnapshot(rawSnapshot);
  useAppStore.getState().setStateFromSnapshot(parsedSnapshot.data);
  return bookmark;
};
