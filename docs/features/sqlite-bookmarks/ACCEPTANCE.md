# Acceptance Criteria: SQLite Bookmarks

## Core Functionality
- [ ] Bookmarks created in the app are persisted to `packages/server/data/finapp.db`.
- [ ] Restarting the server and client preserves the bookmark list.
- [ ] Deleting a bookmark in the UI removes it from the SQLite database.
- [ ] Large bookmark payloads (many spending phases/events) are stored successfully without quota errors.

## Migration
- [ ] Existing bookmarks in `localStorage` (`finapp:bookmarks:v1`) are automatically detected on app load.
- [ ] Local bookmarks are successfully uploaded to the server.
- [ ] `localStorage` key is cleared only after successful migration.
- [ ] Migration is silent and doesn't interrupt the user experience.

## Technical Standards
- [ ] Server endpoints use Zod validation from `@finapp/shared`.
- [ ] Repository pattern is used to abstract SQLite operations.
- [ ] API responses use standard error structures.
- [ ] Frontend uses `async/await` for all bookmark operations.
- [ ] No circular dependencies introduced between store slices.

## Verification Log
- [ ] Client tests pass: `npm test -w @finapp/client`
- [ ] Server tests pass: `npm test -w @finapp/server`
- [ ] Manual migration test: Pre-fill `localStorage` and verify server DB after load.
