# Bookmarks Acceptance

## Functional Acceptance
1. `Create Bookmark` opens modal with required name input.
2. Save stores bookmark in local storage using compressed payload and shows success message.
3. Bookmarks dropdown lists newest first.
4. Selecting a bookmark immediately replaces full app state.
5. Hovering a bookmark row reveals trash icon; deletion requires confirmation.
6. Duplicate names are allowed.
7. Saving the 101st bookmark retains only 100 newest entries.
8. Quota failures surface a clear error and do not partially save.
9. Snapshot Save/Load continues to work unchanged.

## Verification Gate
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
