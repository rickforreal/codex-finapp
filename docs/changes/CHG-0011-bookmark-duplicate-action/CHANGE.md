# CHG-0011: Bookmark Duplicate Action

## Summary
Add a "copy icon" button for each Bookmark in the list to duplicate an existing bookmark without needing to load it first. The button will open the bookmark naming dialog and save a new bookmark with the identical payload but a new name and description.

## Details
- Add an SVG copy/duplicate icon button to the left of the delete button in the bookmark list items in `CommandBar.tsx`.
- Introduce state in `CommandBar.tsx` (e.g., `duplicateTargetBookmark`) to track when the bookmark modal is opened via the duplicate action.
- Update the bookmark modal to handle duplication: pre-fill the name input with "Copy of <Original Name>" and the description with the original description.
- Add a new `duplicateBookmark(sourceBookmarkId, newName, options)` function in `packages/client/src/store/bookmarks.ts` that retrieves the source bookmark's payload and creates a new bookmark via `bookmarksApi.createBookmark()` with the new name/description.
- Ensure the modal resets the `duplicateTargetBookmark` state upon successful creation or cancellation.
- Use the existing `/api/v1/bookmarks` POST endpoint, which already supports receiving an opaque payload string.

## Canonical Docs Impact
No canonical doc impact. This is a minor UI refinement and client-side store logic addition leveraging existing APIs.
