import { BookmarkRecord, CreateBookmarkRequest } from '@finapp/shared';

const API_BASE = '/api/v1';

export const listBookmarks = async (): Promise<BookmarkRecord[]> => {
  const response = await fetch(`${API_BASE}/bookmarks`);
  if (!response.ok) {
    throw new Error('Failed to list bookmarks');
  }
  return response.json();
};

export const createBookmark = async (request: CreateBookmarkRequest): Promise<BookmarkRecord> => {
  const response = await fetch(`${API_BASE}/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create bookmark');
  }
  return response.json();
};

export const deleteBookmark = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/bookmarks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete bookmark');
  }
};
