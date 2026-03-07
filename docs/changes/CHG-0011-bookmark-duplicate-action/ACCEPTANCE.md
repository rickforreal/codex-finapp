# Acceptance Criteria: Bookmark Duplicate Action

- [ ] A copy icon is visible on hover for each bookmark row, to the left of the delete icon.
- [ ] Clicking the copy icon opens the bookmark creation modal.
- [ ] The modal name input is pre-filled with "Copy of [Original Bookmark Name]".
- [ ] The modal description input is pre-filled with the original bookmark's description (if any).
- [ ] Saving the modal creates a new bookmark with the new name/description and the exact same payload as the original.
- [ ] The new bookmark appears at the top of the bookmarks list.
- [ ] The modal closes and internal duplication state is cleared on save.
- [ ] Closing/canceling the modal clears the duplication state.
- [ ] Creating a regular bookmark (via the main command bar button) still saves the *current* application state, unaffected by previous duplication actions.
