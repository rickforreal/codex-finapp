# Minor Change Conventions (`docs/changes`)

Use this lane for lightweight refinements that are not defects and not feature-level capability changes.

## 1) Folder and ID format

- Folder: `docs/changes/CHG-####-<slug>/`
- Change ID format: `CHG-####` (zero-padded)
- If no ID is provided, assign the next available ID by scanning `docs/changes/INDEX.md`

## 2) Required files per change

- `CHANGE.md`
- `ACCEPTANCE.md`

## 3) Classification decision tree

- Use `docs/issues/` for incorrect behavior/regressions/correctness defects.
- Use `docs/features/` for meaningful behavior/contract/architecture expansion.
- Use `docs/changes/` for minor refinements:
  - copy and labels,
  - small theme/token tweaks,
  - spacing/alignment/polish,
  - low-impact UX cleanup.

## 4) Tracking policy

- Root `TASKS.md` and `PROGRESS.txt` remain canonical execution trackers.
- Every `CHG-####` must be mirrored in root `TASKS.md`.
- `PROGRESS.txt` entries for this lane must include the `CHG-####` ID.

## 5) Canonical-doc impact requirement

Each `CHANGE.md` must explicitly state canonical-doc impact:
- list affected root docs, or
- `No canonical doc impact` with rationale.

