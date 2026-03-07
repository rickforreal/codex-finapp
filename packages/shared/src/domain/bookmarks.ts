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

export const BOOKMARKS_STORAGE_KEY = 'finapp:bookmarks:v1';
export const BOOKMARKS_STORAGE_VERSION = 1;
export const MAX_BOOKMARKS = 100;
