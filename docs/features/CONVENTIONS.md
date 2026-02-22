# Feature Folder Conventions (Post-V1)

This document defines how to structure new feature work and updates to existing features.

## 1) New Features

Create a new folder:

`docs/features/<feature-slug>/`

Required files:
- `FEATURE.md`
- `PLAN.md`
- `ACCEPTANCE.md`

Optional support files (as needed):
- `TOKENS.md`
- other focused reference docs

## 2) Updating Existing Features

Do not rewrite the original shipped feature folder.

Use a new folder per approved update batch:
- `docs/features/<feature-slug>-v1-1/`
- `docs/features/<feature-slug>-v1-2/`
- `docs/features/<feature-slug>-v1-3/`

One approved batch of changes corresponds to one update folder.

## 3) Versioning Rule for Feature Update Folders

- Minor update waves (`v1-x`):
  - backward-compatible behavior changes
  - UX improvements
  - additive capabilities that preserve existing model assumptions

- Major update waves (`v2-0`, `v3-0`, ...):
  - contract/model breaks
  - state/workflow semantic changes that invalidate prior assumptions
  - compatibility/interop guarantee changes

## 4) Required Plan Linkage for Update Folders

Each update folder `PLAN.md` must include a section named:

`## Delta From Baseline`

This section must:
1. reference the baseline feature folder path,
2. list what assumptions are changed,
3. list what remains unchanged.

## 5) Canonical Tracking and Docs Impact

- Root `TASKS.md` and `PROGRESS.txt` are the only execution trackers.
- Feature folders do not include `TASKS.md`.
- If behavior/contracts/architecture/process changes, update canonical root docs (`PRD.md`, `SPECS.md`, `SCENARIOS.md`, `DATA_MODEL.md`, `API.md`, `ARCHITECTURE.md`, `ENGINEERING.md`) accordingly.
- If no canonical docs change, explicitly record that rationale in `PROGRESS.txt`.

## 6) When to use `docs/changes` instead

Use the minor-change lane (`docs/changes/`) when work is a low-impact refinement and does not belong to defects or feature waves:

- copy/label text updates,
- minor theme token tweaks,
- spacing/alignment polish,
- low-impact UX cleanup with no meaningful model/contract shift.

See `docs/changes/CONVENTIONS.md` for required files and ID policy.
