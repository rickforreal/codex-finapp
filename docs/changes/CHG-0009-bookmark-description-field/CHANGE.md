# CHANGE: Bookmark Description Field

- Change ID: `CHG-0009`
- Status: `Done`
- Created: `2026-03-01`
- Updated: `2026-03-01`

## Why

Users need the ability to add notes or context to bookmarks to distinguish between similar snapshots (e.g., "Baseline with 4% withdrawal" vs "Baseline with 5% withdrawal"). Without a description field, users must rely solely on timestamps or vague names.

## Scope

- Added optional `description` field to `BookmarkRecord` type in `bookmarks.ts`
- Updated `createBookmark()` function to accept optional `description` parameter
- Added description input field to the Create Bookmark modal in `CommandBar.tsx`
- Display description below timestamp in bookmarks dropdown with `·` separator
- Added tooltip on hover showing full description
- Added tests for description functionality including backwards compatibility

## Non-goals

- Not changing the storage format version (backwards compatible)
- Not adding description editing after creation (only at creation time)
- Not adding description to the bookmark name in any way

## Surfaces Touched

- `packages/client/src/store/bookmarks.ts`
- `packages/client/src/store/bookmarks.test.ts`
- `packages/client/src/components/layout/CommandBar.tsx`

## Classification Rationale

This is a minor change because:

- No new feature functionality, just an optional annotation field
- No change to data model contracts (description is optional, backwards compatible)
- No change to product behavior or architecture
- Minor UX polish to an existing feature

## Canonical Docs Impact

- `No canonical doc impact.`
  - Rationale: The bookmarking feature behavior is unchanged; this is an optional annotation that doesn't affect simulation results, API contracts, or user flows.
