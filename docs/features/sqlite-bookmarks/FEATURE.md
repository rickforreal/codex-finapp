# SQLite Bookmarks Persistence

## Problem
Currently, bookmarks are stored in browser `localStorage`. This has several limitations:
1.  **Quota Constraints:** Browser `localStorage` is typically limited to 5-10MB, which can be exhausted by large snapshot payloads.
2.  **Stateless Server:** The server remains purely a compute engine, preventing future features like multi-device sync or public sharing of configurations.
3.  **Reliability:** Browser storage can be cleared by users or the OS under memory pressure.

## Goal
Migrate bookmark persistence from `localStorage` to a server-side SQLite database. This establishes a stateful foundation for the app and improves storage reliability and capacity.

## Scope
- Introduce `better-sqlite3` to `@finapp/server`.
- Implement a SQLite-backed repository for bookmark CRUD operations.
- Define shared bookmark types and schemas in `@finapp/shared`.
- Update the client to use an asynchronous API for bookmark management.
- Implement a one-time migration to move existing `localStorage` bookmarks to the new SQLite database.

## Non-Goals
- No user authentication or multi-user support (yet).
- No cloud deployment or migration to external databases (this change only prepares for it).
