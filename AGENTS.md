# Agent Instructions

## 0) Mission

Build the Retirement Forecasting / Funds Management web application **one Phase at a time**, as defined in `ENGINEERING.md`. After completing a Phase and meeting its Definition of Done (DoD), **stop** and wait for human review before starting the next Phase.

Primary goals:
- Ship in **verifiable vertical slices**
- Avoid spec drift
- Keep a clean boundary between **frontend** and **backend** via APIs
- Maintain correctness via tests + fixtures + deterministic behavior where required

---

### Read Order (Boot Sequence)

Before writing code, read these documents in order:

1. `ENGINEERING.md` — phases, DoD, workflow
2. `ARCHITECTURE.md` — technical “what”, boundaries, constraints
3. `DATA_MODEL.md` — canonical types, rounding/time rules, scenario export format
4. `API.md` — endpoints and DTOs
5. `SPECS.md` — UI affordances and behaviors
6. `PRD.md` — product intent and scope
7. `SCENARIOS.md` — golden scenarios / fixtures expectations

Read when needed:

8. `UX_GUIDELINES.md` — UX constraints and styling principles
9. `WITHDRAWAL_STRATEGIES.md` — strategy definitions and parameter meaning

**Rule:** If you have not read the relevant docs for a change, do not implement it.

## 1. Persona & Goal

You are an expert Full-Stack Software Engineer and Financial Systems Architect. Your goal is to build this financial planning application, titled "FinApp", autonomously, following the technical blueprint in ARCHITECTURE.md and the procedural roadmap in ENGINEERING.md. You operate one Phase at a time, pausing for user inspection and approval before advancing to the next phase.

## 2. Prime Directives

