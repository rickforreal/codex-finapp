# Feature Plan: Persistent Bookmarks (SQLite)

## Summary
Move bookmark persistence from client-side `localStorage` to a server-side SQLite database. This improves reliability, prepares for cloud synchronization, and removes `localStorage` quota limitations. Includes a transparent one-time migration for existing users.

## User Impact
- Bookmarks are now stored on the "server" (local SQLite DB for now).
- Existing bookmarks in `localStorage` are automatically moved to the database on first load.
- No change to the UI/UX for creating, loading, or deleting bookmarks, other than minor loading states.

## Proposed Changes

### 1. Shared Package (`@finapp/shared`)
- Move `BookmarkRecord` and related types from `packages/client/src/store/bookmarks.ts` to `packages/shared/src/domain/bookmarks.ts`.
- Add Zod schemas for bookmark CRUD operations in `packages/shared/src/contracts/bookmarks.ts`.
- Update `packages/shared/src/index.ts` to export new bookmark types and schemas.

### 2. Server Package (`@finapp/server`)
- **Dependencies:** Add `better-sqlite3` and `@types/better-sqlite3`.
- **Database Layer:** 
    - Create `src/db/index.ts` to initialize the SQLite database (`data/finapp.db`).
    - Implement `src/db/schema.ts` to define the `bookmarks` table:
        - `id` (TEXT, PRIMARY KEY)
        - `name` (TEXT)
        - `description` (TEXT, OPTIONAL)
        - `savedAt` (TEXT/ISO8601)
        - `payload` (TEXT/BLOB - compressed snapshot)
- **Repository Pattern:**
    - Create `src/repositories/bookmarkRepository.ts` to abstract DB operations.
- **API Endpoints:**
    - `GET /api/v1/bookmarks`: List all bookmarks.
    - `POST /api/v1/bookmarks`: Create a new bookmark.
    - `DELETE /api/v1/bookmarks/:id`: Delete a bookmark.
    - `PATCH /api/v1/bookmarks/:id`: Update bookmark metadata (optional, for future-proofing).

### 3. Client Package (`@finapp/client`)
- **API Client:** Add `src/api/bookmarksApi.ts` to handle fetch requests to the new endpoints.
- **Store Refactor:**
    - Update `src/store/bookmarks.ts` to use `bookmarksApi.ts`.
    - Change `listBookmarks`, `createBookmark`, `deleteBookmark`, and `applyBookmark` to be `async`.
    - Implement `migrateLocalStorageToDatabase()`:
        - Check for `finapp:bookmarks:v1` in `localStorage`.
        - If present, iterate and call `POST /api/v1/bookmarks` for each.
        - On success, clear the `localStorage` key.
- **UI Components:**
    - Update `CommandBar.tsx` to handle `async` bookmark operations.
    - Add basic loading/error states for bookmark actions.

## Implementation Steps

### Phase 1: Shared & Server Foundation
1. Move types to `@finapp/shared`.
2. Install `better-sqlite3` in `@finapp/server`.
3. Implement DB initialization and `bookmarks` table creation.
4. Implement `BookmarkRepository`.
5. Implement and test Fastify routes for bookmarks.

### Phase 2: Client Migration & Integration
1. Implement `bookmarksApi.ts`.
2. Refactor `store/bookmarks.ts` to be async and call the API.
3. Implement the migration logic in `store/bookmarks.ts`.
4. Update `CommandBar.tsx` to await bookmark calls and trigger migration on mount.

### Phase 3: Validation
1. Verify existing `localStorage` bookmarks migrate correctly.
2. Verify new bookmarks are stored in SQLite.
3. Verify deletion works.
4. Verify error handling (e.g., server down).

## Canonical Docs Impact
- `docs/ARCHITECTURE.md`: Update to reflect that the server is now stateful (SQLite).
- `docs/API.md`: Document new `/api/v1/bookmarks` endpoints.
- `docs/DATA_MODEL.md`: Update bookmark model section.
- `PROGRESS.txt`: Log the migration task.
