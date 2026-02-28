# Bookmarks Feature

## Problem
Snapshot save/load works for durable file-based portability, but it is too slow for rapid iteration inside a single browser session. Users need a faster in-app way to save and recall current app state without opening the file picker each time.

## Goal
Add command-bar bookmarks that save full state to browser local storage and can be loaded instantly from a dropdown list.

## Scope
- Add `Create Bookmark` command bar action.
- Create modal for required bookmark name entry.
- Persist bookmark payloads in local storage as compressed full-state snapshots.
- Add bookmarks dropdown list with newest-first ordering.
- Add hover-only delete affordance per bookmark row with confirmation.
- Enforce maximum of 100 bookmarks by count; evict oldest on save when exceeding cap.
- Surface explicit quota errors when local storage capacity is exhausted.

## Non-Goals
- No backend bookmark API.
- No remote persistence/account integration.
- No changes to snapshot file save/load behavior.