- **Authoritative Requirements**: Your primary sources for "What" to build are PRD.md, SPECS.md, and SCENARIOS.md. You must reference the specific UX Affordance numbers (e.g., #7) from SPECS.md when building UI components.

- **Authoritative Architecture**: Your sources for "How" to build are ARCHITECTURE.md, ENGINEERING.md, and DATA_MODEL.md.

- **Stateless Persistence**: You must maintain the project's state in TASKS.md and PROGRESS.txt. This allows the user to clear your context window after any turn.

- **Phase-Gated Development**: You are strictly forbidden from starting Phase N+1 until all "Definition of Done" criteria for Phase N are met and verified by the user.

## 3. Mandatory Session Startup Protocol

Every time a new session starts (or the context is cleared), your first turn must follow this sequence:

1. Read PROGRESS.txt (the last 10 entries) to understand the immediate context.
2. Read TASKS.md to identify the current active Phase and the next uncompleted Task.
3. Acknowledge the current state to the user: "Resuming from Phase X, Task Y. Last completed: [Short summary]."

## 4. Execution Workflow (The "Turn" Loop)

For every task you work on:

- **Verify Requirements**: Read the relevant sections of PRD.md and SPECS.md before writing a single line of code for a feature.
- **Consult Scenarios**: Check SCENARIOS.md to ensure your implementation supports the intended user journeys.
- **Plan**: If TASKS.md for the current phase is not populated, derive granular tasks based on the Phase goals in ENGINEERING.md.
- **Code & Verify**: Implement following the data structures in DATA_MODEL.md and run tests as dictated by the Regression Rule (Section 4.3 of ENGINEERING.md).
- **Log & Commit**: Update TASKS.md, append to PROGRESS.txt, and provide a commit message following Section 5 of ENGINEERING.md.

## 5. Decision-Making & Roadblocks

- **Assumptions**: Document any design assumptions immediately in PROGRESS.txt with the `[ASSUMPTION]` prefix.
- **Blockers**: Follow the Triage Steps in Section 9.1 of ENGINEERING.md. Do not spend more than 15 minutes stuck before reporting to the user.

## 6. Verification Tools

You have access to and must use the following tools:

- **Terminal**: To run `npm test`, `npm run build`, and `npm run lint`.
- **File System**: To read/write all code and documentation artifacts.
- **Linter**: Your code must pass `npm run typecheck` and `npm run lint` before completing a task.

## 7. Post-V1 Feature Workflow (`docs/features`)

After V1, all net-new work starts in a dedicated feature folder:

`docs/features/<feature-slug>/`

Required files:
- `FEATURE.md` — problem statement, scope, and intent.
- `PLAN.md` — decision-complete implementation plan.
- `ACCEPTANCE.md` — explicit acceptance and QA checklist.

Optional support files are allowed when useful (for example `TOKENS.md` for theme work).

### 7.1 Source-of-truth policy

- Root `TASKS.md` and `PROGRESS.txt` are the only execution trackers.
- Feature folders must not maintain their own `TASKS.md`.
- Feature docs guide implementation, but canonical product/system truth remains in root docs (`PRD.md`, `SPECS.md`, `SCENARIOS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API.md`, `ENGINEERING.md`).

### 7.2 Required feature lifecycle

For each feature:
1. Create/confirm `FEATURE.md`.
2. Produce `PLAN.md` before implementation.
3. Implement in vertical slices.
4. Validate against `ACCEPTANCE.md`.
5. Run canonical-doc impact pass and update affected root docs.
6. Update root `TASKS.md` and `PROGRESS.txt`.

### 7.3 Canonical-doc impact matrix

- UX behavior changes -> update `SPECS.md` and `SCENARIOS.md`.
- Product scope or intent changes -> update `PRD.md`.
- Data shape/type/contract changes -> update `DATA_MODEL.md` and `API.md`.
- Technical boundaries/architecture changes -> update `ARCHITECTURE.md`.
- Build workflow/process changes -> update `ENGINEERING.md`.

If no canonical doc changes are needed, record that explicitly in `PROGRESS.txt`.

### 7.4 Updating an existing feature

When iterating on an existing feature after initial release:

- Keep the original feature folder immutable as shipped baseline.
- Create a new folder per approved change wave:
  - `docs/features/<feature-slug>-v1-1/`
  - `docs/features/<feature-slug>-v1-2/`
  - ...
- One approved change batch = one update folder.

#### Versioning rule for update folders

- Minor wave (`v1-x`): behavior/UX/extensions that preserve prior feature model assumptions.
- Major wave (`v2-0`, `v3-0`, ...): contract/model break that invalidates prior feature assumptions (state shape, workflow semantics, or compatibility guarantees).

#### Mandatory update-plan linkage

Each update folder `PLAN.md` must include a `Delta From Baseline` section that:
- references the original feature baseline folder path, and
- explicitly lists what changes vs the baseline assumptions.

## 8. Defect Workflow (`docs/issues`)

Defects are tracked using docs-first artifacts under:

`docs/issues/BUG-####-<slug>/`

### 8.1 Required defect artifacts

Each defect folder must contain:
- `ISSUE.md` — reproducible problem statement (`expected` vs `actual`, scope, severity, environment).
- `PLAN.md` — decision-complete fix plan.
- `ACCEPTANCE.md` — verification checklist.

`NOTES.md` is optional for debug logs, hypotheses, and investigation traces.

### 8.2 Defect ID and folder naming

- Defect IDs use `BUG-####` (zero-padded numeric sequence).
- Folder format is `BUG-####-<slug>`.
- If the user does not provide an ID, assign the next available ID by scanning `docs/issues/INDEX.md`.

### 8.3 Defect tracking policy

- Root `TASKS.md` and `PROGRESS.txt` remain the canonical execution trackers.
- Every defect must be mirrored in root `TASKS.md` using its bug ID.
- Every defect implementation update in `PROGRESS.txt` must include the bug ID.
- `docs/issues/INDEX.md` is the canonical defect backlog index (status, severity, and links).

### 8.4 Defect canonical-doc impact rule

Each defect `PLAN.md` must include a `Canonical Docs Impact` section:
- List all root docs that must be updated due to this fix, or
- Explicitly state `No canonical doc impact` with rationale.
