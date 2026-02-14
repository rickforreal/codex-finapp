# Specs
## Page-Level Controls
These sit at the very top of the page, acting as the global "command bar" for the app. They're always visible regardless of scroll position.

### Affordance #1: Mode Toggle (Planning / Tracking)

**Purpose:**  Switches the output view between a pure projection (Planning) and an actuals-plus-projection view (Tracking). Shares all configuration inputs; only the output area changes.

**Control type:** Segmented toggle (two segments: "Planning" and "Tracking")

**Appearance:**
* Horizontal segmented control, pill-shaped, with two options: Planning and Tracking
* The active segment has a solid filled background (e.g., dark navy or the app's primary color) with white text. The inactive segment has a transparent background with muted text.
* Width: fixed, roughly 240px total (120px per segment). Height: ~36px.
* Positioned top-left of the command bar (or centered if the command bar has few other elements).
* Transition: when switching, the filled background slides smoothly from one segment to the other (200ms ease-in-out).

**Behavior:**
* Default state on app load: Planning
* Switching modes does not change any input panel values. All configuration (withdrawal strategy, return assumptions, spending phases, etc.) is shared between modes.
* Switching to Planning Mode: Displays the results of the last simulation run (Manual or Monte Carlo). If no simulation has been run yet, the output area shows an empty/initial state (see Affordance #3  for details). No automatic recalculation occurs on mode switch.
* Switching to Tracking Mode: Displays actuals plus re-forecast. Re-forecasting in Tracking Mode is reactive — editing an actual value immediately recalculates future projected months using the current configuration. This is the only context in the app where changes trigger automatic recalculation.

**State:**
* Stores a simple enum: "planning" | "tracking"
* Actuals data (the user's inline edits in the table) are stored in a separate data structure that persists regardless of which mode is active.

**Edge cases:**
* If the user has never entered any actuals and switches to Tracking Mode, it behaves identically to Planning Mode (all rows are projected). No error or warning — it's a valid state.

### Affordance #2: Simulation Mode Selector
**Purpose:** Selects which simulation engine powers the Planning Mode projection — Manual (user-defined parameters, single stochastic path) or Monte Carlo (historical data sampling, 1,000+ paths).

**Control type:** Segmented toggle (two segments: "Manual" and "Monte Carlo")

**Appearance:**
* Horizontal segmented control, pill-shaped, same visual style as the Mode Toggle (#1) but smaller — roughly 200px total width, ~32px height — to establish visual hierarchy (this is a secondary control subordinate to the primary mode toggle).
* Active segment: solid filled background in a lighter or secondary shade of the app's primary color (distinguishing it from the Mode Toggle's darker fill). Inactive segment: transparent with muted text.
* Positioned to the right of the Mode Toggle in the command bar, with ~20px gap.
* Same slide animation as #1 (200ms ease-in-out).
* Visibility: **Visible in both Planning Mode and Tracking Mode.** The selector is always present in the command bar when the app is active. It controls which simulation engine runs regardless of the view mode.
* Label above or to the left (depending on space): "Simulation Type" in small muted text (~11px). Optional — can be omitted if the command bar is tight on space, since the segment labels are self-explanatory.

**Behavior:**
* Default state on app load: Manual
* Switching to Manual:
  * The Return Assumptions section in the sidebar (#11–#16) becomes visible and active (expected return + std. dev. for each asset class).
  * The Historical Era Selector (#11a, see below) is hidden.
  * The output area displays the results of the last Manual simulation run. If no Manual run has been performed, it shows the empty/initial state.
  * Previously computed Monte Carlo results are preserved in memory (not discarded) so the user can switch back without re-running.
* Switching to Monte Carlo:
  * The Return Assumptions section in the sidebar is hidden (or collapsed with a brief explanatory note: "Return assumptions are derived from historical data in Monte Carlo mode").
  * The Historical Era Selector (#11a) becomes visible.
  * The output area displays the results of the last Monte Carlo run. If none has been performed, it shows the empty/initial state.
  * Previously computed Manual results are preserved in memory.
* When in Tracking Mode:
  * **Manual selected:** Editing an actual value triggers an immediate deterministic re-forecast of all non-actual months (gap-fill and future projection). This is the reactive behavior previously described — fast, instant.
  * **Monte Carlo selected:** Editing an actual value triggers an immediate deterministic re-forecast of the non-actual months (same as Manual — the reactive path is always deterministic for responsiveness). However, the Monte Carlo results become **stale** (see Affordance #3 for stale behavior). The user must click "Run Simulation" to re-run the full Monte Carlo from the current position forward.
  * *This means the **reactive recalculation in Tracking Mode is always deterministic**, regardless of which simulation mode is selected. Monte Carlo is only executed on-demand via the button. This keeps the UI responsive — re-running 1,000 simulations on every keystroke would be impractical.*
* Switching modes in Tracking
  * **Switching from Manual to Monte Carlo in Tracking Mode:** the output area continues to show the current deterministic projection (actuals + forecast). The Monte Carlo results are empty until the user clicks Run Simulation. The Probability of Success card (#41) appears but shows "—" until a run completes.
  * **Switching from Monte Carlo to Manual:** the output area reverts to showing the deterministic single-path projection. Previously computed Monte Carlo results are preserved in memory.

**State:**
* simulationMode: "manual" | "monteCarlo"
* Each mode's last simulation results are stored independently.

### Affordance #3: Run Simulation Button

**Purpose:**  Triggers a simulation run in either Manual or Monte Carlo mode. This is the universal "go" button for Planning Mode.

**Control type:** Primary action button

**Appearance:**
* A solid filled button with the label "Run Simulation" and a small play icon (▶) to the left of the text.
* Uses the app's primary action color (e.g., solid navy or teal background, white text).
* Positioned immediately to the right of the Monte Carlo toggle.
* Size: auto-width based on label, ~36px height (matching the mode toggle height).
* Visibility: **Visible in both Planning Mode and Tracking Mode.** The button is always present in the command bar as the universal "execute simulation" trigger. 
* The button label remains "Run Simulation" regardless of which simulation mode is selected. The icon (▶) remains the same.

**Behavior:**
* On click in Planning Mode, Manual selected:
  * Runs a single stochastic simulation: for each month, draws a random return for each asset class from a normal distribution parameterized by the user's expected return and std. dev. inputs.
  * Executes the full retirement simulation (withdrawals, drawdown strategy, income events, expenses) using those random returns.
  * Produces a single projection path. Updates the chart (single line), table, and summary stats.
  * Speed: effectively instant for a single path. Button shows "Running..." briefly but the spinner will barely be visible. Still worth having for visual consistency with Monte Carlo mode.
* On click in Planning Mode, Monte Carlo selected:
  * Runs 1,000+ simulations: for each simulation, for each month, randomly samples a historical month's returns (all three asset classes together, preserving the cross-asset relationship for that month) from the selected era's dataset.
  * Each simulation executes the full retirement simulation with the sampled returns.
  * Produces percentile curves and probability of success. Updates the chart (confidence bands), table (shows median path), and summary stats.
  * Speed: may take a few seconds. Button shows "Running..." with spinner. Web worker recommended.
* **On click in Tracking Mode, Manual selected:**
  - Re-runs the deterministic stochastic simulation for all non-actual months.
  - For months with user-entered actuals: uses the actual values (locked).
  - For months before the last actual but without user edits: simulates using configured assumptions (random returns from the user-defined return/std. dev. parameters), producing a new random gap-fill path.
  - For months after the last actual: projects forward using the same random generation.
  - Updates the chart (single line with solid/dashed split), table, and summary stats.
  - This is useful because each click generates a *different* random gap-fill and projection (since Manual mode is stochastic). The user can click repeatedly to see different possible outcomes from their current position.
* **On click in Tracking Mode, Monte Carlo selected:**
  - Runs 1,000+ Monte Carlo simulations.
  - For months with user-entered actuals: all simulations use the same actual values (locked, identical across all runs).
  - For gap-fill months (past months without actuals): each simulation generates its own random path using historical sampling from the selected era.
  - For future months: each simulation continues with independent historical sampling.
  - Produces confidence bands and probability of success *from the current position forward*.
  - Updates the chart: solid line for actuals, confidence bands fanning out from the "today" marker (or from Month 1 if there are gap months before the first actual).
  - The summary stats for the projected portion reflect the Monte Carlo distribution.
  - Clears the "stale" indicator (if any).  
* Initial state (no simulation run yet):
  * When the app first loads, no simulation has been run. The output area (chart, table, summary stats) shows an empty initial state:
    * Chart: empty plot area with axes but no data lines. A centered message in muted text: "Configure your parameters and click Run Simulation to generate a projection."
    * Table: empty with column headers visible but no rows.
    * Summary stats: all cards show "—".
  * This state persists until the user clicks the button for the first time.
* Initial State in Tracking Mode:
  * When the user first switches to Tracking Mode (or is in Tracking Mode on app load), the Run Simulation button is in its normal "ready" state. No simulation needs to be run for the deterministic projection to appear — it's computed reactively. The button is relevant in Tracking Mode primarily for:
    * 1. Re-rolling the stochastic gap-fill in Manual mode (getting a different random path).
    * 2. Running Monte Carlo from the current position.
* **Stale behavior:**
  * When the user edits an actual cell in the table while Monte Carlo results exist, the Monte Carlo results become stale. The deterministic projection updates reactively (as always in Tracking Mode), but the confidence bands, percentile data, and Probability of Success are now based on outdated actuals.
  * **Visual indicator:** The Run Simulation button gains a small orange dot badge (top-right corner of the button, ~8px diameter) to signal "your Monte Carlo results are out of date — re-run to update."
  * The confidence bands on the chart become semi-transparent (~40% of their normal opacity) and a small banner appears below the chart: _"Monte Carlo results are based on previous actuals. Click Run Simulation to update."_ — muted text, ~11px, with a small warning icon (⚠).
  * The Probability of Success card (#41) dims slightly and its value gains a small "stale" annotation: the value text drops to ~60% opacity and a tiny "⚠" icon appears next to the percentage.
  * **Clearing stale state:** Clicking Run Simulation re-runs the Monte Carlo with the updated actuals, clears the badge, restores full opacity to the bands and PoS card, and removes the banner.
  * This stale mechanism exists **only** for Monte Carlo in Tracking Mode. It does not apply to:
    * Planning Mode (either Manual or Monte Carlo) — there's no reactive recalculation, so staleness isn't a concept.
    * Manual in Tracking Mode — the deterministic re-forecast is instant and always current.

**State:**
* simulationStatus: "idle" | "running" | "complete"
* manualSimulationResults: the single-path data from the last Manual run (or null)
* monteCarloSimulationResults: the percentile/distribution data from the last Monte Carlo run (or null)

**Edge cases:**
* If the simulation takes longer than 5 seconds, show an additional message below the button: "This may take a moment for long retirement periods." (480 months × 1,000 runs = 480,000 monthly calculations — should be fine in a web worker, but worth the fallback UX.)

### Affordance #60: Actuals Watermark Indicator

**Purpose:**  In Tracking Mode, tells the user at a glance how far their actual data extends, so they know where reality ends and projection begins.

**Control type:** Read-only informational label

**Appearance:**
* A small, understated label positioned in the command bar, right-aligned (or far right of the bar).
* Text format: Actuals through: March 2027 — or No actuals entered if none exist.
* Typography: smaller than the main controls (~13px), muted color (e.g., medium gray), with a small calendar or pin icon to the left of the text.
* Visibility: Only visible when the mode is Tracking. Fades in/out smoothly (150ms) when switching modes.

**Behavior:**
* Automatically updates whenever the user edits or clears an actual value in the table. The "through" date is determined by the latest month that has any user-entered actual value (either a portfolio start value or a withdrawal amount).
* If the user clears all actuals from a month, the watermark recedes to the previous month with data.
* If no actuals exist, displays "No actuals entered" in an even more muted/italic style.
* Not interactive — purely informational. No click behavior.

**State:**
* Derived from the actuals data store: scans for the latest month with any user-entered value.

### Affordance #61: Clear Actuals Button
**Purpose:**  Allows the user to wipe all entered actual values from Tracking Mode and start fresh. This is a destructive action.

**Control type:** Tertiary/ghost button with confirmation

**Appearance:**
* A small text-style button (no background fill, just text + icon): Clear Actuals with a small trash/eraser icon.
* Positioned in the command bar near the Actuals Watermark Indicator (to its left).
* Text color: muted red or muted gray. On hover: slightly more prominent (darker text, faint red background).
* Visibility: Only visible when mode is Tracking AND at least one actual value exists. Otherwise hidden (space collapses).
* Size: compact, ~28–32px height, auto-width.

**Behavior:**
* On click: Opens a confirmation dialog (modal or inline popover):
    * Title: "Clear all actuals?"
    * Body: "This will remove all manually entered portfolio values and withdrawals. Your configuration and projections will not be affected."
    * Two buttons: Cancel (secondary/outline) and Clear (solid red/destructive).
* On confirm: All actual values are wiped from the actuals data store. The table reverts to fully projected values. The Actuals Watermark updates to "No actuals entered." The chart removes the solid/dashed distinction and shows a clean projection.
* On cancel: Dialog closes, nothing changes.

**State:**
* No unique state — it operates on the actuals data store and triggers a re-render.

### Affordance #62 · Undo Button

| Attribute | Detail |
|---|---|
| **Type** | Icon button (↶ arrow) |
| **Location** | Application toolbar, grouped with Redo button |
| **Behavior** | Reverts the most recent state change. Each click steps back one change in the history stack (max depth: 100). |
| **Disabled state** | Disabled when history stack is empty (no changes to undo) or immediately after a fresh load/snapshot restore. |
| **Scope** | Captures all user-initiated input changes: field edits, dropdown selections, adding/removing phases, income events, expense events, strategy changes, and Tracking Mode actual edits. Does **not** capture simulation runs, chart interactions (zoom/pan), or table view toggles. |
| **Keyboard shortcut** | `Ctrl+Z` / `Cmd+Z` |
| **Tooltip** | "Undo last change (Ctrl+Z)" |
| **Interaction with Run** | Undo reverts inputs only. If a simulation has been run, the output area remains showing the last run's results (which may now be stale relative to the reverted inputs). In Tracking Mode, undo of an actual triggers immediate re-forecast as usual. |

### Affordance #63 · Redo Button

| Attribute | Detail |
|---|---|
| **Type** | Icon button (↷ arrow) |
| **Location** | Application toolbar, immediately right of Undo button |
| **Behavior** | Re-applies the most recently undone change. Each click steps forward one change. |
| **Disabled state** | Disabled when there are no undone changes to redo. Any new user-initiated change after an undo clears the redo stack (standard behavior). |
| **Keyboard shortcut** | `Ctrl+Shift+Z` / `Cmd+Shift+Z` (also `Ctrl+Y` / `Cmd+Y`) |
| **Tooltip** | "Redo (Ctrl+Shift+Z)" |
| **Interaction with Run** | Same as Undo — reverts/reapplies inputs; output may become stale. |

### Affordance #64 · Save Snapshot

| Attribute | Detail |
|---|---|
| **Type** | Button with icon (💾 or download icon) labeled "Save Snapshot" |
| **Location** | Application toolbar, right of Undo/Redo group, visually separated |
| **Behavior** | Opens a small modal/popover with a text field for the snapshot name (pre-filled with a default: `"Snapshot — {date} {time}"`). On confirm, serializes the complete application state to a JSON file and triggers a browser download. |
| **State captured** | All input panel values, all spending phases, all income/expense events, withdrawal strategy + parameters, drawdown strategy + parameters, stress test configuration, Tracking Mode actuals (if any), current mode (Planning/Tracking), and simulation mode selection. Does **not** capture output/results, undo history, chart zoom state, or table view preferences. |
| **File format** | `.json` with a top-level schema version field for forward compatibility (e.g., `"schemaVersion": 1`). Human-readable (pretty-printed). |
| **File name** | Derived from user-provided snapshot name, sanitized for filesystem safety (e.g., `My Retirement Plan.json`). |
| **Validation** | Snapshot name is required; confirm button disabled if blank. Max name length: 100 characters. |
| **Keyboard shortcut** | `Ctrl+S` / `Cmd+S` (intercepts browser save) |
| **Tooltip** | "Save current state to file (Ctrl+S)" |

### Affordance #65 · Load Snapshot

| Attribute | Detail |
|---|---|
| **Type** | Button with icon (📂 or upload icon) labeled "Load Snapshot" |
| **Location** | Application toolbar, immediately right of Save Snapshot button |
| **Behavior** | Opens the browser's native file picker filtered to `.json` files. On file selection, parses the JSON, validates against the expected schema, and replaces the entire application state with the loaded values. |
| **Confirmation** | If the current state has unsaved changes (any input modified since last snapshot save or load), shows a confirmation dialog: *"Loading a snapshot will replace all current inputs. This cannot be undone. Continue?"* If no changes have been made, loads immediately. |
| **Post-load behavior** | Undo/redo history is cleared. The app is placed in whatever mode (Planning/Tracking) the snapshot was saved in. Output area is cleared — the user must click "Run Simulation" to see results (Planning Mode) or the re-forecast runs automatically (Tracking Mode, if actuals are present). |
| **Error handling** | If the file is not valid JSON or fails schema validation, shows an inline error toast: *"This file doesn't appear to be a valid snapshot."* State is not modified. If `schemaVersion` is higher than the app supports, shows: *"This snapshot was created with a newer version of the app and cannot be loaded."* |
| **Keyboard shortcut** | `Ctrl+O` / `Cmd+O` (intercepts browser open) |
| **Tooltip** | "Load state from file (Ctrl+O)" |

## Input Panel — Section: Core Parameters
This is the first section within the input panel (sidebar). It's expanded by default on app load.

### Section container UX:

**Section header:** "Core Parameters" in semi-bold, ~15px, with a subtle collapse/expand chevron to the right.
Clicking the header collapses/expands the section body with a smooth height animation (200ms ease-in-out).

**Default state:** expanded.
A thin 1px horizontal divider separates this section from the next section below it.

**Internal padding:** ~16px on all sides. Vertical spacing between controls: ~16px.

### Affordance #4: Starting Age

**Purpose:** Defines the user's age at the start of retirement. Used to label the "Age" column in the detail table and to anchor the timeline.

**Control type:** Dual-input — horizontal slider with a synchronized numeric input field

**Appearance:**
* Label: "Starting Age" — positioned above the control, left-aligned, ~13px, medium-weight, muted dark gray.
* Slider: full width of the section content area. Track is thin (4px), rounded, light gray for the unfilled portion, app accent color for the filled portion (left of thumb). Thumb: 16px circle, white fill with a subtle shadow.
* Numeric input: positioned to the right of the slider on the same row, right-aligned. Small fixed-width box (~56px wide), displaying the current value. Bordered, rounded corners (4px radius), ~32px height. Text is center-aligned within the box.
* Layout: label on its own row above; slider and numeric input on the row below, with the slider taking up ~75% of the width and the numeric input taking ~20%, with a small gap between.
* Unit suffix: "years" displayed as a small muted label to the right of the numeric input (or inside it as a suffix if space permits).

**Behavior:**
* Range: 30 to 85, step: 1
* Default value: 55
* Dragging the slider updates the numeric input in real time. Typing in the numeric input updates the slider position on blur or Enter.
* If the user types a value outside the range, it clamps to the nearest bound on blur and briefly flashes the input border in a warning color (amber, 300ms fade) to indicate clamping occurred.
* Impact to the rest of the app:
  * Changes update any dependent UI elements within the input panel (e.g., computed helper labels, validation warnings on spending phases or glide path waypoints). The main output area (chart, table, summary stats) is not recalculated — it continues to display the results of the last simulation run until the user clicks "Run Simulation" again.

**State:**
* startingAge: integer

**Edge cases:**
* None significant. This is a simple labeling input.

### Affordance #4c: Retirement Start Date

**Purpose:** Anchors Month 1 of the retirement timeline to a real calendar month and year. Used to display calendar dates in Tracking Mode's Period column, compute age-at-date helper labels, and determine which months are "in the past" (eligible for actual data entry in Tracking Mode).

**Control type:** Month/Year picker

#### Appearance

- Positioned in the **Core Parameters** section of the input panel, between Starting Age (#4) and Retirement Duration (#5). The ordering is now: Starting Age → Retirement Start Date → Retirement Duration → Inflation Rate → Withdrawals Start At.
- Same compact month/year picker as used in Income/Expense events (#27d): displays `MMM YYYY` format (e.g., `Jan 2028`), ~130px wide, ~32px height, bordered, rounded corners (4px).
- Label above: "Retirement Starts" — ~13px, medium-weight, muted dark gray.
- No slider — a date is not a sliding-scale value. Just the picker input.

#### Behavior

- Default value: **The current month and year** (e.g., if today is February 2026, default is `Feb 2026`).
- Valid range: **Jan 2000 to Dec 2080**. The wide range accommodates both users who retired years ago (and want to backfill actuals) and users planning far into the future.
- On selection, the picker panel closes. All helper labels throughout the app that reference calendar dates (e.g., "Month 13 = January 2029 (age 56)" on the Withdrawals Start At field, "Month X of retirement (age XX)" on income/expense events) update reactively.
- **Impact on Tracking Mode:** This date determines which months are "in the past" and therefore eligible for actual data entry. Specifically, any month whose calendar date is ≤ the current real-world date is eligible. Months in the future are projection-only.
- No output recalculation until Run Simulation (Planning Mode). In Tracking Mode, changes re-anchor the timeline — actual data remains associated with its month index (not its calendar date), so changing the start date shifts which calendar dates appear but doesn't discard actuals.

#### State

- `retirementStartDate`: `{ month: number, year: number }` (e.g., `{ month: 1, year: 2028 }`)
- Derived: `calendarDateForMonth(m)` = retirementStartDate + (m − 1) months.


### Affordance #5: Retirement Duration (Years)

**Purpose:** Defines how many years the retirement simulation covers. Determines the total number of months (duration × 12) in the projection.

**Control type:** Dual-input — horizontal slider with a synchronized numeric input field (same pattern as #4)

**Appearance:**
* Label: "Retirement Duration" — same styling as #4.
* Identical layout to #4: slider + numeric input on one row.
* Unit suffix: "years" to the right of the numeric input.
* Below the slider/input row, a computed helper label in small muted text (~11px, italic): "40 years = 480 months (age 55–95)" — dynamically updates based on the current values of both Starting Age (#4) and Retirement Duration (#5). This gives the user an at-a-glance sense of the timeline without mental math.

**Behavior:**
* Range: 5 to 50, step: 1
* Default value: 40
* Slider/input sync behavior identical to #4.
* Clamping behavior identical to #4.
* Impact on the rest of the app:
  * Spending phases validation: If the user reduces the duration such that an existing spending phase's end year exceeds the new duration, that phase's end year is automatically clamped to the new duration. If a phase's start year now exceeds the duration, that phase is flagged with a validation warning (red border on the phase card, tooltip: "This phase starts after the retirement period ends"). The phase is not auto-deleted — the user must fix or remove it manually.
  * Glide path validation: Similarly, any glide path waypoint with a year exceeding the new duration is flagged with a warning.
  * Income/Expense events: Any event with a start or end date falling after the new retirement end date is flagged (not auto-deleted).
  * Withdrawals Start At (#7): If the "Withdrawals Start At" month exceeds the new total months, it clamps to the new maximum and shows the clamping flash.
  * Changes update any dependent UI elements within the input panel (e.g., computed helper labels, validation warnings on spending phases or glide path waypoints). The main output area (chart, table, summary stats) is not recalculated — it continues to display the results of the last simulation run until the user clicks "Run Simulation" again.

**State:**
* retirementDurationYears: integer
* Derived: totalMonths = retirementDurationYears × 12

**Edge cases:**
* Very short durations (5 years = 60 months) should still render a usable chart and table. The chart should have enough x-axis ticks to be readable.
* Very long durations (50 years = 600 months) — the monthly table view will have 600 rows. The annual view toggle becomes especially useful here. No performance concern for the deterministic case, but Monte Carlo at 600 months × 1,000 runs should still be manageable in a web worker.


### Affordance #6: Expected Inflation Rate (%)

**Purpose:** Defines the annual inflation rate used to adjust spending bounds, income events, expenses, and the real-vs-nominal conversion throughout the app.

**Control type:** Dual-input — horizontal slider with a synchronized numeric input field (same pattern as #4 and #5)

**Appearance:**
* Label: "Expected Inflation Rate" — same styling as above.
* Identical layout: slider + numeric input on one row.
* Unit suffix: "%" inside or to the right of the numeric input.
* Below the slider/input row, a computed helper label in small muted text: "$1,000 today ≈ $XXX in 40 years" — dynamically computes the inflation-eroded value of $1,000 over the current retirement duration, giving the user a visceral sense of inflation's impact. Updates whenever either inflation rate or retirement duration changes.

**Behavior:**
* Range: 0.0% to 10.0%, step: 0.1%
* Default value: 3.0%
* Slider/input sync behavior identical to #4.
* The numeric input accepts one decimal place. If the user types more precision (e.g., 3.25%), it rounds to the nearest 0.1% on blur.
* Clamping behavior identical to #4 for out-of-range values.
* No recalcuation on changes in Manual mode

**State:**
* expectedInflationRate: float (stored as decimal, e.g., 0.03 for 3.0%)

**Edge cases:**
* At 0% inflation, real and nominal values are identical throughout. The real/nominal toggle on the chart still works but produces the same line. No special handling needed — this is valid and some users may want to see an inflation-free scenario.
* At 10% inflation over 50 years, dollar values become extreme. The app should use appropriate number formatting (e.g., $1.2M rather than $1,200,000) to keep the table and chart readable.


### Affordance #7: Withdrawals Start At (Month)

**Purpose:** Defines the month during retirement when the user begins making withdrawals from their portfolio. All months before this point have zero withdrawals — the portfolio grows (or shrinks) based on market returns and any income/expense events only. This models the common scenario where a retiree lives off other income sources (part-time work, severance, bridge income) in the early part of retirement.

**Control type:** Dual-input — horizontal slider with a synchronized numeric input field (same pattern as above)

**Appearance:**
* Label: "Withdrawals Start At" — same styling as above.
* Identical layout: slider + numeric input on one row.
* Unit suffix: "month" (or "months") to the right of the numeric input.
* Below the slider/input row, a computed helper label in small muted text: "Month 13 = January 2028 (age 56)" — dynamically computed from the starting age, an assumed or configured retirement start date, and the current value. This contextualizes the abstract month number into a real date and age.
* Note: This helper implies we need a retirement start date to anchor month 1 to a calendar date. This could either be a separate input (a month/year picker, defaulting to the current month), or we simply derive it from the current date. I'd recommend adding a small month/year picker labeled "Retirement Starts" immediately above the Starting Age control — but we can address this as a minor addition. For now, the helper can use the current date as the anchor.

**Behavior:**
* Range: 1 to [totalMonths] (dynamically bound to the retirement duration). Step: 1.
* Default value: 1 (withdrawals begin immediately)
* Slider/input sync behavior identical to #4.
* Clamping: if the user types a value greater than totalMonths, clamp to totalMonths with the standard amber flash. If they type 0 or negative, clamp to 1.
* Impact on the rest of the app:
  * No recalcuation on changes in Manual mode
  * For all months before the withdrawals start month:
    * The withdrawal strategy is not invoked. Withdrawal columns in the table show $0 (or a dash).
    * The portfolio still experiences market returns, income events, and expense events during these months.
    * In the table, these "no-withdrawal" months could have a subtle visual indicator — e.g., the withdrawal cells are lightly grayed out or show a small "deferred" icon.
  * For all months from the withdrawals start month onward:
    * The withdrawal strategy operates normally, subject to spending phase bounds.
  * Spending phase interaction: Spending phases define bounds on withdrawals. In months before the withdrawal start, spending phases are irrelevant (no withdrawals occur). The spending phase timeline still runs from year 1, but the bounds only take effect once withdrawals begin. No special configuration needed — the logic simply skips withdrawal calculation for pre-start months.
  * Chart impact: The portfolio chart may show a period of growth (or stability) before withdrawals begin, followed by the expected drawdown curve. This should be visually self-evident without special annotation, though the "today" marker in Tracking Mode and the deferral period will be naturally visible.

**State:**
* withdrawalsStartMonth: integer (1-indexed, where 1 = the first month of retirement)

**Edge cases:**
* If set to the last month (e.g., month 480), the user gets only one month of withdrawals. This is valid — the app should handle it without errors, though the summary stats will be based on a single withdrawal.
* If set to 1 (default), behavior is identical to not having this feature — withdrawals happen from the start. No special handling needed.
* If the retirement duration changes and the current value exceeds the new totalMonths, the value clamps automatically (per clamping rules above).

### Section-level interaction note: 
All four controls in this section follow the same visual pattern (label → slider + numeric input → optional helper text), creating a consistent rhythm. The helper labels beneath #5, #6, and #7 provide progressive contextual insight without cluttering the interface — they answer the question "what does this number actually mean in practice?" at a glance.

## Input Panel — Section: Starting Portfolio
This section lets the user define their portfolio composition at the start of retirement across three fixed asset classes. It sits directly below Core Parameters in the sidebar.

### Section container UX:
* Section header: "Starting Portfolio" — same styling conventions as Core Parameters (semi-bold, ~15px, collapse/expand chevron).
* Default state: expanded.
* Thin 1px divider above the header, separating from the previous section.
* Internal padding: ~16px. Vertical spacing between controls: ~12px (slightly tighter than Core Parameters since these are closely related inputs).

### Affordance #7: Stocks Starting Balance ($)

**Purpose:** Defines the dollar value held in stocks (equities) at the start of retirement.

**Control type:** Numeric input with currency formatting

**Appearance:**
* Label: "Stocks" — positioned to the left of the input on the same row, ~13px, medium-weight, muted dark gray. Accompanied by a small colored dot or swatch to the left of the label (e.g., a blue dot, ~8px diameter) that serves as the consistent color identifier for Stocks throughout the entire app (chart lines, table sub-columns, pie chart segment, etc.).
* Input field: right-aligned within the field, ~140px wide, ~36px height, bordered, rounded corners (4px radius). Displays value with dollar sign prefix and comma-separated thousands formatting (e.g., $1,000,000).
* Layout: each asset class occupies one row. Label + color dot on the left, input on the right, vertically centered on the row.

**Behavior:**
* Range: $0 to $99,999,999. Step: free-form (user types any whole dollar amount).
* Default value: $1,000,000
* On focus: The formatted display value strips down to a raw number for easier editing (e.g., $1,000,000 becomes 1000000 with the cursor at the end). The dollar sign remains as a static prefix inside the field (not part of the editable text).
* On blur / Enter: The value re-formats with commas and the dollar sign. If the user typed something non-numeric, the field reverts to the previous valid value and flashes amber briefly (300ms).
* On input (while typing): The total portfolio display (#10) and the mini donut chart update in real time as the user types, providing immediate visual feedback on how the allocation is shifting.
* Negative values are not accepted — if the user types a negative sign, it's ignored.
* Impact on the rest of the app:
  * The rebalancing strategy's target allocation visual (#25a) may show how far the starting portfolio deviates from the target — but this is a secondary display concern handled in that section's spec.

**State:**
* startingPortfolio.stocks: integer (dollars, no cents)

### Affordance #8: Bonds Starting Balance ($)

**Purpose:** Defines the dollar value held in bonds at the start of retirement.

**Control type:** Numeric input with currency formatting (identical pattern to #7)

**Appearance:**
* Identical layout and styling to #7, except:
* Label: "Bonds"
* Color dot: a distinct color from Stocks (e.g., green or teal dot, ~8px diameter). This color is used consistently for Bonds throughout the app.

**Behavior:**
* Range: $0 to $99,999,999. Step: free-form.
* Default value: $250,000
* All focus, blur, formatting, validation, and real-time update behaviors identical to #7.

**State:**
* startingPortfolio.bonds: integer

### Affordance #9: Cash Starting Balance ($)

**Purpose:** Defines the dollar value held in cash (or cash equivalents like money market funds) at the start of retirement.

**Control type:** Numeric input with currency formatting (identical pattern to #7 and #8)

**Appearance:**
* Identical layout and styling, except:
* Label: "Cash"
* Color dot: a third distinct color (e.g., amber/gold dot, ~8px diameter). Used consistently for Cash throughout the app.

**Behavior:**
* Range: $0 to $99,999,999. Step: free-form.
* Default value: $100,000
* All behaviors identical to #7 and #8.

**State:**
* startingPortfolio.cash: integer

### Affordance #10: Total Portfolio Display (with Mini Donut Chart)

**Purpose:** Shows the user the total starting portfolio value and its allocation breakdown at a glance. This is a computed display, not an input — it provides immediate visual confirmation that the individual balances make sense together.

**Control type:** Read-only composite display — a computed total with a mini donut chart

**Appearance:**
* Positioned directly below the three asset class inputs (#7, #8, #9), separated by ~16px of space.
* Left side: Mini donut chart
  * Diameter: ~64px. Ring thickness: ~12px (a donut, not a full pie — hollow center).
  * Three segments corresponding to Stocks (blue), Bonds (green/teal), Cash (amber/gold) — using the same colors as the dots on the input labels.
  * Segments are proportional to the dollar values. Smooth animated transitions (300ms ease) when any input value changes — segments grow/shrink fluidly.
  * Center of the donut: empty (white/background color), or optionally shows a tiny "100%" label.
  * If any asset class is $0, its segment simply doesn't appear (no zero-width sliver).
  * If all three are $0, show an empty ring in light gray with a subtle label "No funds."
* Right side: Text summary
  * Total line: "Total: $1,350,000" — semi-bold, ~15px, dark text. The dollar amount updates in real time.
  * Below the total, three rows in smaller muted text (~12px) showing the percentage breakdown:
    * Stocks: 74.1%
    * Bonds: 18.5%
    * Cash: 7.4%
  * Each percentage row is prefixed with the corresponding color dot (same as the input labels), reinforcing the color coding.
  * Percentages update in real time as inputs change. Show one decimal place. Must always sum to 100.0% (handle rounding so they don't show 99.9% or 100.1% — use largest remainder method).
* Overall layout: The donut and text summary sit side by side on the same row. Donut on the left, text on the right, vertically centered to each other.

**Behavior:**
* Purely computed — no user interaction on the donut or text (no click, no hover effects).
* Updates reactively in real time as any of #7, #8, or #9 changes, including while the user is actively typing.
* The animated donut transitions provide a satisfying micro-interaction that makes the app feel responsive and polished.
* If total portfolio is $0: Display "Total: $0" and the empty gray ring. All percentages show "0.0%". This is a valid state (the user might be in the middle of entering values), so no error or warning.

**State:**
* Derived:
  * totalPortfolio = stocks + bonds + cash
  * stocksPct = stocks / totalPortfolio * 100 (handle division by zero → 0%)
  * bondsPct = bonds / totalPortfolio * 100
  * cashPct = cash / totalPortfolio * 100

**Edge cases:**
* If one asset class dominates heavily (e.g., $10M stocks, $1K bonds, $0 cash), the donut will have a nearly-full segment and a sliver. This is fine visually — the donut handles small segments gracefully at 64px diameter.
* Very large totals (e.g., $50M+): the number formatting should use appropriate separators. At no point does the display switch to abbreviated format (e.g., "$50M") — always show the full formatted number in this section, since precision matters when the user is entering specific balances. Abbreviated formatting is reserved for the chart axes and table where space is constrained.

### Section-level design notes:
The three input rows (#7, #8, #9) form a tight visual group — same layout, same control type, same sizing — with the color dots creating a visual throughline that will persist across the entire app. The total display (#10) acts as a section "footer" that summarizes and validates the group. This pattern (individual inputs → computed summary) could recur in other sections if applicable.
**Color assignment convention established here:**
* Stocks: Blue (e.g., #4A90D9 or similar)
* Bonds: Teal/Green (e.g., #2EAD8E)
* Cash: Amber/Gold (e.g., #D4A843)

These three colors must be used consistently in every chart, table sub-column, donut, and breakdown display throughout the app. 

## Input Panel — Section: Return Assumptions
This section defines the expected return and volatility for each asset class. It sits directly below Starting Portfolio in the sidebar. It is only visible when Manual mode is selected. It is replaced by the Historical Data Summary section when Monte Carlo mode is selected. 

### Section container UX:
* Section header: "Return Assumptions" — same styling conventions (semi-bold, ~15px, collapse/expand chevron).
* Default state: expanded.
* Thin 1px divider above the header.
* Internal padding: ~16px. Vertical spacing between asset class rows: ~16px.

**Section layout strategy:** Rather than six separate controls stacked vertically (which would take a lot of space and feel repetitive), this section uses a compact table-like layout — three rows (one per asset class), with two columns of inputs per row. This groups related information tightly and makes the relationship between return and standard deviation immediately clear.

**Header row (column labels):**
* A non-interactive row above the three input rows that labels the two columns:
  * Left column header: "Expected Return" — small muted text (~11px), center-aligned over the return inputs.
  * Right column header: "Std. Dev." — small muted text (~11px), center-aligned over the std. deviation inputs. When Monte Carlo is off, this header appears dimmed (lower opacity, ~40%) to match the disabled state of its inputs below.
* When Simulation Mode is Manual: The section is visible and all six inputs are active. Std. deviation fields are always enabled (no longer tied to a Monte Carlo toggle — they're always relevant in Manual mode since it runs a stochastic simulation).
* When Simulation Mode is Monte Carlo: The entire section is hidden (collapsed with no header visible). In its place, a different display appears:

### Affordance #11: Stocks Expected Return (%)

**Purpose:** Defines the expected annual return for stocks, used in both deterministic projections (as the fixed return) and Monte Carlo simulations (as the mean of the return distribution).

**Control type:** Compact numeric input with percentage formatting

**Appearance:**
* Row layout: The row starts with the asset class color dot (blue, ~8px) and label "Stocks" (~13px, medium-weight) on the far left. To the right are two input fields side by side: the expected return input (#11) and the std. deviation input (#12).
* Input field: ~72px wide, ~32px height, bordered, rounded corners (4px). Text is right-aligned within the field. Displays value with one decimal place and a "%" suffix (e.g., 8.0%). The "%" is a static suffix inside the field, not part of the editable text.
* The return input has a very subtle left border accent in the Stocks color (blue, 2px) to visually tie it to the asset class.

**Behavior:**
* Range: -20.0% to 30.0%, step: 0.1%
* Default value: 8.0%
* On focus: The display value strips to a raw number for editing (e.g., 8.0 with cursor at end). The "%" suffix remains as static text.
* On blur / Enter: Re-formats with one decimal place and "%". Values outside the range clamp to the nearest bound with the standard amber flash (300ms).
* Negative returns are valid — the user may want to model a pessimistic scenario.

**State:**
* returnAssumptions.stocks.expectedReturn: float (stored as decimal, e.g., 0.08 for 8.0%)

### Affordance #12: Stocks Standard Deviation (%)
**Purpose:** Defines the annual standard deviation (volatility) of stock returns, used only in Monte Carlo simulations to model the spread of possible outcomes.

**Control type:** Compact numeric input with percentage formatting (identical pattern to #11)

**Appearance:**
* Sits immediately to the right of #11 on the same row, with ~8px gap between the two inputs.
* Same dimensions and styling as #11 (~72px wide, ~32px height, right-aligned, "%" suffix).

**Behavior:**
* Range: 0.0% to 50.0%, step: 0.1%
* Default value: 15.0%
* Focus/blur/formatting behavior identical to #11.
* Standard deviation cannot be negative — if the user types a negative value, it clamps to 0.0% on blur.

**State:**
* returnAssumptions.stocks.stdDeviation: float (stored as decimal, e.g., 0.15 for 15.0%)

### Affordance #13: Bonds Expected Return (%)
**Purpose:** Defines the expected annual return for bonds.

**Control type:** Compact numeric input with percentage formatting (identical pattern to #11)

**Appearance:**
* Second row of the table layout. Row starts with the Bonds color dot (teal/green, ~8px) and label "Bonds" on the left. Two inputs to the right: #13 and #14.
* Same dimensions and styling as #11. Left border accent is in the Bonds color (teal/green, 2px).

**Behavior:**
* Range: -10.0% to 20.0%, step: 0.1%
* Default value: 4.0%
* All focus, blur, formatting, clamping behaviors identical to #11.

**State:**
* returnAssumptions.bonds.expectedReturn: float

### Affordance #14: Bonds Standard Deviation (%)

**Purpose:** Defines the annual standard deviation of bond returns for Monte Carlo simulations.

**Control type:** Compact numeric input with percentage formatting (identical pattern to #12)

**Appearance:**
* Same row as #13, to its right. Same dimensions and styling as #12.
* Same conditional enable/disable behavior tied to the Monte Carlo toggle.

**Behavior:**
* Range: 0.0% to 30.0%, step: 0.1%
* Default value: 5.0%
* All behaviors identical to #12.

**State:**
* returnAssumptions.bonds.stdDeviation: float

### Affordance #15: Cash Expected Return (%)
**Purpose:** Defines the expected annual return for cash or cash equivalents.

**Control type:** Compact numeric input with percentage formatting (identical pattern to #11)

**Appearance:**
* Third row of the table layout. Row starts with the Cash color dot (amber/gold, ~8px) and label "Cash" on the left. Two inputs to the right: #15 and #16.
* Same dimensions and styling as #11. Left border accent is in the Cash color (amber/gold, 2px).

**Behavior:**
* Range: -5.0% to 15.0%, step: 0.1%
* Default value: 2.0%
* All behaviors identical to #11.

**State:**
* returnAssumptions.cash.expectedReturn: float

### Affordance #16: Cash Standard Deviation (%)
**Purpose:** Defines the annual standard deviation of cash returns for Monte Carlo simulations.

**Control type:** Compact numeric input with percentage formatting (identical pattern to #12)

**Appearance:**
* Same row as #15, to its right. Same dimensions and styling as #12.
* Same conditional enable/disable behavior tied to the Monte Carlo toggle.

**Behavior:**
* Range: 0.0% to 10.0%, step: 0.1%
* Default value: 0.5%
* All behaviors identical to #12.

**State:**
* returnAssumptions.cash.stdDeviation: float

### Section-Level Computed Display: Historical Context Helper
Below the three input rows, include a small contextual reference to help users sanity-check their assumptions.

**Appearance:**
A thin horizontal divider (~1px, very light gray) separates the inputs from this helper area.
* Small muted text (~11px), slightly italic:
  * Historical reference (approximate):
  * US Stocks: ~10% return, ~15% std. dev.
  * US Bonds: ~5% return, ~4% std. dev.
  * Cash/T-Bills: ~3% return, ~1% std. dev.

This is static text — it never changes. It's purely informational, giving the user a benchmark to compare their inputs against.
Displayed in a faint background card (e.g., very light blue-gray, 1px border, rounded corners) to distinguish it from the interactive inputs above.

**Behavior:**
* Non-interactive. No click, hover, or dynamic behavior.
* Collapses with the section when the section header is collapsed.

### Section-level design notes:
* The table-like layout (three rows × two columns of inputs) keeps this section compact despite having six numeric fields. The visual pattern is consistent: color dot → label → return input → std. dev. input, repeated three times. The column headers at the top and the historical reference at the bottom frame the section cleanly.
* The Monte Carlo–dependent dimming of the three std. dev. fields creates a clear visual signal about which inputs are "active." When the user toggles Monte Carlo on from the command bar, they'll see three fields in this section simultaneously animate from dim to active — a satisfying and informative moment that communicates "you now have more to configure."

## Input Panel — Section: Historical Data Summary 
When the user has selected Monte Carlo mode, this display replaces the Return Assumptions section to show what historical data is driving the simulation.

### Section container UX:
* Same position in the sidebar as the Return Assumptions section.
* Section header: "Historical Data" — same styling as other section headers.
* Default state: expanded.
* Content is a read-only summary card (light background, subtle border, rounded corners):
  * Title line: the currently selected era name and date range from the Historical Era Selector (Affordance #11a), e.g., "Full History (1926–2024)" — semi-bold, ~14px.
  * Below the Historical Era Selector, a compact three-row summary:

| Asset Class | Average Return | Standard Deviation | Sample Size |
|-------------|---------------|-------------------|-------------|
| Stocks | 10.2% | 15.3% | 1,188 months |
| Bonds | 5.1% | 4.2% | 1,188 months |
| Cash | 3.4% | 0.9% | 1,188 months |

  * Each row uses the standard asset class color dot. Values are computed from the actual historical dataset for the selected era.
  * The month count gives the user a sense of the sample size.

**Behavior:**
* Updates automatically when the Historical Era Selector (#11a) changes — since this is just reading from the bundled dataset, it's instant.
* Non-interactive (read-only). Collapses with section header.

**State:**
* Derived from the selected era and the bundled historical dataset.

### Affordance #11a: Historical Era Selector

**Purpose:** In Monte Carlo mode, lets the user choose which historical period to sample monthly returns from.

**Control type:** Dropdown select

**Appearance:**
* Positioned in the command bar, to the right of the Simulation Mode Selector (#2), with ~16px gap.
* Standard dropdown: ~200px wide, ~32px height (matching the Simulation Mode Selector height), bordered, rounded corners (4px), with a chevron on the right indicating it's a dropdown.
* Displays the currently selected era label (e.g., "Full History (1926–2024)").
* Visibility: Visible when Simulation Mode is Monte Carlo, regardless of whether the Mode Toggle is Planning or Tracking. 

**Dropdown options:**
| Label | Sampling Range |
|-------|---------------|
| Full History (1926–2024) | 1926–2024 |
| Depression Era (1926–1945) | 1926–1945 |
| Post-War Boom (1945–1972) | 1945–1972 |
| Stagflation Era (1966–1982) | 1966–1982 |
| Oil Crisis (1973–1982) | 1973–1982 |
| Post-1980 Bull Run (1980–2024) | 1980–2024 |
| Lost Decade (2000–2012) | 2000–2012 |
| Post-GFC Recovery (2009–2024) | 2009–2024 |

* Each option displays the label and date range. The dropdown menu is a standard styled list — no special formatting needed.
* Default selection: Full History (1926–2024)
* Behavior: Changing the selected era does not trigger a re-run of the simulation. The user must hit "Run Simulation" (#3) to execute with the new era. This is consistent with the "configure → run → review" workflow.
* The dropdown is a simple selection — no search, no multi-select.

**State:**
* selectedHistoricalEra: enum/string key identifying the era
* The app bundles a dataset of monthly returns (stocks, bonds, cash) from 1926–2024. Each era preset is just a filter on this dataset by date range.

**Edge cases:**
* Shorter eras (e.g., Oil Crisis: 1973–1982 = ~108 months) mean less data to sample from. For a 480-month retirement simulation, the same months will be sampled multiple times across the 1,000 runs — this is fine statistically (it's sampling with replacement) but worth noting: very short eras produce less diverse outcomes. No special UX handling needed, but the historical reference display (see Return Assumptions revision below) will show the sample size.

## Input Panel — Section: Spending Phases (#17, #18, #19)

This section allows the user to define one or more spending phases across their retirement period, each with its own minimum and maximum monthly withdrawal bounds. This models the well-documented "retirement spending smile" — higher spending in active early retirement, lower in the quiet middle years, and higher again late in life due to healthcare costs.

### Section Container

- **Section header:** "Spending Phases" — semi-bold, ~15px, with collapse/expand chevron.
- **Default state:** Expanded.
- **Thin 1px divider** above the header, separating from the previous section.
- **Internal padding:** ~16px. Vertical spacing between phase cards: ~12px.
- **Section helper text:** Immediately below the header (before the first phase card), a single line of small muted text (~11px): _"Define monthly spending bounds for each phase of retirement. All amounts are in today's dollars and adjust for inflation automatically."_

---

### Affordance #17: Spending Phase Card

**Purpose:** Each phase card defines a named time segment of retirement with its own minimum and maximum monthly spending bounds. The user can have 1–4 phases, and together they must cover the entire retirement duration with no gaps or overlaps.

**Control type:** A styled card container holding multiple sub-controls.

#### Card Appearance

- Each phase is rendered as a **card** with a subtle border (1px, light gray), rounded corners (8px), and a very light background fill (e.g., `#FAFAFA` or a barely-there tint of the app's primary color). This distinguishes each phase as a discrete unit within the section.
- **Card padding:** ~12px internal on all sides.
- **Card width:** Full width of the sidebar content area.
- Cards are stacked vertically with ~12px gap between them.
- Each card has a thin **left border accent** (3px) in a muted color that helps visually distinguish phases from each other. Use a small palette of 4 muted accent colors (e.g., slate blue, sage green, dusty rose, warm gray) assigned sequentially to phases 1–4. These colors are decorative only — they don't carry meaning elsewhere in the app.
- A **phase number badge** in the top-left corner of the card: a small circle (~20px diameter) with the phase number (1, 2, 3, 4) in white text on a background matching the card's left accent color. This provides quick visual orientation when multiple phases are present.

#### Card Layout (Internal)

The card's internal layout is organized in three rows:

##### Row 1: Phase Name + Remove Button

- **Left:** Phase Name input (#17a)
- **Right:** Remove Phase button (#19), right-aligned

##### Row 2: Year Range

- **Left:** Start Year display/input (#17b)
- **Center:** A thin horizontal line or arrow icon (→) connecting start and end, reinforcing the "range" concept
- **Right:** End Year input (#17c)

##### Row 3: Spending Bounds

- **Left:** Min Monthly Spend input (#17d) with label above
- **Right:** Max Monthly Spend input (#17e) with label above
- Both inputs sit side by side with ~12px gap

---

#### Affordance #17a: Phase Name

**Purpose:** A user-defined label for the phase, used for display and self-documentation.

**Control type:** Inline editable text field

**Appearance:**
- Renders as a semi-bold text label (~14px) by default, looking like static text rather than an input field. On hover, a subtle underline or faint border appears, indicating editability.
- On focus, it transitions to a standard text input with a visible border.
- Placeholder text (when empty): _"Phase name..."_ in muted italic.
- Width: fills available space on Row 1 (minus the remove button).

**Behavior:**
- Default values for auto-generated phases:
  - Phase 1: "Active Retirement"
  - Phase 2: "Mid Retirement"
  - Phase 3: "Late Retirement"
  - Phase 4: "Final Years"
- Max length: 30 characters. No validation beyond length — any text is valid.
- Purely cosmetic — the phase name has no impact on calculations. It appears in the chart tooltip and table if phases are annotated, but otherwise is for the user's own reference.

**State:**
- `spendingPhases[i].name`: string

---

#### Affordance #17b: Start Year

**Purpose:** Defines the first year of this phase within the retirement timeline.

**Control type:** Read-only computed display (for all phases except potentially the first, but in practice always read-only — see behavior)

**Appearance:**
- Displays as a compact label: "Year X" in medium-weight text (~13px), with a small muted sub-label below showing the corresponding age: "(age XX)" — computed from Starting Age + Start Year - 1.
- Not styled as an input field — no border, no hover state. Visually reads as a fixed label.

**Behavior:**
- **Phase 1:** Start year is always **1**. Cannot be changed.
- **Phase 2+:** Start year is always **previous phase's end year + 1**. Automatically computed. Cannot be changed by the user.
- This constraint ensures phases are always contiguous with no gaps. The user controls phase boundaries by adjusting the **end year** of the preceding phase — the next phase's start year follows automatically.

**State:**
- `spendingPhases[i].startYear`: integer (derived, not user-editable)

---

#### Affordance #17c: End Year

**Purpose:** Defines the last year of this phase within the retirement timeline.

**Control type:** Numeric input (small, compact)

**Appearance:**
- Compact numeric input: ~56px wide, ~32px height, bordered, rounded corners (4px). Text center-aligned.
- Label above: "End Year" in small muted text (~11px).
- Below the input, a small muted sub-label: "(age XX)" — computed from Starting Age + End Year - 1.

**Behavior:**
- **For the last phase:** The end year is always equal to the **retirement duration** and is **read-only** (displayed as a fixed label, same style as Start Year). This ensures the phases always cover the full retirement period.
- **For all other phases:** The end year is editable.
  - Minimum value: the phase's own start year (a phase must span at least 1 year).
  - Maximum value: retirement duration - (number of remaining phases after this one). This ensures each subsequent phase can have at least 1 year.
  - On blur/Enter: clamps to the valid range with the standard amber flash if out of bounds.
- **Cascade behavior:** Changing a phase's end year automatically updates the next phase's start year (which is always end year + 1). If this cascade causes a downstream phase to have a start year > its end year, that phase's end year is pushed forward to equal its start year (1-year minimum). This cascade continues through all subsequent phases. The last phase's end year remains pinned to the retirement duration.
- **Animation:** When a cascade occurs, the affected phase cards briefly highlight (a subtle pulse or background flash, 300ms) to draw the user's attention to the ripple effect.

**State:**
- `spendingPhases[i].endYear`: integer

**Edge cases:**
- If retirement duration is 5 years and there are 4 phases, each phase gets exactly 1 year (plus 1 extra year for one of them). The constraints above handle this — the cascade logic ensures no phase can be squeezed below 1 year.
- If the user changes the retirement duration (#5) such that the current phase configuration no longer fits, the cascade logic runs from the last phase backward: the last phase absorbs the change first (its end year is pinned to the new duration), and if its start year now exceeds its end year, the preceding phase's end year is reduced, and so on. If a phase is squeezed to zero width, it's flagged with a validation warning rather than auto-deleted.

---

#### Affordance #17d: Min Monthly Spend ($)

**Purpose:** Defines the floor for monthly withdrawals during this phase. The withdrawal strategy will never produce a withdrawal below this amount (inflation-adjusted). This represents the minimum the user needs to cover essential expenses.

**Control type:** Numeric input with currency formatting

**Appearance:**
- Label above: "Min / Month" in small muted text (~11px).
- Input field: ~110px wide, ~32px height, bordered, rounded corners (4px). Right-aligned text. Dollar sign ($) as a static prefix inside the field.
- Displays with comma-separated thousands formatting (e.g., `$4,000`).
- Below the input, a **computed helper label** in very small muted text (~10px): the inflation-adjusted value of this amount at the midpoint of the phase. E.g., _"≈ $5,840 in year 20"_ — giving the user a sense of what this floor translates to in nominal terms during the phase. Updates when inflation rate or phase year range changes.

**Behavior:**
- Range: **$0 to $100,000**. Step: free-form (whole dollars).
- Default value:
  - Phase 1: **$4,000**
  - Phase 2: **$3,000**
  - Phase 3: **$4,500**
  - Phase 4: **$4,000**
- Focus/blur formatting behavior: same as Starting Portfolio inputs (#7–#9). On focus, strips to raw number. On blur, re-formats with dollar sign and commas.
- **Validation:** Must be ≤ the Max Monthly Spend for the same phase (#17e). If the user enters a value greater than the current max, the field shows a red border with a tooltip: _"Minimum cannot exceed maximum."_ The value is accepted (not auto-clamped) to let the user fix whichever field they prefer — but the simulation will refuse to run (Run Simulation button shows a tooltip explaining the validation error).
- No impact on the output area until the next simulation run (Planning Mode) or immediately in Tracking Mode.

**State:**
- `spendingPhases[i].minMonthlySpend`: integer (today's dollars)

---

#### Affordance #17e: Max Monthly Spend ($)

**Purpose:** Defines the ceiling for monthly withdrawals during this phase. The withdrawal strategy will never produce a withdrawal above this amount (inflation-adjusted). This represents the user's comfortable upper bound on spending.

**Control type:** Numeric input with currency formatting (identical pattern to #17d)

**Appearance:**
- Label above: "Max / Month" in small muted text (~11px).
- Same dimensions and styling as #17d. Sits to the right of #17d on Row 3, with ~12px gap.
- Same computed helper label below: inflation-adjusted value at the phase midpoint.

**Behavior:**
- Range: **$0 to $500,000**. Step: free-form (whole dollars).
- Default value:
  - Phase 1: **$8,000**
  - Phase 2: **$5,000**
  - Phase 3: **$9,000**
  - Phase 4: **$7,000**
- Focus/blur formatting behavior: identical to #17d.
- **Validation:** Must be ≥ the Min Monthly Spend for the same phase (#17d). Symmetric red border + tooltip if violated: _"Maximum cannot be less than minimum."_
- Same recalculation rules as #17d.

**State:**
- `spendingPhases[i].maxMonthlySpend`: integer (today's dollars)

---

### Affordance #18: Add Phase Button

**Purpose:** Allows the user to add a new spending phase, up to a maximum of 4.

**Control type:** Secondary action button

**Appearance:**
- Positioned below the last phase card, left-aligned.
- Styled as a **ghost/outline button**: no background fill, a 1px dashed border in the app's primary color, text in the primary color. Icon: a small "+" to the left of the label.
- Label: "+ Add Phase"
- Size: auto-width, ~32px height.
- **When 4 phases exist:** The button is **hidden** (not disabled — fully hidden, space collapses). The maximum is enforced silently.

**Behavior:**
- **On click:**
  - A new phase card animates in below the existing cards (slide-down + fade-in, 200ms ease).
  - The new phase's start year = previous last phase's end year + 1. The previous last phase's end year becomes editable (it was previously read-only as the last phase).
  - The new phase's end year = retirement duration (it becomes the new last phase, so its end year is read-only and pinned).
  - The previous last phase's end year defaults to a reasonable split: if the remaining years (from its start to retirement end) are > 5, it gives at least 5 years to the new phase. Otherwise, it gives the new phase 1 year.
  - The new phase gets the next sequential default name and the next accent color from the palette.
  - Min/Max spending defaults for the new phase: copies the values from the previous last phase as a starting point.

**State:**
- No unique state — it modifies the `spendingPhases` array.

---

### Affordance #19: Remove Phase Button

**Purpose:** Allows the user to remove a spending phase. At least 1 phase must always exist.

**Control type:** Icon button (destructive)

**Appearance:**
- Positioned in the top-right corner of each phase card (Row 1, right-aligned).
- A small icon button: trash can or "×" icon, ~24px square, no background.
- Icon color: muted gray by default. On hover: muted red, with a faint red background circle appearing behind the icon.
- **When only 1 phase exists:** The button is **hidden** on that single card (the last remaining phase cannot be removed).

**Behavior:**
- **On click:** No confirmation dialog (phases are lightweight and easily re-added — a confirmation would add unnecessary friction). The phase card animates out (fade-out + collapse height, 200ms ease).
- **After removal:**
  - If the removed phase was **in the middle**, the next phase's start year snaps to the removed phase's start year (closing the gap). No cascade needed — the gap is absorbed by the phase that immediately follows.
  - If the removed phase was the **last phase**, the new last phase's end year becomes read-only and pins to the retirement duration.
  - If the removed phase was the **first phase**, the new first phase's start year becomes 1 (read-only).
  - The remaining phase cards re-number (badge updates) and re-color (accent colors reassign sequentially).

**State:**
- No unique state — it modifies the `spendingPhases` array.

**Edge cases:**
- Removing a phase in the middle of 4 phases: phases renumber 1-2-3, colors reassign, and the year ranges adjust to close the gap. This should feel seamless.
- Rapidly adding and removing phases: ensure the animations don't stack or conflict. If a new phase is being animated in while a remove is triggered, complete both animations cleanly.

---

### Section-Level Validation Summary

The spending phases section has a **global validation rule**: the phases must collectively cover years 1 through the retirement duration with no gaps and no overlaps. The constraints built into the affordances above (auto-computed start years, pinned first/last boundaries, cascade logic) make it **impossible** for the user to create an invalid phase configuration through normal interaction. This is by design — validation-by-construction is always better than validation-by-error-message.

The only validation that can fail is the per-phase min ≤ max spending check, which is handled with inline field-level errors as described in #17d and #17e.

---

### Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Edit a phase's end year | Next phase's start year auto-updates; cascade if needed |
| Edit min or max spend | Inline validation; no output recalculation until Run Simulation |
| Add a phase | New card animates in; previous last phase becomes editable |
| Remove a phase | Card animates out; adjacent phases absorb the year range |
| Change retirement duration (#5) | Last phase's end year adjusts; cascade backward if phases are squeezed |
| In Tracking Mode, any edit | Projected months re-forecast immediately |

# Input Panel — Section: Withdrawal Strategy (#20, #21, #22)

This section allows the user to select and configure a retirement withdrawal strategy — the algorithm that determines how much money is withdrawn from the portfolio each month (or year, annualized to monthly). Different strategies offer different trade-offs between spending stability, portfolio longevity, and responsiveness to market conditions.

## Section Container

- **Section header:** "Withdrawal Strategy" — semi-bold, ~15px, with collapse/expand chevron.
- **Default state:** Expanded.
- **Thin 1px divider** above the header.
- **Internal padding:** ~16px. Vertical spacing between controls: ~16px.

---

## Affordance #20: Strategy Selector

**Purpose:** Lets the user choose which withdrawal strategy governs how much is withdrawn each month.

**Control type:** Dropdown select

### Appearance

- **Label:** "Strategy" — positioned above the dropdown, ~13px, medium-weight, muted dark gray.
- Standard dropdown: full width of the sidebar content area, ~36px height, bordered, rounded corners (4px), with a chevron on the right.
- Displays the currently selected strategy name.
- The dropdown menu groups strategies into categories with small non-selectable category headers in muted uppercase text (~10px):

  ```
  ── BASIC ──
  Constant Dollar
  Percent of Portfolio
  1/N

  ── ADAPTIVE ──
  Variable Percentage Withdrawal (VPW)
  Dynamic SWR
  Sensible Withdrawals

  ── GUARDRAILS ──
  95% Rule
  Guyton-Klinger
  Vanguard Dynamic Spending

  ── ENDOWMENT & HYBRID ──
  Endowment Strategy
  Hebeler Autopilot II
  CAPE-Based
  ```

- Each strategy name in the dropdown is accompanied by a small colored tag to the right indicating its general character:
  - **Stable** (blue tag): strategies that prioritize spending stability
  - **Adaptive** (green tag): strategies that adjust significantly to market conditions
  - **Balanced** (amber tag): strategies that blend stability and adaptiveness
- Default selection: **Constant Dollar**

### Behavior

- Selecting a new strategy:
  - The Strategy-Specific Parameters panel (#21) transitions to show the parameters for the newly selected strategy. Use a crossfade animation (150ms): old parameters fade out, new parameters fade in.
  - The Strategy Info Tooltip (#22) updates its content.
  - No output recalculation — the user must click "Run Simulation" to see the effect of the new strategy.

### State

- `withdrawalStrategy.type`: enum string (one of the 12 strategy keys)

---

## Affordance #21: Strategy-Specific Parameters

**Purpose:** Each withdrawal strategy requires its own set of configuration inputs. This panel dynamically renders the correct inputs based on the selected strategy.

**Control type:** Dynamic sub-panel containing strategy-specific controls

### General Appearance

- Positioned directly below the Strategy Selector dropdown.
- Contained within a subtle inset card (very light gray background, e.g., `#F5F5F5`, 1px border, rounded corners 6px, ~12px internal padding).
- The card's top edge connects visually to the dropdown above, creating a "drawer" feel.
- All numeric inputs within this panel follow the same compact styling: ~72–90px wide, ~32px height, bordered, rounded corners 4px, right-aligned text.

### Shared Interaction Note

All parameter inputs follow the standard behavior:
- No output recalculation on change (Planning Mode). In Tracking Mode, changes re-forecast projected months immediately.
- Standard focus/blur formatting for percentage and currency fields.
- Out-of-range values clamp on blur with the amber flash (300ms).

---

### Strategy 1: Constant Dollar

**Description:** Withdraws a fixed dollar amount each year (set as a percentage of the initial portfolio), adjusted for inflation annually. The classic "4% Rule."

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-1a | Initial Withdrawal Rate (%) | Numeric input with % suffix | 1.0% – 10.0% | 0.1% | 4.0% | Applied to the starting portfolio value to determine the fixed annual withdrawal. Subsequent years adjust for inflation only. |

**Computed helper:** Below the input, display: _"= $X,XXX / year ($X,XXX / month)"_ — computed from the current starting portfolio value × the withdrawal rate. Updates reactively when either the rate or the starting portfolio changes.

**Algorithm summary (for tooltip #22):**
Year 1 withdrawal = Initial Portfolio × Withdrawal Rate. Each subsequent year, the withdrawal is the previous year's amount adjusted upward by inflation. The withdrawal never changes based on portfolio performance.

**Formula Reference:** See *Strategy 1* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 2: Percent of Portfolio

**Description:** Withdraws a fixed percentage of the current portfolio value each year. Highly responsive to market conditions but can produce volatile income.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-2a | Annual Withdrawal Rate (%) | Numeric input with % suffix | 1.0% – 15.0% | 0.1% | 4.0% | Applied to the current portfolio value at the start of each year. |

**Computed helper:** _"At current portfolio: $X,XXX / year ($X,XXX / month)"_

**Algorithm summary:**
Each year, withdrawal = Current Portfolio Value × Withdrawal Rate. The dollar amount rises and falls directly with the portfolio.

**Formula Reference:** See *Strategy 2* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 3: 1/N

**Description:** Divides the current portfolio value by the number of remaining years. Naturally increases the withdrawal rate over time, ensuring the portfolio reaches approximately $0 at the end.

**Parameters:**

No user-configurable parameters. Display an explanatory note instead:

> _This strategy requires no additional configuration. Each year's withdrawal is calculated as the current portfolio value divided by the number of remaining years. As the remaining years decrease, the withdrawal percentage naturally increases._

**Computed helper:** _"Year 1 withdrawal ≈ $X,XXX (1/N years of $X.XM)"_

**Algorithm summary:**
Year N withdrawal = Current Portfolio Value ÷ Remaining Years. In the first year of a 40-year retirement, withdrawal = Portfolio ÷ 40. In the last year, withdrawal = entire remaining portfolio.

**Formula Reference:** See *Strategy 3* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 4: Variable Percentage Withdrawal (VPW)

**Description:** Developed by the Bogleheads community. Uses the PMT (payment) financial function to calculate a withdrawal that accounts for portfolio balance, expected real return, and remaining time horizon. Withdrawal percentages increase over time, ensuring the portfolio is fully spent by the end of retirement.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-4a | Expected Real Return (%) | Numeric input with % suffix | 0.0% – 10.0% | 0.1% | 3.0% | The inflation-adjusted return assumption used in the PMT calculation. Typically a blended rate based on asset allocation. |
| 21-4b | Drawdown Target (%) | Numeric input with % suffix | 50% – 100% | 1% | 100% | What percentage of the portfolio should be spent over the retirement period. 100% = spend it all; lower values preserve a residual. |

**Computed helper:** _"Year 1 withdrawal rate ≈ X.X% ($X,XXX / year)"_ — computed using PMT(real return, remaining years, portfolio, target residual).

**Algorithm summary:**
Each year, withdrawal = PMT(expected_real_return, remaining_years, current_portfolio, -(1 - drawdown_target) × current_portfolio). The PMT function computes the level payment that, given the expected return and remaining years, would reduce the portfolio to the target residual (0 if drawdown is 100%). The percentage naturally increases as remaining years decrease.

**Formula Reference:** See *Strategy 4* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 5: Dynamic SWR

**Description:** Continuously annuitizes retirement savings based on remaining balance, life expectancy, and market expectations. By design, exhausts the portfolio in the final year.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-5a | Expected Rate of Return (%) | Numeric input with % suffix | 1.0% – 15.0% | 0.1% | 6.0% | Nominal expected portfolio return (roi in the formula). |

**Note:** The inflation rate is sourced from the Core Parameters section (#6). No need to duplicate it here.

**Computed helper:** _"Year 1 withdrawal ≈ $X,XXX"_ — computed using the formula below.

**Algorithm summary:**
Each year: Withdrawal = [Portfolio × (roi − inflation)] ÷ [1 − ((1 + inflation) / (1 + roi))^n], where n = remaining years. As n decreases, the withdrawal increases, exhausting the portfolio by the final year.

**Formula Reference:** See *Strategy 5* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 6: Sensible Withdrawals

**Description:** A dual-rate system: a conservative base withdrawal covers essential expenses regardless of market conditions, plus an "extras" withdrawal from the previous year's real gains for discretionary spending.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-6a | Base Withdrawal Rate (%) | Numeric input with % suffix | 1.0% – 8.0% | 0.1% | 3.0% | Applied to the current portfolio value each year. Covers essential spending. |
| 21-6b | Extras Withdrawal Rate (%) | Numeric input with % suffix | 0.0% – 50.0% | 1.0% | 10.0% | Applied to the previous year's real (inflation-adjusted) portfolio gains only. Only triggered when real gains are positive. |

**Computed helper:**
_"Base: $X,XXX / year. Extras depend on prior year gains."_

**Algorithm summary:**
Each year: Base withdrawal = Portfolio × Base Rate. If the previous year's real portfolio gain > 0, extras withdrawal = Real Gain × Extras Rate. Total withdrawal = Base + Extras. In years with no real gains, only the base is withdrawn.

**Formula Reference:** See *Strategy 6* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 7: 95% Rule

**Description:** From Bob Clyatt's "Work Less, Live More." Calculates a percentage of the current portfolio each year, but in down years, the withdrawal can be no less than 95% of the previous year's withdrawal. This smooths downward adjustments while allowing full upward participation.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-7a | Annual Withdrawal Rate (%) | Numeric input with % suffix | 1.0% – 10.0% | 0.1% | 4.0% | Applied to the current portfolio value each year. |
| 21-7b | Minimum Floor (% of Prior Year) | Numeric input with % suffix | 80% – 100% | 1% | 95% | The minimum withdrawal as a percentage of the prior year's withdrawal. Clyatt's original value is 95%. |

**Computed helper:** _"Year 1: $X,XXX. Future years: max(rate × portfolio, floor% × prior withdrawal)"_

**Algorithm summary:**
Each year: Calculate target = Portfolio × Withdrawal Rate. Calculate floor = Prior Year Withdrawal × Floor%. Actual withdrawal = max(target, floor). In good years, the withdrawal tracks the portfolio upward without restriction. In bad years, the withdrawal drops at most (100% - floor%) from the previous year.

**Design note:** The original Clyatt formulation uses 95% as a fixed value. Exposing it as a configurable parameter (labeled "Minimum Floor") gives the user more flexibility while defaulting to the classic value.

**Formula Reference:** See *Strategy 7* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 8: Guyton-Klinger

**Description:** Starts with an initial withdrawal rate and adjusts annually using four decision rules: the withdrawal rule (freeze inflation adjustment after negative returns), the portfolio management rule (governs where withdrawals come from), the capital preservation rule (cut spending when withdrawal rate drifts too high), and the prosperity rule (increase spending when withdrawal rate drops too low).

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-8a | Initial Withdrawal Rate (%) | Numeric input with % suffix | 2.0% – 8.0% | 0.1% | 5.2% | Applied to the starting portfolio to determine the first year's withdrawal. |
| 21-8b | Capital Preservation Trigger (%) | Numeric input with % suffix | 5% – 50% | 1% | 20% | If the current withdrawal rate exceeds the initial rate by more than this percentage, trigger a spending cut. E.g., 20% means: if initial rate is 5%, trigger at 6%. |
| 21-8c | Capital Preservation Cut (%) | Numeric input with % suffix | 5% – 25% | 1% | 10% | How much to reduce spending when the capital preservation rule triggers. |
| 21-8d | Prosperity Trigger (%) | Numeric input with % suffix | 5% – 50% | 1% | 20% | If the current withdrawal rate falls below the initial rate by more than this percentage, trigger a spending increase. E.g., 20% means: if initial rate is 5%, trigger at 4%. |
| 21-8e | Prosperity Raise (%) | Numeric input with % suffix | 5% – 25% | 1% | 10% | How much to increase spending when the prosperity rule triggers. |
| 21-8f | Guardrails Sunset (years from end) | Numeric input with "years" suffix | 0 – 30 | 1 | 15 | The capital preservation and prosperity rules stop being applied within this many years of the end of retirement. Per Guyton-Klinger's original formulation, this is 15 years. |

**Computed helper:** _"Initial: $X,XXX/yr. Cap preservation triggers at X.X% rate; Prosperity at X.X% rate."_ — computed from initial rate ± trigger percentages.

**Algorithm summary:**
1. **Year 1:** Withdrawal = Portfolio × Initial Rate.
2. **Subsequent years:**
   - **Withdrawal Rule:** Increase last year's withdrawal by inflation, UNLESS the previous year's portfolio return was negative AND the current withdrawal rate > initial rate. In that case, freeze (no inflation adjustment).
   - **Capital Preservation Rule:** If current withdrawal rate > initial rate × (1 + trigger%), reduce withdrawal by the cut percentage. Not applied within the sunset period.
   - **Prosperity Rule:** If current withdrawal rate < initial rate × (1 − trigger%), increase withdrawal by the raise percentage. Not applied within the sunset period.

**Formula Reference:** See *Strategy 8* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 9: Vanguard Dynamic Spending

**Description:** A hybrid of Constant Dollar and Percent of Portfolio. Calculates spending as a percentage of the current portfolio, but constrains year-over-year changes with a ceiling (max increase) and floor (max decrease) relative to the previous year's spending.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-9a | Annual Withdrawal Rate (%) | Numeric input with % suffix | 1.0% – 10.0% | 0.1% | 5.0% | Applied to the current portfolio value to compute the unconstrained withdrawal. |
| 21-9b | Ceiling (max increase %) | Numeric input with % suffix | 0% – 20% | 0.5% | 5.0% | Maximum percentage increase in real spending from the previous year. |
| 21-9c | Floor (max decrease %) | Numeric input with % suffix | 0% – 20% | 0.5% | 2.5% | Maximum percentage decrease in real spending from the previous year. Entered as a positive number (e.g., 2.5% means spending can drop at most 2.5%). |

**Computed helper:** _"Year 1: $X,XXX. Subsequent years adjust between -2.5% and +5.0% of prior year (real)."_

**Algorithm summary:**
1. **Year 1:** Withdrawal = Portfolio × Withdrawal Rate.
2. **Subsequent years:**
   - Calculate unconstrained target = Current Portfolio × Withdrawal Rate.
   - Calculate ceiling amount = Previous Year Withdrawal (real) × (1 + ceiling%).
   - Calculate floor amount = Previous Year Withdrawal (real) × (1 − floor%).
   - Actual withdrawal = min(max(target, floor amount), ceiling amount).

**Formula Reference:** See *Strategy 9* in WITHDRAWAL_STRATEGIES.md

**Design note:** The floor is entered as a positive percentage for UX clarity ("max decrease: 2.5%"), but internally represents a decrease. The label "Floor (max decrease %)" makes this unambiguous.


---

### Strategy 10: Endowment Strategy

**Description:** Blends the current portfolio value with the previous year's spending to create a smoothed withdrawal. Responds gradually to market changes, preventing dramatic income swings.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-10a | Spending Rate (%) | Numeric input with % suffix | 1.0% – 10.0% | 0.1% | 5.0% | The percentage of the current portfolio value used in the "new money" component. |
| 21-10b | Smoothing Weight (%) | Numeric input with % suffix | 0% – 100% | 5% | 70% | Weight given to the prior year's withdrawal (inflation-adjusted). The complement (100% − this value) is the weight given to the new portfolio-based calculation. |

**Computed helper:**
_"Year 1: $X,XXX (rate × portfolio). Year 2+: 70% × prior withdrawal + 30% × (rate × portfolio)."_

**Algorithm summary:**
1. **Year 1:** Withdrawal = Portfolio × Spending Rate.
2. **Subsequent years:** Withdrawal = (Smoothing Weight × Prior Year Withdrawal, inflation-adjusted) + ((1 − Smoothing Weight) × Spending Rate × Current Portfolio).

The higher the smoothing weight, the more stable the income stream (and the slower it responds to market changes).

**Formula Reference:** See *Strategy 10* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 11: Hebeler Autopilot II

**Description:** Combines 75% of the previous year's inflation-adjusted withdrawal with 25% of the withdrawal calculated using the PMT (payment) financial function. Creates a smoothed withdrawal that responds to market conditions while maintaining relative stability.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-11a | Initial Withdrawal Rate (%) | Numeric input with % suffix | 1.0% – 8.0% | 0.1% | 4.0% | Applied to the starting portfolio for the first year's withdrawal. |
| 21-11b | PMT Expected Return (%) | Numeric input with % suffix | 0.0% – 10.0% | 0.1% | 3.0% | The expected real (inflation-adjusted) rate of return used in the PMT calculation. |
| 21-11c | Prior Year Weight (%) | Numeric input with % suffix | 50% – 90% | 5% | 75% | Weight given to the previous year's withdrawal (inflation-adjusted). The complement is given to the PMT calculation. Hebeler's original value is 75%. |

**Computed helper:**
_"Year 1: $X,XXX. Year 2+: 75% × prior (adj.) + 25% × PMT calculation."_

**Algorithm summary:**
1. **Year 1:** Withdrawal = Portfolio × Initial Rate.
2. **Subsequent years:**
   - PMT component = PMT(expected_return, remaining_years, current_portfolio, 0) — the level annual payment that would exhaust the portfolio over the remaining period at the expected return.
   - Prior year component = Previous Year Withdrawal × (1 + inflation).
   - Withdrawal = (Prior Year Weight × Prior Year Component) + ((1 − Prior Year Weight) × PMT Component).

**Formula Reference:** See *Strategy 11* in WITHDRAWAL_STRATEGIES.md

---

### Strategy 12: CAPE-Based

**Description:** Uses the Cyclically Adjusted Price-to-Earnings (CAPE / Shiller PE) ratio to adjust withdrawals based on market valuation. When markets are expensive (high CAPE), withdrawals decrease; when markets are cheap (low CAPE), withdrawals increase.

**Parameters:**

| # | Label | Control | Range | Step | Default | Notes |
|---|---|---|---|---|---|---|
| 21-12a | Base Withdrawal Rate (a) | Numeric input with % suffix | 0.0% – 5.0% | 0.1% | 1.5% | The fixed "floor" component of the withdrawal rate. Provides baseline income regardless of CAPE. |
| 21-12b | CAPE Weight (b) | Numeric input (decimal) | 0.0 – 2.0 | 0.1 | 0.5 | The multiplier applied to (1/CAPE). Controls how responsive the withdrawal is to market valuation. |
| 21-12c | Starting CAPE Ratio | Numeric input (decimal) | 5.0 – 60.0 | 0.1 | 30.0 | The current CAPE ratio at the start of retirement. In Monte Carlo mode (historical sampling), the CAPE may be derived from the historical data; in Manual mode, this user-provided value is used. |

**Computed helper:**
_"Withdrawal rate = a + (b / CAPE) = X.X%. At current portfolio: $X,XXX / year."_

**Computed secondary helper:** A small inline note showing how the rate changes at different CAPE values:
_"At CAPE 15: X.X% | At CAPE 25: X.X% | At CAPE 40: X.X%"_ — gives the user intuition for how the formula behaves.

**Algorithm summary:**
Each year: Withdrawal Rate = a + (b / CAPE). Withdrawal = Rate × Current Portfolio. When CAPE is high (expensive market), b/CAPE is small, so the rate drops toward the base `a`. When CAPE is low (cheap market), b/CAPE is large, increasing the withdrawal.

**Formula Reference:** See *Strategy 12* in WITHDRAWAL_STRATEGIES.md

**Design note on CAPE in simulation:**
- **Manual mode:** CAPE is held constant at the user-provided starting value throughout the simulation (the simulation doesn't model CAPE movement). This is a simplification — in reality CAPE changes over time. A future enhancement could model CAPE drift, but for v1 this is sufficient.
- **Monte Carlo mode:** If the historical dataset includes CAPE data, the sampled months can carry their historical CAPE values, making the CAPE-based strategy more realistic. If CAPE data is not bundled, fall back to the constant CAPE approach and note this to the user.

---

## Affordance #22: Strategy Info Tooltip

**Purpose:** Provides a concise, accessible explanation of the currently selected withdrawal strategy — what it does, how it works, and what trade-offs it involves. Helps users who aren't deeply familiar with the financial literature understand their choice.

**Control type:** Tooltip triggered by an info icon

### Appearance

- A small info icon (ℹ) positioned to the right of the Strategy Selector dropdown label, vertically centered with the label text.
- Icon: ~16px, muted gray. On hover: transitions to the app's primary color (200ms).
- The tooltip itself appears on hover (desktop) or tap (mobile):
  - Positioned below and to the right of the icon, with a small caret/arrow pointing up to the icon.
  - Max width: ~320px. Background: white or very light gray. Border: 1px light gray. Rounded corners (6px). Drop shadow for subtle elevation.
  - Internal padding: ~12px.

### Content Structure

Each strategy's tooltip follows a consistent three-part structure:

1. **One-line summary** — bold, ~13px. E.g., _"Withdraws a fixed inflation-adjusted amount each year."_
2. **How it works** — 2–4 sentences in regular weight, ~12px, explaining the core mechanic.
3. **Trade-off line** — italic, ~11px, muted color. E.g., _"Trade-off: Very stable income, but doesn't respond to market conditions. Risk of premature depletion in bad sequences."_

### Behavior

- **Desktop:** Tooltip appears on hover after a 300ms delay (prevents accidental triggers). Disappears when the cursor leaves the icon or tooltip area.
- **Mobile:** Tooltip appears on tap; tapping elsewhere dismisses it.
- The tooltip content updates immediately when a new strategy is selected (no animation needed — the tooltip is typically closed when the user changes the dropdown).
- The tooltip is **read-only** — no interactive elements inside it.

### Tooltip Content Per Strategy

Below is the content for each of the 12 strategies:

**Constant Dollar:**
> **Withdraws a fixed inflation-adjusted amount each year.**
> The first year's withdrawal is a percentage of your starting portfolio. Each subsequent year, that dollar amount increases by inflation — regardless of how your portfolio performs. Also known as the "4% Rule" when using a 4% rate.
> _Trade-off: Maximum income stability, but ignores market conditions. Poor early returns can deplete the portfolio._

**Percent of Portfolio:**
> **Withdraws a fixed percentage of the current portfolio each year.**
> Your withdrawal tracks the portfolio directly — it rises when markets are up and falls when markets are down. The portfolio can never be fully depleted (the withdrawal shrinks proportionally).
> _Trade-off: Portfolio never hits zero, but income can swing dramatically year-to-year._

**1/N:**
> **Divides the portfolio by the number of remaining years.**
> In year 1 of a 40-year retirement, you withdraw 1/40 of the portfolio. In the final year, you withdraw everything remaining. Withdrawal rates naturally increase over time.
> _Trade-off: Simple and systematic, but late-retirement withdrawals can be very large or very small depending on market performance._

**Variable Percentage Withdrawal (VPW):**
> **Uses a financial formula (PMT) to calculate optimal withdrawals based on remaining time and expected returns.**
> Developed by the Bogleheads community. The withdrawal percentage increases each year as the remaining horizon shortens, ensuring the portfolio is fully (or partially) spent. Adapts to actual portfolio performance each year.
> _Trade-off: Never depletes prematurely, but income can vary significantly. Designed to bring portfolio to ~$0 at the end._

**Dynamic SWR:**
> **Continuously recalculates an annuity-like withdrawal based on current balance and remaining years.**
> Uses a present-value formula incorporating expected returns and inflation to determine how much you can withdraw each year while fully exhausting the portfolio by the end of retirement.
> _Trade-off: Responsive to market conditions and ensures full spend-down. Income varies with portfolio performance._

**Sensible Withdrawals:**
> **A conservative base withdrawal plus a bonus from good years' gains.**
> Each year, you take a base percentage of the portfolio for essentials. On top of that, if the portfolio had positive real gains the prior year, you take an additional percentage of those gains for discretionary spending.
> _Trade-off: Downside protection (base is always available), but total income fluctuates. The "extras" can be $0 in bad years._

**95% Rule:**
> **Percentage of portfolio, but you never cut spending more than 5% in a single year.**
> Each year, calculate the standard percentage withdrawal. If it's less than 95% of last year's withdrawal, take 95% of last year's instead. Upward adjustments are unrestricted.
> _Trade-off: Smooths downward shocks, but the floor can cause higher-than-sustainable withdrawals during prolonged downturns._

**Guyton-Klinger:**
> **Inflation-adjusted withdrawals with guardrail rules that trigger spending cuts or raises.**
> Starts like Constant Dollar (inflation-adjusted), but applies four decision rules: freeze inflation adjustments after negative return years, cut spending 10% if your withdrawal rate drifts too high, and raise spending 10% if it drops too low.
> _Trade-off: Higher initial withdrawal rate than Constant Dollar (~5.2%), but requires accepting occasional spending cuts. Guardrails sunset near end of retirement._

**Vanguard Dynamic Spending:**
> **Percentage of portfolio, constrained by a ceiling and floor on year-over-year changes.**
> Each year, calculate a percentage of the current portfolio. But the actual withdrawal can't increase more than the ceiling % or decrease more than the floor % from last year's spending. This smooths income while staying responsive to markets.
> _Trade-off: More stable than pure Percent of Portfolio, more responsive than Constant Dollar. Requires choosing appropriate ceiling/floor values._

**Endowment Strategy:**
> **Blends prior year's spending with current portfolio value for a smoothed withdrawal.**
> Each year, the withdrawal is a weighted average: part based on last year's withdrawal (adjusted for inflation) and part based on a fresh percentage of the current portfolio. Higher smoothing weight = more stable, less responsive.
> _Trade-off: Gradual response to market changes. Very stable income in the short term, but may lag behind in both upturns and downturns._

**Hebeler Autopilot II:**
> **Blends prior year's withdrawal with a PMT-calculated withdrawal for smooth, market-responsive income.**
> Each year, combine 75% of last year's inflation-adjusted withdrawal with 25% of the withdrawal calculated by the PMT formula (which accounts for remaining years and expected returns). Created by financial advisor Henry K. Hebeler.
> _Trade-off: Smoothed income that gently responds to market conditions. Tends to preserve capital well but may underspend in strong markets._

**CAPE-Based:**
> **Adjusts withdrawals based on stock market valuation using the CAPE ratio.**
> Withdrawal rate = a base rate + a valuation-sensitive component (weight / CAPE). When markets are expensive (high CAPE), you withdraw less. When markets are cheap (low CAPE), you withdraw more. This counters the tendency to overspend in bubbles.
> _Trade-off: Theoretically sound valuation-awareness, but requires a CAPE input and assumes mean reversion. Income varies with market valuation._

---

## Section-Level Design Notes

### Guardrail Interaction Reminder

All 12 strategies produce a "raw" withdrawal amount each period. This amount is then clamped by the active spending phase's min/max bounds (from Section: Spending Phases, #17d/#17e). The clamping is a hard override:

- If raw withdrawal < phase min → withdrawal = phase min
- If raw withdrawal > phase max → withdrawal = phase max
- If clamping occurs, the table marks that row with a visual indicator (see Detail Table spec)

This interaction is handled at the simulation engine level, not within individual strategy configurations. No per-strategy UI is needed for this — it's a global behavior.

### Annual vs. Monthly Calculation

All strategies in the financial literature are described in annual terms. The simulation engine should:
1. Calculate the annual withdrawal using the strategy's formula at the start of each year (every 12th month).
2. Divide the annual withdrawal by 12 to determine the monthly withdrawal amount.
3. Apply the monthly withdrawal evenly across the 12 months of that year.
4. At the start of the next year, recalculate based on the current portfolio value and strategy rules.

This means the monthly view in the table shows the same withdrawal amount for all 12 months within a given year (unless modified by income/expense events or by Tracking Mode actuals).

### Strategy Comparison (Future Enhancement)

A potential v2 feature: allow the user to run the same simulation with multiple strategies simultaneously and compare the outcomes side by side. This is not in scope for v1 but is worth designing the data model to accommodate (store results keyed by strategy type).

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Select a new strategy from dropdown | Parameters panel transitions to new strategy's inputs. Tooltip updates. No recalculation. |
| Change a strategy-specific parameter | No recalculation until Run Simulation (Planning Mode). Immediate re-forecast in Tracking Mode. |
| Hover/tap the info icon | Tooltip appears with strategy explanation. |
| Run Simulation | The simulation engine uses the selected strategy + its parameters + spending phase bounds to compute withdrawals. |

# Input Panel — Section: Asset Drawdown Strategy (#23, #24, #25, #26)

This section defines how withdrawals are sourced across the three asset classes (Stocks, Bonds, Cash). Once the withdrawal strategy (Section: Withdrawal Strategy) determines *how much* to withdraw in a given period, the drawdown strategy determines *where that money comes from*. The two main approaches are Bucket (sequential depletion) and Rebalancing (maintaining target allocations).

## Section Container

- **Section header:** "Asset Drawdown Strategy" — semi-bold, ~15px, with collapse/expand chevron.
- **Default state:** Expanded.
- **Thin 1px divider** above the header.
- **Internal padding:** ~16px. Vertical spacing between controls: ~16px.
- **Section helper text:** Immediately below the header, a single line of small muted text (~11px): _"Determines which asset classes are drawn from when making withdrawals."_

---

## Affordance #23: Drawdown Strategy Selector

**Purpose:** Lets the user choose between the two fundamental drawdown approaches: Bucket (sequential priority order) or Rebalancing (maintain target allocation).

**Control type:** Segmented toggle (two segments)

### Appearance

- Horizontal segmented control, pill-shaped, full width of the sidebar content area, ~36px height.
- Two segments: **"Bucket"** and **"Rebalancing"**
- Active segment: solid filled background in the app's primary color, white text. Inactive segment: transparent background, muted text.
- Slide animation between segments: 200ms ease-in-out (consistent with other segmented toggles in the app).
- Each segment label includes a small icon to the left of the text for quick visual identification:
  - Bucket: a small stacked layers icon (▤) suggesting sequential ordering
  - Rebalancing: a small pie/balance icon (⚖) suggesting proportional distribution

### Behavior

- Default selection: **Bucket**
- Switching between strategies:
  - The configuration area below the toggle transitions to show the relevant controls. Use a crossfade animation (150ms): old config fades out, new config fades in.
  - Switching from Rebalancing back to Bucket hides the glide path controls but **preserves** all rebalancing configuration in memory (target allocations, glide path waypoints). If the user switches back to Rebalancing, their previous configuration is restored.
  - No output recalculation — user must click "Run Simulation" (Planning Mode). In Tracking Mode, changes re-forecast projected months immediately.

### State

- `drawdownStrategy.type`: `"bucket"` | `"rebalancing"`

---

## Affordance #24: Bucket Strategy Configuration

**Purpose:** When Bucket strategy is selected, the user defines the priority order in which asset classes are drawn down. Withdrawals come entirely from the highest-priority asset class until it is depleted, then move to the next.

**Control type:** Drag-to-reorder list

### Appearance

- Visible only when the Drawdown Strategy Selector (#23) is set to **Bucket**. Fades in/out (150ms) on strategy switch.
- Contained within the same subtle inset card used for strategy-specific parameters in the Withdrawal Strategy section (light gray background `#F5F5F5`, 1px border, rounded corners 6px, ~12px padding).
- **Sub-label** above the list: "Drawdown Priority" in small muted text (~11px), with a sub-line: _"Drag to reorder. Withdrawals are taken from the top asset class first."_
- The list contains **three rows**, one per asset class. Each row:
  - Height: ~44px. Full width of the card. Rounded corners (4px). White background with a very subtle border (1px, light gray).
  - Vertical spacing between rows: ~6px.
  - **Left side:** A drag handle icon (⠿ — six dots arranged in a 2×3 grid), muted gray, ~16px. The cursor changes to `grab` on hover over the handle, and `grabbing` while dragging.
  - **Center:** The asset class color dot (using the established colors — blue for Stocks, teal for Bonds, amber for Cash, ~10px diameter) followed by the asset class name in medium-weight text (~14px).
  - **Right side:** A priority badge — a small circle (~20px diameter) with the priority number (1, 2, 3) in white text on a muted background. Priority 1 = drawn from first.

- **Default order:**
  1. Cash (drawn first)
  2. Bonds (drawn second)
  3. Stocks (drawn last)

  This default reflects a common conservative approach: deplete lower-returning, more stable assets first, preserving equities for growth.

### Behavior

- **Drag interaction:**
  - The user grabs a row by its drag handle (or anywhere on the row, for easier mobile interaction).
  - While dragging, the row lifts slightly (subtle box shadow increase and 2px scale-up) and becomes semi-transparent (~80% opacity). A colored insertion line appears between other rows indicating where the dragged item will be placed.
  - On drop, the rows animate smoothly (200ms ease) to their new positions. Priority badges re-number instantly.
  - The drag is constrained vertically within the list — no horizontal movement.
- **Keyboard accessibility:** Each row is focusable. When focused, arrow keys (↑/↓) move the row up or down in the list. Screen readers announce the current position (e.g., "Cash, priority 1 of 3. Press down arrow to move to priority 2.").
- **Touch (mobile):** Long-press (~300ms) activates the drag. A subtle haptic pulse (if supported) confirms the grab.
- No output recalculation until Run Simulation. In Tracking Mode, reorder triggers immediate re-forecast.

### Depletion Behavior (Engine Logic, Not UI)

When the simulation engine processes a withdrawal under Bucket strategy:
1. Attempt to withdraw the full amount from the highest-priority asset class.
2. If that asset class has insufficient funds, withdraw everything available from it (depleting it to $0), then continue to the next asset class for the remainder.
3. If all asset classes are depleted, the withdrawal is only partially fulfilled (the portfolio has run out of money — this is a "failure" scenario).

The table should visually indicate when an asset class is fully depleted (e.g., the cell shows "$0" in a muted/italic style, or a small "depleted" badge).

### State

- `drawdownStrategy.bucketOrder`: array of asset class keys in priority order, e.g., `["cash", "bonds", "stocks"]`

---

## Affordance #25: Rebalancing Strategy Configuration

**Purpose:** When Rebalancing strategy is selected, withdrawals are sourced to move the portfolio toward (or maintain) a target asset allocation. The user defines the target percentages for each asset class.

**Control type:** Composite — three numeric inputs with a linked allocation bar

### Visibility

- Visible only when the Drawdown Strategy Selector (#23) is set to **Rebalancing**. Fades in/out (150ms) on strategy switch.
- Contained within the same inset card style as #24.

### Sub-Affordance #25a: Target Allocation Inputs

**Purpose:** Defines the target percentage of the portfolio that should be held in each asset class. Withdrawals are preferentially taken from whichever asset class is most overweight relative to its target.

#### Appearance

- **Sub-label** above the inputs: "Target Allocation" in small muted text (~11px).
- Three input rows, one per asset class. Each row follows the same layout pattern as the Starting Portfolio inputs (#7–#9):
  - **Left:** Asset class color dot + name label (e.g., "● Stocks")
  - **Right:** Compact numeric input (~64px wide, ~32px height, bordered, rounded corners 4px, right-aligned text, "%" suffix)
- Below the three inputs, a **linked horizontal allocation bar**:
  - Full width of the card. Height: ~12px. Rounded corners (6px).
  - Three colored segments (Stocks = blue, Bonds = teal, Cash = amber) proportional to the current input values.
  - Segments animate smoothly (200ms ease) as the user changes any input.
  - If the total ≠ 100%, the bar still renders proportionally based on the raw values, but the validation indicator (see below) signals the error.
- **Validation indicator:** Below the allocation bar, a small line of text:
  - When total = 100%: "Total: 100% ✓" in green text (~11px).
  - When total ≠ 100%: "Total: XX% — must equal 100%" in red text (~11px), with a subtle red border applied to the allocation bar.
  - The Run Simulation button should show a tooltip error if the total ≠ 100% when clicked: _"Target allocation must sum to 100%."_

#### Behavior

- Range per input: **0% – 100%**, step: **1%**
- Default values: **Stocks: 70%**, **Bonds: 25%**, **Cash: 5%**
- Standard focus/blur formatting. On blur, if the total exceeds 100%, the field does **not** auto-clamp — the validation indicator shows the error and the user fixes it manually. This is deliberate: auto-clamping one field when another changes is confusing and unpredictable.
- As the user types, the allocation bar updates in real time, and the validation indicator recalculates.
- No output recalculation until Run Simulation (Planning Mode). In Tracking Mode, changes re-forecast immediately (only if total = 100%).

#### State

- `drawdownStrategy.rebalancing.targetAllocation`: `{ stocks: number, bonds: number, cash: number }` (percentages stored as integers, must sum to 100)

### Rebalancing Behavior (Engine Logic, Not UI)

When the simulation engine processes a withdrawal under Rebalancing strategy:
1. Calculate the current actual allocation of the portfolio (e.g., Stocks 75%, Bonds 20%, Cash 5%).
2. Compare to the target allocation (e.g., Stocks 70%, Bonds 25%, Cash 5%).
3. Identify overweight asset classes (Stocks is 5% overweight in this example).
4. Source the withdrawal preferentially from overweight asset classes, proportional to their degree of overweight.
5. If the withdrawal is large enough to bring all classes below target, distribute the remaining withdrawal proportionally across all classes.
6. The goal is that after the withdrawal, the portfolio is as close to the target allocation as possible.

This is a "soft" rebalancing — it only occurs through withdrawals (and potentially through deposits from income events), not through explicit buy/sell rebalancing trades. The portfolio drifts with market returns between withdrawal events.

---

## Sub-Affordance #25b: Enable Glide Path Toggle

**Purpose:** When enabled, the target allocation is not fixed for the entire retirement but changes over time according to a user-defined schedule (the "glide path"). This models the common practice of gradually shifting from equities to bonds/cash as retirement progresses.

**Control type:** Labeled toggle switch

### Appearance

- Positioned below the Target Allocation inputs and allocation bar, separated by ~12px.
- A standard on/off toggle switch with the label "Enable Glide Path" to its left.
- Toggle track: ~40px wide, ~22px tall. Rounded pill shape. Off state: gray track. On state: app's accent color.
- Below the label, a very small muted explanatory line (~10px): _"Change your target allocation over the course of retirement."_

### Behavior

- Default: **Off**
- **Turning on:**
  - The Target Allocation inputs (#25a) become **read-only** and dimmed (they now represent only the starting point, which is derived from the first glide path waypoint). A small label replaces the "Target Allocation" sub-label: _"Starting allocation (set by glide path below)"_.
  - The Glide Path Editor (#26) appears below with a slide-down animation (200ms ease).
  - The first glide path waypoint is auto-populated with the current target allocation values and Year = 1.
- **Turning off:**
  - The Glide Path Editor slides up and disappears (200ms ease).
  - The Target Allocation inputs become editable again, populated with the values from the first glide path waypoint (so the user's starting allocation is preserved).
  - All glide path waypoints are preserved in memory (not discarded) — if the user toggles back on, the previous configuration is restored.

### State

- `drawdownStrategy.rebalancing.glidePathEnabled`: boolean

---

## Affordance #26: Glide Path Editor

**Purpose:** Allows the user to define a schedule of changing target allocations over the course of retirement. The app linearly interpolates between defined waypoints for intermediate years.

**Control type:** Composite — dynamic list of waypoint rows + a mini preview chart

### Visibility

- Visible only when Rebalancing is selected (#23) AND Glide Path is enabled (#25b). Fades/slides in/out with the toggle.
- Contained within its own sub-card inside the rebalancing inset card (nested card with slightly darker background, e.g., `#EFEFEF`, 1px border, rounded corners 6px, ~12px padding).

### Sub-Affordance #26a: Glide Path Waypoint List

**Purpose:** A dynamic list of rows, each defining a target allocation at a specific year in retirement.

#### Appearance

- **Column headers row:** A non-interactive header row at the top of the list:
  - Column widths (approximate): Year (~56px), Stocks (~64px), Bonds (~64px), Cash (~64px), Remove (~28px)
  - Header labels: "Year", "Stocks", "Bonds", "Cash" — small muted text (~11px), center-aligned. The Stocks/Bonds/Cash headers include the asset class color dot to the left.
- **Waypoint rows:** Each row contains:
  - **Year input:** Compact numeric input (~56px wide, ~30px height). Displays the retirement year (e.g., 1, 10, 20, 30).
  - **Stocks % input:** Compact numeric input (~64px wide, ~30px height, "%" suffix, right-aligned).
  - **Bonds % input:** Same styling.
  - **Cash % input:** Same styling.
  - **Remove button (#26c):** Small icon button (× or trash, ~24px), positioned at the far right of the row. Muted gray, red on hover.
- Rows are separated by ~4px vertical spacing.
- Each row has a thin left accent bar (2px) in a graduated color from the first row's accent to the last — creating a subtle visual "path" down the list. (E.g., a gradient from a lighter shade to a darker shade of the app's primary color.)

#### Behavior

**Year input:**
- Range: **1** to **retirement duration**. Step: **1**.
- The first waypoint's year is always **1** and is **read-only** (locked — the glide path must start at the beginning of retirement).
- The last waypoint's year is always equal to the **retirement duration** and is **read-only** (the glide path must define the endpoint).
- Middle waypoints: freely editable. Must be greater than the previous waypoint's year and less than the next waypoint's year. On blur, clamps to valid range with amber flash.
- Waypoints must be in ascending year order. The input constraints enforce this — it's impossible to create an out-of-order list.

**Allocation inputs (Stocks %, Bonds %, Cash %):**
- Range per input: **0% – 100%**, step: **1%**.
- The three values in each row must sum to 100%. Validation is per-row:
  - If the row sums to 100%: no indicator (clean state).
  - If the row does not sum to 100%: a small red "≠100%" indicator appears to the right of the Cash input (before the remove button). The row's border turns faintly red.
- The Run Simulation button refuses to execute if any waypoint row doesn't sum to 100%.

**Default waypoints (on first enable):**
Two waypoints are created by default:
1. Year 1: current target allocation values (e.g., 70 / 25 / 5)
2. Year [retirement duration]: a more conservative allocation (e.g., 40 / 40 / 20)

This gives the user a starting glide path that they can immediately see on the mini-chart, with a sensible shape they can adjust.

#### State

- `drawdownStrategy.rebalancing.glidePath`: array of `{ year: number, stocks: number, bonds: number, cash: number }`
- Minimum 2 waypoints (first and last). Maximum 10 waypoints.

---

### Sub-Affordance #26b: Add Waypoint Button

**Purpose:** Adds a new waypoint row to the glide path.

**Control type:** Small secondary action button

#### Appearance

- Positioned below the last waypoint row, left-aligned.
- Styled as a ghost/outline button: no background fill, 1px dashed border in the app's primary color, text in primary color.
- Label: "+ Add Waypoint"
- Size: auto-width, ~28px height.
- **When 10 waypoints exist:** The button is **hidden** (space collapses).

#### Behavior

- **On click:**
  - A new waypoint row animates in (slide-down + fade-in, 200ms ease) above the last row (since the last row is pinned to the retirement duration, new waypoints are always inserted before it).
  - The new waypoint's year defaults to the midpoint between the previous and next waypoints (rounded to the nearest integer). E.g., if the existing waypoints are Year 1 and Year 40, the new one defaults to Year 20.
  - The new waypoint's allocation defaults to the linearly interpolated values at that year based on the surrounding waypoints. This means the new waypoint starts on the existing glide path line — the user can then adjust it to create a curve or inflection point.
  - The mini preview chart (#26d) updates immediately to show the new waypoint as an additional control point.

---

### Sub-Affordance #26c: Remove Waypoint Button

**Purpose:** Removes a waypoint row from the glide path.

**Control type:** Icon button (per row)

#### Appearance

- Small × icon, ~24px square, positioned at the far right of each waypoint row.
- Muted gray by default. On hover: muted red with faint red background circle.
- **Hidden** on the first waypoint (Year 1) and the last waypoint (Year = retirement duration) — these two are mandatory and cannot be removed.
- **Hidden** when only 2 waypoints remain (the minimum).

#### Behavior

- **On click:** No confirmation dialog (lightweight action). The row animates out (fade-out + collapse, 200ms). The mini preview chart updates immediately — the glide path re-interpolates without the removed point.
- Remaining rows do not re-number or shift years — they stay at their configured years. The interpolation between remaining waypoints adjusts automatically.

---

### Sub-Affordance #26d: Glide Path Mini Preview Chart

**Purpose:** A small inline chart that visualizes the current glide path, giving the user immediate spatial feedback on how their allocation shifts over time. This is essential because a table of numbers is hard to mentally interpolate — the chart makes the shape of the glide path instantly clear.

**Control type:** Read-only inline stacked area chart

#### Appearance

- Positioned below the waypoint list and the Add Waypoint button, separated by ~12px.
- **Dimensions:** Full width of the sub-card. Height: ~100px. This is intentionally compact — it's a preview, not the main chart.
- **Chart type:** Stacked area chart with three layers:
  - Bottom layer (Stocks): blue, with ~60% opacity fill.
  - Middle layer (Bonds): teal, with ~60% opacity fill.
  - Top layer (Cash): amber, with ~60% opacity fill.
  - The total always fills to 100% of the chart height.
- **X-axis:** Year 1 to Year [retirement duration]. A few evenly spaced tick labels (e.g., Year 1, Year 10, Year 20, Year 30, Year 40). No grid lines — keep it clean.
- **Y-axis:** 0% to 100%. No tick labels — the visual proportions are self-evident for a stacked area chart. A small "0%" label at the bottom-left and "100%" at the top-left for orientation.
- **Waypoint markers:** Small circles (~6px diameter, white fill with a 2px dark border) at each waypoint position on the top edge of the Stocks layer (or on the boundary lines between layers). These correspond to the user's defined waypoints and make it clear where the interpolation control points are.
- **Interpolation:** Between waypoints, the layers change linearly (straight lines between waypoint markers). This matches the engine's linear interpolation behavior. The visual is an accurate representation of what the simulation will use.

#### Behavior

- **Updates reactively** whenever any waypoint value changes (year or allocation percentages), a waypoint is added, or a waypoint is removed. The animation should be smooth: layers morph fluidly (300ms ease) from the old shape to the new shape.
- **Hover interaction (optional, lightweight):** On hover over the chart, a vertical crosshair line follows the cursor. A small tooltip shows the interpolated allocation at the hovered year: _"Year 15: Stocks 63%, Bonds 28%, Cash 9%"_. This helps the user verify the interpolation between waypoints.
- Non-clickable — the chart is purely for visualization. Waypoints are edited in the table, not on the chart. (A drag-to-edit-on-chart interaction would be a nice v2 enhancement, but too complex for v1.)

#### State

- Derived from `drawdownStrategy.rebalancing.glidePath`. No unique state.

---

## Section-Level Interaction Between Bucket and Rebalancing

**The key behavioral difference from the simulation engine's perspective:**

| Scenario | Bucket | Rebalancing |
|---|---|---|
| Where does a $5,000 monthly withdrawal come from? | Entirely from the highest-priority non-depleted asset class. | Preferentially from overweight asset classes to move toward target allocation. |
| Does the portfolio maintain a target allocation? | No. Asset classes deplete sequentially — the allocation shifts dramatically over time. | Yes (approximately). Each withdrawal nudges the allocation back toward the target. Drift still occurs from market returns. |
| What happens if one asset class is depleted? | Automatically moves to the next in priority order. | The target allocation becomes unachievable for that class. The remaining classes absorb the full allocation. The engine should handle this gracefully — recalculate targets among surviving classes proportionally. |
| How do income deposits interact? | Deposited into the user-specified asset class (per income event config). No rebalancing effect. | Deposited into the user-specified asset class. If this pushes the portfolio away from target, the next withdrawal will correct. |

**Glide path interpolation (Engine Logic):**
For any month in the simulation, the engine determines the target allocation by:
1. Finding the two glide path waypoints that bracket the current year (e.g., Year 10 and Year 20 for Year 15).
2. Linearly interpolating each asset class's percentage: `target = waypoint_before + (waypoint_after - waypoint_before) × (current_year - year_before) / (year_after - year_before)`.
3. Using the interpolated target for withdrawal sourcing in that month.

If the current year exactly matches a waypoint, use that waypoint's values directly.

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Switch from Bucket to Rebalancing (or vice versa) | Config panel transitions. Previous config preserved in memory. No recalculation. |
| Reorder bucket priority (drag) | Priority badges update. No recalculation until Run Simulation. |
| Change target allocation percentages | Allocation bar updates in real time. Validation indicator updates. No recalculation. |
| Enable/disable glide path | Editor appears/disappears. Target allocation inputs become read-only/editable. |
| Add/remove/edit a glide path waypoint | Mini preview chart updates reactively. No output recalculation until Run Simulation. |
| Run Simulation | Engine uses the selected drawdown strategy (bucket order or rebalancing targets + glide path) to source each month's withdrawal. |
| In Tracking Mode, any drawdown config change | Projected months re-forecast immediately. |





# Input Panel — Section: Additional Income Events (#27, #28, #29)

This section allows the user to define income that enters the portfolio during retirement — sources like Social Security, pensions, rental income, part-time work, annuity payments, or one-time windfalls like an inheritance or property sale. Each income event specifies an amount, timing, frequency, and which asset class receives the deposit.

## Section Container

- **Section header:** "Additional Income" — semi-bold, ~15px, with collapse/expand chevron.
- **Default state:** Expanded.
- **Thin 1px divider** above the header.
- **Internal padding:** ~16px. Vertical spacing between income event cards: ~12px.
- **Section helper text:** Immediately below the header, a single line of small muted text (~11px): _"Define income sources that add funds to your portfolio during retirement."_
- When no income events exist, display an **empty state** below the helper text: a dashed-border rounded rectangle (~80px tall, full width) with centered muted text: _"No income events defined. Click below to add one."_ This disappears as soon as the first event is added.

---

## Affordance #27: Income Event Card

**Purpose:** Each card represents a single income source that adds funds to the portfolio during retirement. The user can define multiple income events, each with its own timing, amount, frequency, and destination.

**Control type:** A styled card container holding multiple sub-controls.

### Card Appearance

- Each income event is rendered as a **card** with a subtle border (1px, light gray), rounded corners (8px), and a white background.
- A thin **left border accent** (3px) in a positive/income color — a muted green (e.g., `#4CAF50` at ~60% opacity) — to visually distinguish income cards from expense cards (which will use a muted red). This color coding creates an instant visual signal: green = money in, red = money out.
- **Card padding:** ~12px internal on all sides.
- **Card width:** Full width of the sidebar content area.
- Cards are stacked vertically with ~12px gap between them.
- A small **income icon** (↓ arrow into a tray, or a "+" in a circle) in the top-left corner of the card, in the same muted green as the left border accent. This reinforces the "money coming in" concept at a glance.

### Card Layout (Internal)

The card's internal layout is organized in four rows, optimized for the sidebar's narrow width:

#### Row 1: Name + Remove Button

- **Left:** Name/Label input (#27a), taking most of the row width.
- **Right:** Remove button (#29), right-aligned.

#### Row 2: Amount + Deposit Into

- **Left:** Amount input (#27b), ~55% of the row width.
- **Right:** Deposit Into dropdown (#27c), ~40% of the row width, with a small gap between.

#### Row 3: Start Date + Frequency

- **Left:** Start Date picker (#27d), ~55% of the row width.
- **Right:** Frequency dropdown (#27e), ~40% of the row width.

#### Row 4: End Date + Inflation Toggle (conditional)

- This row is **only visible** when Frequency is set to a recurring option (Monthly, Quarterly, Annually). When Frequency = One-Time, this row is hidden and the space collapses.
- **Left:** End Date picker (#27f), ~55% of the row width.
- **Right:** Inflation-Adjusted toggle (#27g), right-aligned.

---

### Sub-Affordance #27a: Name / Label

**Purpose:** A user-defined label for the income source, used for display in the table and chart tooltips.

**Control type:** Text input

#### Appearance

- Compact text input: full available width on Row 1 (minus the remove button), ~32px height, bordered, rounded corners (4px).
- Placeholder text: _"e.g., Social Security, Rental Income"_ — muted italic.
- Text is left-aligned, ~13px.

#### Behavior

- Max length: 40 characters. No content validation — any text is valid.
- Default value for new cards: empty (placeholder shown).
- Purely cosmetic — the name appears in the detail table's "Additional Income" column tooltip and in any chart annotations, but has no computational impact.

#### State

- `incomeEvents[i].name`: string

---

### Sub-Affordance #27b: Amount ($)

**Purpose:** The dollar amount of the income event. For one-time events, this is the total lump sum. For recurring events, this is the per-occurrence amount (e.g., monthly payment).

**Control type:** Numeric input with currency formatting

#### Appearance

- Label above: "Amount" in small muted text (~11px).
- Input field: ~55% of the row width, ~32px height, bordered, rounded corners (4px). Right-aligned text. Dollar sign ($) as a static prefix.
- Displays with comma-separated thousands formatting (e.g., `$2,500`).
- Below the input, a small muted helper (~10px):
  - For recurring events: _"per [frequency]"_ — e.g., _"per month"_ — dynamically updating based on the Frequency selection.
  - For one-time events: _"one-time deposit"_.

#### Behavior

- Range: **$0 to $9,999,999**. Step: free-form (whole dollars).
- Default value: **$0** (forces the user to enter a value).
- Standard focus/blur formatting: strips to raw number on focus, re-formats on blur.
- This is the amount in **today's dollars** if the Inflation-Adjusted toggle (#27g) is on. If inflation adjustment is off, this is the nominal fixed amount.
- No output recalculation until Run Simulation (Planning Mode). In Tracking Mode, changes re-forecast immediately.

#### State

- `incomeEvents[i].amount`: integer (dollars)

---

### Sub-Affordance #27c: Deposit Into

**Purpose:** Specifies which asset class receives the income. This affects the portfolio composition and interacts with the drawdown strategy (especially rebalancing).

**Control type:** Dropdown select

#### Appearance

- Label above: "Deposit Into" in small muted text (~11px).
- Standard dropdown: ~40% of the row width, ~32px height, bordered, rounded corners (4px), chevron on right.
- Each option in the dropdown displays the asset class color dot + name:
  - ● Stocks
  - ● Bonds
  - ● Cash

#### Behavior

- Default selection: **Cash** (the most common destination for income — conservative, liquid).
- Simple single-select. No search or filtering needed for 3 options.
- The selection determines which asset class balance increases when this income event fires in the simulation.

#### State

- `incomeEvents[i].depositInto`: `"stocks"` | `"bonds"` | `"cash"`

---

### Sub-Affordance #27d: Start Date

**Purpose:** The month and year when this income event begins (or occurs, for one-time events).

**Control type:** Month/Year picker

#### Appearance

- Label above: "Start Date" in small muted text (~11px). For one-time events, the label changes to "Date" (since there's no end date).
- The picker displays as a compact input showing the selected month and year in `MMM YYYY` format (e.g., `Jan 2030`), ~55% of the row width, ~32px height, bordered, rounded corners (4px).
- On click/focus, a small dropdown calendar panel opens below the input:
  - The panel shows a year selector (left/right arrows to navigate years) and a 4×3 grid of month buttons (Jan–Dec).
  - The currently selected month is highlighted in the app's primary color.
  - Months outside the valid range (before retirement start or after retirement end) are grayed out and unselectable.
  - The panel is compact (~200px wide, ~160px tall) and positioned below the input with a small caret arrow.

#### Behavior

- Valid range: **Month 1 of retirement** to **last month of retirement**. These are anchored to the retirement start date (derived from the current date, as discussed in Core Parameters).
- Default value: **Month 1 of retirement** (the start).
- Selecting a date closes the picker panel.
- Below the input, a small muted helper (~10px): _"Month X of retirement (age XX)"_ — contextualizing the selected date within the retirement timeline.
- If the retirement duration changes and the selected date now falls outside the valid range, the date is clamped to the new retirement end date and the input border flashes amber.

#### State

- `incomeEvents[i].startDate`: `{ month: number, year: number }` (or stored as an absolute month index within the retirement, e.g., month 13 = second January)

---

### Sub-Affordance #27e: Frequency

**Purpose:** Defines how often the income occurs.

**Control type:** Dropdown select

#### Appearance

- Label above: "Frequency" in small muted text (~11px).
- Standard dropdown: ~40% of the row width, ~32px height, bordered, rounded corners (4px), chevron on right.

**Options:**
- One-Time
- Monthly
- Quarterly
- Annually

#### Behavior

- Default selection: **Monthly** (the most common recurring income pattern, e.g., Social Security).
- **On change:**
  - If switched to **One-Time**: Row 4 (End Date + Inflation Toggle) hides with a collapse animation (150ms). The "Amount" helper text updates to _"one-time deposit"_. The Start Date label changes to "Date".
  - If switched to a **recurring option** (Monthly, Quarterly, Annually): Row 4 appears with a slide-down animation (150ms). The "Amount" helper text updates to _"per [frequency]"_. The Start Date label changes to "Start Date".
- Quarterly income fires every 3 months starting from the start date month. Annually fires every 12 months.

#### State

- `incomeEvents[i].frequency`: `"one-time"` | `"monthly"` | `"quarterly"` | `"annually"`

---

### Sub-Affordance #27f: End Date

**Purpose:** For recurring income, defines when the income stream stops.

**Control type:** Month/Year picker with an "End of Retirement" option

#### Appearance

- Label above: "End Date" in small muted text (~11px).
- Same month/year picker control as #27d, with one addition: below the month grid in the picker panel, a small button/link: **"End of Retirement"** — clicking this sets the end date to the last month of retirement and displays "End of Retirement" in the input field instead of a specific date.
- ~55% of the row width, ~32px height.
- **Visibility:** Only visible when Frequency ≠ One-Time.

#### Behavior

- Valid range: **start date month** to **last month of retirement**. The picker grays out months before the start date.
- Default value: **End of Retirement**.
- If the user selects a specific end date, it displays in `MMM YYYY` format.
- If the user sets start date to be after the current end date, the end date auto-advances to match the start date (minimum 1 occurrence) with an amber flash.
- Below the input, a small muted helper (~10px): _"X months of payments totaling ~$XXX,XXX"_ — computed from the frequency, amount, start date, and end date. Updates reactively. This gives the user a quick sense of the total income stream's value. If the Inflation-Adjusted toggle is on, the helper adds: _"(inflation-adjusted)"_.

#### State

- `incomeEvents[i].endDate`: `{ month: number, year: number }` | `"end-of-retirement"`

---

### Sub-Affordance #27g: Inflation-Adjusted Toggle

**Purpose:** Determines whether the recurring income amount grows with inflation each year (like Social Security COLA adjustments) or remains a fixed nominal amount.

**Control type:** Small labeled toggle switch

#### Appearance

- A compact toggle switch (~32px wide, ~18px tall) with the label "Inflation-Adj." to its left, ~12px text.
- Positioned on the right side of Row 4, vertically centered.
- Off state: gray track. On state: app's accent color.
- **Visibility:** Only visible when Frequency ≠ One-Time. (One-time deposits don't need inflation adjustment — they're a single point in time.)

#### Behavior

- Default: **On** (most recurring retirement income sources like Social Security are inflation-adjusted).
- **When on:** The simulation increases the income amount by the inflation rate each year. The base amount (#27b) is in today's dollars, and the actual deposit in future months will be higher in nominal terms.
- **When off:** The income amount is fixed in nominal terms. The same dollar amount is deposited every occurrence, regardless of inflation. This models fixed pensions or annuities without COLA.

#### State

- `incomeEvents[i].inflationAdjusted`: boolean

---

## Affordance #28: Add Income Event Button

**Purpose:** Adds a new income event card.

**Control type:** Secondary action button

### Appearance

- Positioned below the last income event card (or below the empty state placeholder if no events exist), left-aligned.
- Styled as a ghost/outline button: no background fill, 1px dashed border in the muted green income color, text in the same green.
- Icon: small "+" to the left of the label.
- Label: "+ Add Income"
- Size: auto-width, ~32px height.
- **No maximum limit** on the number of income events — the user can add as many as they need. (Realistically, most users will have 1–5 income sources. Allowing unlimited avoids arbitrary constraints.)

### Behavior

- **On click:**
  - A new income event card animates in below the existing cards (slide-down + fade-in, 200ms ease).
  - All fields are set to defaults: empty name, $0 amount, Cash deposit, Month 1 start, Monthly frequency, End of Retirement end date, Inflation-Adjusted on.
  - The new card's name input auto-focuses so the user can immediately start typing a label.
  - If this is the first event being added, the empty state placeholder disappears simultaneously.

### State

- No unique state — modifies the `incomeEvents` array.

---

## Affordance #29: Remove Income Event Button

**Purpose:** Removes an income event card.

**Control type:** Icon button (per card)

### Appearance

- Positioned in the top-right corner of each income event card (Row 1, right of the name input).
- Small icon button: × icon, ~24px square, no background.
- Icon color: muted gray by default. On hover: muted red, with a faint red background circle.
- Always visible on every card (no minimum card count — all income events can be removed).

### Behavior

- **On click:** No confirmation dialog (income events are lightweight and easily re-created). The card animates out (fade-out + height collapse, 200ms ease).
- If the removed card was the last one, the empty state placeholder reappears with a fade-in.
- No output recalculation until Run Simulation. In Tracking Mode, removal triggers immediate re-forecast.

### State

- No unique state — modifies the `incomeEvents` array.

---

## Common Income Event Presets (UX Enhancement)

To reduce the effort of configuring common income sources, the Add Income button (#28) can optionally be a **split button** — clicking the main area adds a blank event (as described above), but clicking a small dropdown chevron on the right reveals a preset menu:

### Preset Menu Options

| Preset | Name | Amount | Deposit Into | Start Date | Frequency | End Date | Inflation-Adj. |
|---|---|---|---|---|---|---|---|
| Social Security | "Social Security" | $2,500 | Cash | Month 1 | Monthly | End of Retirement | On |
| Pension | "Pension" | $1,500 | Cash | Month 1 | Monthly | End of Retirement | Off |
| Rental Income | "Rental Income" | $2,000 | Cash | Month 1 | Monthly | End of Retirement | On |
| Part-Time Work | "Part-Time Work" | $1,500 | Cash | Month 1 | Monthly | Month 60 (5 years) | Off |
| Inheritance | "Inheritance" | $100,000 | Stocks | Month 60 | One-Time | — | — |
| Annuity | "Annuity" | $1,000 | Cash | Month 1 | Monthly | End of Retirement | Off |

### Preset Menu Appearance

- A small dropdown menu that appears below the button, ~200px wide.
- Each preset is a row showing the preset name and a very small muted description (e.g., "Social Security — $2,500/mo, inflation-adj.").
- Selecting a preset creates a new income event card pre-filled with the preset values. The user can then modify any field.
- The bottom of the menu has a divider and a final option: **"Blank"** — equivalent to clicking the main button, creating a fully empty card.

### Split Button Appearance

- The main button area (left ~80%) shows "+ Add Income" and creates a blank event on click.
- The right ~20% is a small chevron (▾) separated by a thin vertical divider. Clicking it opens the preset menu.
- Both areas share the same ghost/outline styling (dashed green border).

---

## Section-Level Validation

Income events have minimal validation requirements:
- **Amount must be ≥ $0.** A $0 amount is valid (the event simply has no effect).
- **End date must be ≥ start date** (for recurring events). Enforced by the picker — see #27f behavior.
- **Name can be empty.** If empty, the event appears in the table as "Unnamed Income" in muted italic.
- No cross-event validation is needed — the user can have overlapping income events, multiple events starting on the same date, etc. These are all valid scenarios.

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Add an income event (blank or preset) | New card animates in with defaults or preset values. No recalculation. |
| Edit any field on an income event | Reactive updates to helper labels (total payments, per-frequency label). No output recalculation until Run Simulation. |
| Change frequency from recurring to one-time (or vice versa) | Row 4 hides/shows. Helper labels update. |
| Remove an income event | Card animates out. Empty state may reappear. No recalculation until Run Simulation. |
| In Tracking Mode, any income event change | Projected months re-forecast immediately. |
| Run Simulation | Engine adds income deposits to the appropriate asset class in the appropriate months, respecting frequency, start/end dates, and inflation adjustment. |

# Input Panel — Section: Irregular / Large Expenses (#30, #31, #32)

This section allows the user to define significant expenses that occur during retirement outside of the regular monthly withdrawals — one-time costs like a new roof, medical procedure, or gift to children, as well as recurring large expenses like long-term care premiums or property taxes. These expenses are deducted from the portfolio separately from (and in addition to) the regular withdrawal strategy.

## Section Container

- **Section header:** "Large Expenses" — semi-bold, ~15px, with collapse/expand chevron.
- **Default state:** Expanded.
- **Thin 1px divider** above the header.
- **Internal padding:** ~16px. Vertical spacing between expense event cards: ~12px.
- **Section helper text:** Immediately below the header, a single line of small muted text (~11px): _"Define significant one-time or recurring expenses beyond your regular withdrawals."_
- When no expense events exist, display an **empty state** below the helper text: a dashed-border rounded rectangle (~80px tall, full width) with centered muted text: _"No large expenses defined. Click below to add one."_ This disappears as soon as the first event is added.

---

## Affordance #30: Expense Event Card

**Purpose:** Each card represents a single large expense that draws funds from the portfolio during retirement. Structurally mirrors the Income Event Card (#27) for consistency, but with expense-specific differences in color coding, default values, and the "Source From" field replacing "Deposit Into."

**Control type:** A styled card container holding multiple sub-controls.

### Card Appearance

- Same card structure as Income Event Cards (#27): subtle border (1px, light gray), rounded corners (8px), white background.
- **Left border accent:** 3px in a **muted red** (e.g., `#E57373` at ~60% opacity) — the expense counterpart to the income cards' muted green. This color coding is the primary visual differentiator between income and expense cards at a glance.
- **Card padding:** ~12px internal on all sides.
- **Card width:** Full width of the sidebar content area.
- Cards are stacked vertically with ~12px gap between them.
- A small **expense icon** (↑ arrow out of a tray, or a "−" in a circle) in the top-left corner of the card, in the same muted red as the left border accent. Mirrors the income icon but with an outflow direction.

### Card Layout (Internal)

The card's internal layout uses the same four-row structure as income event cards for visual consistency:

#### Row 1: Name + Remove Button

- **Left:** Name/Label input (#30a)
- **Right:** Remove button (#32), right-aligned

#### Row 2: Amount + Source From

- **Left:** Amount input (#30b), ~55% of the row width.
- **Right:** Source From dropdown (#30c), ~40% of the row width.

#### Row 3: Date + Frequency

- **Left:** Date picker (#30d), ~55% of the row width.
- **Right:** Frequency dropdown (#30e), ~40% of the row width.

#### Row 4: End Date + Inflation Toggle (conditional)

- **Only visible** when Frequency is a recurring option (Monthly, Annually). Hidden when Frequency = One-Time.
- **Left:** End Date picker (#30f), ~55% of the row width.
- **Right:** Inflation-Adjusted toggle (#30g), right-aligned.

---

### Sub-Affordance #30a: Name / Label

**Purpose:** A user-defined label for the expense.

**Control type:** Text input

#### Appearance

- Identical styling to Income Event name input (#27a): full available width on Row 1, ~32px height, bordered, rounded corners (4px).
- Placeholder text: _"e.g., New Roof, Medical, Gift to Children"_ — muted italic.

#### Behavior

- Max length: 40 characters.
- Default value for new cards: empty (placeholder shown).
- Appears in the detail table's "Irregular Expenses" column tooltip and chart annotations.

#### State

- `expenseEvents[i].name`: string

---

### Sub-Affordance #30b: Amount ($)

**Purpose:** The dollar amount of the expense. For one-time events, the total cost. For recurring events, the per-occurrence amount.

**Control type:** Numeric input with currency formatting

#### Appearance

- Label above: "Amount" in small muted text (~11px).
- Identical styling to Income Event amount (#27b): ~55% row width, ~32px height, bordered, right-aligned, "$" prefix, comma formatting.
- Below the input, a small muted helper (~10px):
  - For recurring events: _"per [frequency]"_ — dynamically updating based on Frequency.
  - For one-time events: _"one-time expense"_.

#### Behavior

- Range: **$0 to $9,999,999**. Step: free-form (whole dollars).
- Default value: **$0**.
- Standard focus/blur formatting.
- Amount is in **today's dollars** if the Inflation-Adjusted toggle (#30g) is on. Otherwise, fixed nominal.
- No output recalculation until Run Simulation (Planning Mode). In Tracking Mode, changes re-forecast immediately.

#### State

- `expenseEvents[i].amount`: integer (dollars)

---

### Sub-Affordance #30c: Source From

**Purpose:** Specifies which asset class the expense is drawn from. This is the expense-side counterpart to "Deposit Into" on income events, but with an additional option: the user can choose to follow the configured drawdown strategy rather than specifying a single asset class.

**Control type:** Dropdown select

#### Appearance

- Label above: "Source From" in small muted text (~11px).
- Standard dropdown: ~40% of the row width, ~32px height, bordered, rounded corners (4px), chevron on right.
- Options in the dropdown:
  - ◎ Follow Drawdown Strategy _(displayed first, in slightly different styling — see below)_
  - ● Stocks
  - ● Bonds
  - ● Cash
- The "Follow Drawdown Strategy" option is displayed with a small gear icon (◎) instead of a color dot, and the text is in the app's primary color (not an asset class color) to distinguish it as a meta-option rather than a direct asset class.
- A thin horizontal divider in the dropdown separates "Follow Drawdown Strategy" from the three asset class options.

#### Behavior

- Default selection: **Follow Drawdown Strategy**.
- **When "Follow Drawdown Strategy" is selected:** The expense is sourced using the same logic as regular withdrawals — if Bucket strategy is active, it draws from the highest-priority non-depleted class; if Rebalancing is active, it draws preferentially from overweight classes. The expense acts like an additional withdrawal processed by the drawdown engine.
- **When a specific asset class is selected:** The expense is drawn entirely from that asset class, regardless of the drawdown strategy. If that asset class has insufficient funds, the shortfall is drawn from other classes following the drawdown strategy as a fallback.
- This flexibility is important because some large expenses logically tie to specific assets. For example, a user might want to fund a property purchase from their bond holdings, or draw down stocks for a large gift.

#### State

- `expenseEvents[i].sourceFrom`: `"follow-strategy"` | `"stocks"` | `"bonds"` | `"cash"`

---

### Sub-Affordance #30d: Date / Start Date

**Purpose:** The month and year when this expense occurs (one-time) or begins recurring.

**Control type:** Month/Year picker (identical to Income Event #27d)

#### Appearance

- Label above: "Date" when Frequency = One-Time; "Start Date" when Frequency is recurring. Small muted text (~11px).
- Same compact month/year picker as #27d: `MMM YYYY` display format, dropdown calendar panel with year navigation and 4×3 month grid.
- ~55% of the row width, ~32px height.

#### Behavior

- Valid range: **Month 1 of retirement** to **last month of retirement**.
- Default value: **Month 1 of retirement**.
- Below the input, a small muted helper (~10px): _"Month X of retirement (age XX)"_.
- Same clamping behavior as #27d if retirement duration changes.

#### State

- `expenseEvents[i].startDate`: `{ month: number, year: number }`

---

### Sub-Affordance #30e: Frequency

**Purpose:** Defines how often the expense occurs.

**Control type:** Dropdown select

#### Appearance

- Label above: "Frequency" in small muted text (~11px).
- Standard dropdown: ~40% of the row width, ~32px height, bordered, rounded corners (4px), chevron on right.

**Options:**
- One-Time
- Monthly
- Annually

**Note:** Quarterly is intentionally omitted here (unlike income events). Large recurring expenses in retirement are almost always monthly (e.g., long-term care premiums) or annual (e.g., property taxes, insurance). Quarterly is uncommon and excluding it simplifies the dropdown. If a user needs quarterly, they can approximate with a monthly amount divided by 3 or an annual amount multiplied by 4.

#### Behavior

- Default selection: **One-Time** (the most common pattern for large expenses — a new roof, a medical procedure, a car purchase).
- **On change:**
  - If switched to **One-Time**: Row 4 (End Date + Inflation Toggle) hides with a collapse animation (150ms). Amount helper updates to _"one-time expense"_. Date label changes to "Date".
  - If switched to **Monthly** or **Annually**: Row 4 appears with a slide-down animation (150ms). Amount helper updates to _"per month"_ or _"per year"_. Date label changes to "Start Date".

#### State

- `expenseEvents[i].frequency`: `"one-time"` | `"monthly"` | `"annually"`

---

### Sub-Affordance #30f: End Date

**Purpose:** For recurring expenses, defines when the expense stream stops.

**Control type:** Month/Year picker with an "End of Retirement" option (identical pattern to Income Event #27f)

#### Appearance

- Label above: "End Date" in small muted text (~11px).
- Same month/year picker as #27f, including the "End of Retirement" shortcut button in the picker panel.
- ~55% of the row width, ~32px height.
- **Visibility:** Only visible when Frequency ≠ One-Time.

#### Behavior

- Valid range: **start date month** to **last month of retirement**.
- Default value: **End of Retirement**.
- Same auto-advance behavior as #27f if start date is moved past end date.
- Below the input, a small muted helper (~10px): _"X payments totaling ~$XXX,XXX"_ — computed from frequency, amount, start date, and end date. If inflation-adjusted, adds _"(inflation-adjusted, nominal total will be higher)"_.

#### State

- `expenseEvents[i].endDate`: `{ month: number, year: number }` | `"end-of-retirement"`

---

### Sub-Affordance #30g: Inflation-Adjusted Toggle

**Purpose:** Determines whether a recurring expense amount grows with inflation each year or remains a fixed nominal amount.

**Control type:** Small labeled toggle switch (identical pattern to Income Event #27g)

#### Appearance

- Compact toggle switch (~32px wide, ~18px tall) with label "Inflation-Adj." to its left, ~12px text.
- Right side of Row 4, vertically centered.
- Off state: gray track. On state: app's accent color.
- **Visibility:** Only visible when Frequency ≠ One-Time.

#### Behavior

- Default: **On** (most large recurring expenses like insurance, property taxes, and healthcare premiums rise with inflation).
- Same inflation logic as Income Event #27g, but applied as a deduction rather than a deposit.

#### State

- `expenseEvents[i].inflationAdjusted`: boolean

---

## Affordance #31: Add Expense Event Button

**Purpose:** Adds a new expense event card.

**Control type:** Split button with preset menu (same pattern as Income Event #28)

### Main Button Appearance

- Positioned below the last expense event card (or below the empty state placeholder), left-aligned.
- Ghost/outline button: no background fill, 1px dashed border in the **muted red** expense color, text in the same red.
- Icon: small "+" to the left.
- Label: "+ Add Expense"
- Size: auto-width, ~32px height.
- **No maximum limit** on the number of expense events.

### Split Button Chevron

- Right ~20% of the button: small chevron (▾) separated by a thin vertical divider. Clicking it opens the preset menu.

### Preset Menu Options

| Preset | Name | Amount | Source From | Date | Frequency | End Date | Inflation-Adj. |
|---|---|---|---|---|---|---|---|
| New Roof | "New Roof" | $25,000 | Follow Strategy | Month 120 (yr 10) | One-Time | — | — |
| Vehicle Purchase | "Vehicle Purchase" | $40,000 | Follow Strategy | Month 60 (yr 5) | One-Time | — | — |
| Medical Procedure | "Medical Procedure" | $50,000 | Follow Strategy | Month 180 (yr 15) | One-Time | — | — |
| Gift to Children | "Gift to Children" | $50,000 | Follow Strategy | Month 120 (yr 10) | One-Time | — | — |
| Long-Term Care | "Long-Term Care" | $5,000 | Cash | Month 300 (yr 25) | Monthly | End of Retirement | On |
| Property Tax | "Property Tax" | $8,000 | Cash | Month 1 | Annually | End of Retirement | On |
| Home Insurance | "Home Insurance" | $3,000 | Cash | Month 1 | Annually | End of Retirement | On |

### Preset Menu Appearance

- Small dropdown menu below the button, ~220px wide.
- Each preset: name + small muted description (e.g., "New Roof — $25,000 one-time").
- Selecting a preset creates a pre-filled expense card. User can modify all fields.
- Bottom of the menu: divider + **"Blank"** option for a fully empty card.

### Behavior

- **Main button click:** Creates a blank expense card with defaults: empty name, $0 amount, Follow Drawdown Strategy, Month 1 date, One-Time frequency.
- **Preset click:** Creates a pre-filled card. Name input does **not** auto-focus (since it's already filled).
- **Blank card click:** Same as main button. Name input auto-focuses.
- Empty state placeholder disappears when first card is added.

### State

- No unique state — modifies the `expenseEvents` array.

---

## Affordance #32: Remove Expense Event Button

**Purpose:** Removes an expense event card.

**Control type:** Icon button (per card)

### Appearance

- Identical positioning and styling to Income Event remove button (#29): top-right corner of each card, × icon, ~24px square, muted gray → muted red on hover.
- Always visible on every card.

### Behavior

- **On click:** No confirmation dialog. Card animates out (fade-out + height collapse, 200ms ease).
- If the removed card was the last one, the empty state placeholder reappears.
- No output recalculation until Run Simulation. In Tracking Mode, removal triggers immediate re-forecast.

### State

- No unique state — modifies the `expenseEvents` array.

---

## Interaction Between Expenses and Regular Withdrawals

An important engine-level design decision that affects how the user interprets the table output:

### Processing Order Within a Month

Each month in the simulation processes in this order:

1. **Market returns** are applied to each asset class (portfolio grows or shrinks).
2. **Income events** fire (deposits into the specified asset class).
3. **Regular withdrawal** is calculated by the withdrawal strategy and sourced via the drawdown strategy.
4. **Expense events** fire (deducted from the specified asset class or via drawdown strategy).
5. **End-of-month portfolio value** is recorded.

### Expenses Are Additive to Regular Withdrawals

Large expenses are deducted **on top of** the regular monthly withdrawal. They do not reduce the regular withdrawal amount. This means:

- In a month with a $4,000 regular withdrawal and a $25,000 roof expense, the total outflow is $29,000.
- The spending phase min/max bounds apply **only to the regular withdrawal**, not to irregular expenses. This is intentional — a $25,000 roof can't be deferred because your spending cap is $8,000/month.
- In the detail table, regular withdrawals and irregular expenses appear in **separate columns** so the user can clearly see the breakdown.

### Impact on Withdrawal Strategy Calculations

Some withdrawal strategies (e.g., Percent of Portfolio, VPW) base the next year's withdrawal on the current portfolio value. Since expenses reduce the portfolio, a large expense indirectly reduces future regular withdrawals — but this is handled naturally by the strategy's formula operating on the (now smaller) portfolio, not through any special logic.

### What If the Portfolio Can't Cover the Expense?

If an expense fires in a month where the portfolio has insufficient funds in the specified (or fallback) asset classes:
- The expense is **partially fulfilled** — the portfolio gives what it can, down to $0.
- The unfulfilled portion is recorded in the table as a shortfall (e.g., "Expense: $25,000 (shortfall: $8,000)") in a muted red annotation.
- The simulation continues — the portfolio is now at $0 (or near it), and subsequent months will likely also fail to meet withdrawals.

---

## Visual Consistency with Income Events

The intentional structural mirroring between Income (#27) and Expense (#30) cards creates a learnable pattern:

| Aspect | Income Card | Expense Card |
|---|---|---|
| Left border accent | Muted green | Muted red |
| Corner icon | ↓ (inflow) | ↑ (outflow) |
| Button/border color | Muted green | Muted red |
| "Deposit Into" / "Source From" | 3 asset classes | 3 asset classes + "Follow Strategy" |
| Frequency options | One-Time, Monthly, Quarterly, Annually | One-Time, Monthly, Annually |
| Default frequency | Monthly | One-Time |

The structural similarity means that once a user has configured an income event, configuring an expense feels immediately familiar. The color coding provides the only necessary differentiation.

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Add an expense event (blank or preset) | New card animates in. No recalculation. |
| Edit any field on an expense event | Reactive updates to helper labels (total payments, per-frequency label). No output recalculation until Run Simulation. |
| Change frequency between one-time and recurring | Row 4 hides/shows. Helper labels update. |
| Change "Source From" to Follow Strategy vs. specific class | No visual change beyond the dropdown. Affects simulation engine behavior. |
| Remove an expense event | Card animates out. Empty state may reappear. No recalculation until Run Simulation. |
| In Tracking Mode, any expense event change | Projected months re-forecast immediately. |
| Run Simulation | Engine deducts expense amounts from the appropriate asset class in the appropriate months, after regular withdrawals are processed. |


# Output Area — Section: Summary Statistics Bar (#33–#41)

The Summary Statistics Bar sits at the top of the output area, providing an at-a-glance overview of the simulation results. It displays key financial metrics as a horizontal row of stat cards — the first thing the user sees after running a simulation, and the quickest way to assess whether a retirement plan is viable.

## Section Container

- **Position:** Top of the output area, spanning the full width of the main content region (everything to the right of the sidebar).
- **No section header.** Unlike the input panel sections, the summary stats don't need a labeled header — their position and visual weight make their role self-evident. A header would add unnecessary visual clutter to the output area.
- **Background:** Very subtle background distinction from the rest of the output area — a faint tinted band (e.g., `#F8F9FB`, barely perceptible) that spans the full width, creating a gentle visual "shelf" for the stat cards. This separates the stats from the chart below without a hard divider.
- **Internal padding:** ~16px top and bottom, ~16px horizontal (matching the output area's general padding).
- **Layout:** The stat cards are arranged in a **single horizontal row that wraps** on narrower screens. On a typical desktop width (~900–1200px of output area), all cards fit in one or two rows. Cards use a CSS grid or flexbox with `gap: 12px` and `flex-wrap: wrap`.

## General Stat Card Design

All nine stat cards (#33–#41) share a common design pattern:

### Appearance

- **Card dimensions:** Flexible width (grows to fill available space in the row), minimum width ~140px, height ~80px.
- **Card styling:** White background, 1px border (light gray, `#E5E7EB`), rounded corners (8px), subtle box shadow (`0 1px 3px rgba(0,0,0,0.06)`). This gives each card a slight "lifted" feel without being heavy.
- **Internal layout (vertical, top to bottom):**
  1. **Metric label** — small muted text (~11px), uppercase, letter-spacing 0.5px. E.g., `TOTAL DRAWDOWN (REAL)`. Positioned at the top of the card, left-aligned. This is the least prominent element — the user's eye should go to the value first.
  2. **Metric value** — large bold text (~22px), dark color, left-aligned. E.g., `$1,847,230`. This is the primary visual element. Uses tabular/monospace numerals for alignment across cards.
  3. **Secondary annotation** (optional) — very small muted text (~10px), positioned below the value. Used for contextual details like a comparison, percentage, or qualifier.

### State-Based Styling

- **Before any simulation has run (idle state):** All value fields show **"—"** in muted gray text. The cards are present but clearly unpopulated.
- **While a simulation is running:** Values show a subtle shimmer/skeleton animation (a slow left-to-right gradient pulse on the value area) to indicate loading. Labels remain static.
- **After simulation completes:** Values populate with a quick fade-in (150ms). If a value changed from the previous run, the value text briefly flashes with a subtle highlight (faint yellow background, 500ms fade-out) to draw attention to changes.

---

## Affordance #33: Total Drawdown (Nominal)

**Purpose:** The total sum of all regular withdrawals over the entire retirement period, in nominal (not inflation-adjusted) dollars. Gives the user a raw sense of total spending.

### Appearance

- **Label:** `TOTAL DRAWDOWN (NOMINAL)`
- **Value:** Dollar amount with comma formatting and appropriate abbreviation for large numbers (e.g., `$2.43M` for values over $1M; `$847,230` for values under $1M). The abbreviation threshold keeps the large text readable within the card width.
- **Secondary annotation:** None.

### Behavior

- Computed as the sum of all monthly withdrawal amounts (nominal) across the full retirement period.
- Does **not** include irregular expenses or income events — this is strictly the withdrawal strategy's output. (Irregular expenses appear in a separate context.)
- In Monte Carlo mode: displays the **median** (50th percentile) total drawdown across all simulations. The label gains a small superscript annotation: _"median"_ in muted text to the right of the value.

### State

- Derived from simulation results.

---

## Affordance #34: Total Drawdown (Real)

**Purpose:** The total sum of all regular withdrawals, deflated to today's dollars. This is the more meaningful number — it tells the user what their total spending is worth in current purchasing power.

### Appearance

- **Label:** `TOTAL DRAWDOWN (REAL)`
- **Value:** Same formatting as #33 (abbreviated for large numbers).
- **Secondary annotation:** A small comparison to the nominal value: _"XX% of nominal"_ — helping the user instantly grasp how much inflation erodes total spending over the retirement period. E.g., _"76% of nominal"_.

### Behavior

- Computed as the sum of all monthly withdrawal amounts deflated to today's dollars using the configured inflation rate. For month `m`, the real value = nominal value ÷ (1 + inflation)^(m/12).
- In Monte Carlo mode: displays the median, with _"median"_ superscript annotation.

### State

- Derived from simulation results.

---

## Affordance #35: Median Monthly Withdrawal (Real)

**Purpose:** The median of all monthly withdrawal amounts (in real dollars) across the retirement period. Gives the user a sense of the "typical" monthly income they can expect.

### Appearance

- **Label:** `MEDIAN MONTHLY (REAL)`
- **Value:** Dollar amount, not abbreviated (monthly values are always <$1M). E.g., `$4,127`.
- **Secondary annotation:** _"$X,XXX / year"_ — the annualized equivalent (value × 12), since many users think in annual terms.

### Behavior

- Computed as the statistical median of all monthly real withdrawal amounts.
- In Monte Carlo mode: the median is computed from the **median simulation path's** monthly withdrawals (i.e., the 50th percentile path, then take the median of its monthly values). The annotation adds _"median path"_.

### State

- Derived from simulation results.

---

## Affordance #36: Mean Monthly Withdrawal (Real)

**Purpose:** The arithmetic mean of all monthly withdrawal amounts (in real dollars). Together with the median (#35), helps the user understand the distribution shape — if the mean is significantly higher than the median, withdrawals are positively skewed (a few large months pull the average up).

### Appearance

- **Label:** `MEAN MONTHLY (REAL)`
- **Value:** Dollar amount, same formatting as #35. E.g., `$4,312`.
- **Secondary annotation:** The difference from the median: _"+$185 vs. median"_ or _"−$42 vs. median"_ — making the mean-median comparison effortless. Positive difference in muted green text; negative in muted red.

### Behavior

- Computed as the arithmetic mean of all monthly real withdrawal amounts.
- In Monte Carlo mode: computed from the median simulation path (same as #35).

### State

- Derived from simulation results.

---

## Affordance #37: Std. Deviation of Withdrawals (Real)

**Purpose:** The standard deviation of monthly withdrawal amounts (in real dollars). Measures withdrawal volatility — how much the user's income fluctuates from month to month. A low std. dev. means stable income; a high one means significant swings.

### Appearance

- **Label:** `STD. DEVIATION (REAL)`
- **Value:** Dollar amount. E.g., `$487`.
- **Secondary annotation:** Coefficient of variation as a percentage: _"CV: XX%"_ — computed as (std. dev. ÷ mean) × 100. This normalizes the volatility relative to the income level. A CV under ~10% is very stable; over ~30% is quite volatile. The percentage is colored on a gradient: green for low CV (≤10%), amber for moderate (10–25%), muted red for high (>25%).

### Behavior

- Computed as the population standard deviation of all monthly real withdrawal amounts.
- In Monte Carlo mode: computed from the median simulation path.

### State

- Derived from simulation results.

---

## Affordance #38: 25th Percentile Withdrawal (Real)

**Purpose:** The 25th percentile of monthly real withdrawal amounts — in a "bad month" (bottom quartile), the user's income drops to at least this level. Helps set expectations for downside income.

### Appearance

- **Label:** `25TH PERCENTILE (REAL)`
- **Value:** Dollar amount. E.g., `$3,640`.
- **Secondary annotation:** _"XX% of median"_ — showing the 25th percentile as a fraction of the median. E.g., _"88% of median"_. This communicates the downside relative to the typical income.

### Behavior

- Computed as the 25th percentile of the distribution of all monthly real withdrawal amounts across the retirement period.
- In Monte Carlo mode: computed from the median simulation path.

### State

- Derived from simulation results.

---

## Affordance #39: 75th Percentile Withdrawal (Real)

**Purpose:** The 75th percentile of monthly real withdrawal amounts — in a "good month" (top quartile), the user's income reaches at least this level. Helps set expectations for upside income.

### Appearance

- **Label:** `75TH PERCENTILE (REAL)`
- **Value:** Dollar amount. E.g., `$4,870`.
- **Secondary annotation:** _"XX% of median"_ — e.g., _"118% of median"_.

### Behavior

- Computed as the 75th percentile, symmetric logic to #38.
- In Monte Carlo mode: computed from the median simulation path.

### State

- Derived from simulation results.

---

## Affordance #40: Terminal Portfolio Value

**Purpose:** The portfolio balance remaining at the end of the retirement period. This is one of the most important numbers — it tells the user whether they "survived" (positive value) or "failed" (ran out of money before the end), and by how much.

### Appearance

- **Label:** `TERMINAL VALUE`
- **Value:** Dollar amount with abbreviation for large numbers. E.g., `$412K` or `$0`.
- **Value color:** This is the one stat card where the value itself is color-coded:
  - **Positive value (>$0):** Green text (e.g., `#2E7D32`). The portfolio survived.
  - **Zero ($0):** Red text (e.g., `#C62828`). The portfolio was fully depleted.
- **Secondary annotation:**
  - If positive: _"XX% of starting portfolio"_ — showing how much of the original nest egg remains. E.g., _"31% of starting"_.
  - If zero: _"Depleted in month XXX (age XX)"_ — identifying exactly when the money ran out. This is critical information. The text is in red to match the value.
- **Card border override:** When the terminal value is $0, the card's border changes to a subtle red (1px, `#FFCDD2`) and the background tints very faintly red (`#FFF5F5`). This makes the failure state visually prominent without being alarming — the user needs to notice it, but it shouldn't feel like an error.

### Behavior

- In **Manual mode (single stochastic path):** Displays the terminal value from that single simulation run.
- In **Monte Carlo mode:** Displays the **median** terminal value (50th percentile across all simulations). The annotation adds _"median"_ superscript. Additionally:
  - If the median terminal value is $0 (meaning more than half of simulations failed), the card uses the red failure styling.
  - If the median is positive but some simulations failed, the card uses the green success styling but the secondary annotation notes: _"XX% of simulations depleted"_ in a muted amber/red, giving the user the full picture.

### State

- Derived from simulation results.

---

## Affordance #41: Probability of Success

**Purpose:** The percentage of Monte Carlo simulations in which the portfolio survived the full retirement period (terminal value > $0). This is the single most important metric in Monte Carlo mode — the headline number that answers "will my money last?"

### Appearance

- **Label:** `PROBABILITY OF SUCCESS`
- **Value:** Percentage displayed as a large number with one decimal place. E.g., `94.2%`. No dollar sign — this is the only non-dollar stat in the bar.
- **Value size:** Slightly larger than other stat cards (~26px instead of ~22px) to emphasize its importance.
- **Value color:** Color-coded on a gradient:
  - ≥ 90%: Green (`#2E7D32`)
  - 75%–89%: Amber (`#F57F17`)
  - < 75%: Red (`#C62828`)
- **Secondary annotation:** _"X,XXX of Y,YYY simulations survived"_ — the raw count. E.g., _"942 of 1,000 simulations survived"_. This grounds the percentage in concrete numbers.
- **Card styling override:** This card has a **slightly larger visual footprint** than the others:
  - The card's border is 2px (instead of 1px) in a color matching the value color (green/amber/red at ~30% opacity).
  - The card background has a very faint tint matching the value color (~5% opacity).
  - This makes the card the visual anchor of the entire stat bar — the user's eye is naturally drawn to it.

### Visibility

- **Visible when Monte Carlo mode is active AND a simulation has been run, regardless of whether the Mode Toggle is Planning or Tracking.** When in Manual mode, this card is entirely absent — the space collapses and the other cards distribute to fill the row.
- When transitioning from Monte Carlo to Manual (or vice versa), the card fades in/out (150ms) and the other cards reflow smoothly.

### Behavior

- Computed as: (number of simulations where terminal portfolio value > $0) ÷ (total simulations) × 100.
- A simulation "survives" if the portfolio has any positive balance at the end of the retirement period, even $1.
- The color thresholds (90%/75%) are based on common financial planning standards. Some planners consider 85%+ acceptable; others insist on 95%+. These thresholds are **not configurable** by the user — they're hardcoded visual guidance. (A v2 could let users set their own "acceptable" threshold.)
* **Behavior in Tracking Mode:**
  - Displays the percentage of Monte Carlo simulations that survived the full retirement period, computed from the latest Monte Carlo run.
  - The simulations incorporate the user's actual data for historical months, then diverge stochastically from the last actual forward. This means the PoS answers: _"Given my actual portfolio performance so far, what's the probability my money lasts?"_
  - **Secondary annotation in Tracking Mode:** In addition to the standard _"X of Y simulations survived"_, add a second line: _"Projected from [month/year of last actual]"_ — clarifying the point from which the Monte Carlo fanned out. E.g., _"Projected from Mar 2030"_.
* **Stale Display:**
  * When Monte Carlo results are stale in Tracking Mode (user edited an actual after the last MC run):
    - The value text drops to ~60% opacity.
    - A small ⚠ icon appears to the right of the percentage value.
    - The secondary annotation gains an additional line in muted amber text: _"Actuals changed — re-run for updated results."_
    - The card's enhanced border (normally colored by the success threshold) changes to a neutral gray, removing the green/amber/red signal until fresh results are available. This prevents the user from trusting a stale probability.

### State

- Derived from Monte Carlo simulation results.
- `null` when in Manual mode or when no simulation has been run.

---

## Layout Behavior

### Card Arrangement

The nine cards (or eight, when Probability of Success is hidden) are arranged using a responsive CSS grid:

- **Wide desktop (~1200px+ output area width):** All cards in a single row. This is the ideal layout — all metrics are visible simultaneously without scrolling.
- **Standard desktop (~900–1199px):** Cards wrap into two rows. The first row contains the five most important cards: Probability of Success (if visible), Terminal Value, Total Drawdown (Real), Median Monthly, Mean Monthly. The second row contains: Std. Deviation, 25th Percentile, 75th Percentile, Total Drawdown (Nominal). This ordering prioritizes the metrics a user scans first.
- **Narrow or tablet (~600–899px):** Cards wrap into three rows of 2–3 cards each.
- The **Probability of Success card** (#41), when visible, always occupies the **first position** (top-left) in the flow, regardless of screen width. Its larger styling and color coding make it the natural starting point for scanning the results.
- The **Terminal Value card** (#40) always occupies the **second position**, directly after Probability of Success (or first if PoS is hidden).

### Scrolling

- The stat bar does **not scroll horizontally**. Cards wrap to additional rows as needed. This ensures all metrics are always visible without interaction.
- The stat bar does **not have a sticky/fixed position** — it scrolls with the rest of the output area. (The chart and table below are more frequently referenced; making the stats sticky would consume valuable vertical space.)

---

## Monte Carlo Mode vs. Manual Mode Display Differences

| Aspect | Manual Mode | Monte Carlo Mode |
|---|---|---|
| Number of cards | 8 (no Probability of Success) | 9 (all cards) |
| Values represent | Results from a single stochastic path | Median values across all simulation paths |
| Superscript annotation | None | _"median"_ on applicable cards |
| Probability of Success | Hidden | Visible, prominent |
| Terminal Value failure styling | Red if $0 on that single path | Red if median is $0; amber note if some paths failed |

---

## Tracking Mode Considerations

In **Tracking Mode**, the summary stats reflect a hybrid of actuals and projections:

- For months where the user has entered actual values, the stats use those actual withdrawals.
- For projected future months, the stats use the forecasted values.
- The stats are recomputed immediately whenever the user edits an actual value in the table (reactive in Tracking Mode).
- No Monte Carlo in Tracking Mode, so the Probability of Success card is always hidden.
- The Terminal Value is based on the single projected path from the current actuals forward — it answers "given what's happened so far and my current settings, where am I headed?"

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Run Simulation (first time) | Stats transition from "—" idle state to populated values with fade-in. |
| Run Simulation (subsequent) | Stats update. Changed values briefly highlight. |
| Switch from Manual to Monte Carlo (or vice versa) | PoS card appears/disappears. Other cards reflow. Values show results from the last run of the now-active mode (or "—" if that mode hasn't been run). |
| Switch to Tracking Mode | PoS card hidden. Stats reflect actuals + projection. |
| Edit an actual in Tracking Mode | Stats recompute and update immediately. |
| Resize browser window | Cards reflow into appropriate number of rows. |

# Output Area — Section: Portfolio Chart (#42–#48)

The Portfolio Chart is the primary visualization of the app — a time-series chart showing how the portfolio value evolves over the entire retirement period. It sits directly below the Summary Statistics Bar and above the Detail Table. In a single glance, the user can see whether their portfolio survives, when it peaks, when it declines, and (in Monte Carlo mode) the range of possible outcomes.

## Section Container

- **Position:** Directly below the Summary Statistics Bar, spanning the full width of the output area.
- **No section header.** The chart is visually self-evident. A header would waste vertical space.
- **Chart height:** ~360px on desktop. This is large enough to show meaningful detail across a 40-year timeline without dominating the page. On narrower viewports (<900px), the height can reduce to ~280px.
- **Horizontal padding:** ~16px left and right, matching the output area's general padding.
- **Top margin:** ~16px below the stat bar.
- **Bottom margin:** ~24px above the Detail Table, providing a clear visual break.

---

## Affordance #42: The Chart Itself

**Purpose:** Displays portfolio value over time as a line or area chart, adapted to the current simulation mode and display toggles.

**Control type:** Interactive time-series chart (line/area)

### Appearance

#### Axes

- **X-axis (time):**
  - Spans from Month 1 to the last month of retirement.
  - Tick labels show **years**, not months, to avoid clutter: "Year 1", "Year 5", "Year 10", etc. Tick interval adapts to the retirement duration — roughly 8–12 ticks across the axis regardless of duration.
  - A secondary subtle label below each major tick shows the **age** in parentheses: "(55)", "(60)", "(65)". This dual labeling eliminates mental arithmetic.
  - Axis line: thin (1px), muted gray. Tick marks: small (4px) downward dashes.
  
- **Y-axis (portfolio value):**
  - Starts at $0 (always — even if the portfolio never drops that low, anchoring at zero gives an honest visual sense of scale).
  - Upper bound: auto-scaled to ~110% of the maximum portfolio value in the displayed data, providing breathing room above the peak.
  - Tick labels use abbreviated currency formatting: "$0", "$500K", "$1.0M", "$1.5M", "$2.0M". Roughly 5–7 ticks.
  - Axis line: thin (1px), muted gray.
  - Horizontal grid lines at each Y-tick: very faint dashed lines (1px, `#F0F0F0`), extending across the full chart width. These help the eye track values horizontally without cluttering the chart.

- **$0 reference line:** A distinct horizontal line at y=$0, slightly more prominent than the grid lines (1px solid, muted red-gray, `#CCBBBB`). This is the "failure line" — if the portfolio curve touches it, the money has run out. Making it subtly distinct from other grid lines draws the eye to this critical threshold.

#### Chart Background

- Clean white (`#FFFFFF`). No gradient, no texture. The data should be the most prominent visual element.

#### Chart Rendering by Mode

The chart renders differently depending on the simulation mode:

**Manual Mode (single stochastic path):**
- A single line showing the total portfolio value over time.
- Line color: app's primary color (e.g., dark navy, `#1A365D`). Line width: 2px. Smooth (anti-aliased).
- The area below the line is filled with a very faint gradient of the same color (~8% opacity at the line, fading to ~2% at $0). This subtle fill gives the chart visual weight without obscuring grid lines.

**Monte Carlo Mode (confidence bands):**
- No single "main" line. Instead, **layered confidence bands**:
  - **10th–90th percentile band:** Widest band. Filled with the app's primary color at ~8% opacity. This represents the "almost everything falls within here" range.
  - **25th–75th percentile band:** Narrower band, nested inside the 10th–90th. Filled at ~15% opacity. This is the "likely range."
  - **50th percentile (median) line:** A solid line through the center of the bands. Primary color, 2px width. This is the "most likely path."
- The layered bands create a natural "funnel" shape that widens over time (reflecting increasing uncertainty), which is immediately intuitive even for users unfamiliar with confidence intervals.
- A small **legend** in the top-right corner of the chart area (inside the chart, not outside):
  - Three entries, stacked vertically, each ~12px text:
    - Solid line swatch + "Median (50th)"
    - Medium opacity swatch + "25th – 75th percentile"
    - Light opacity swatch + "10th – 90th percentile"
  - The legend has a semi-transparent white background (`rgba(255,255,255,0.85)`) with rounded corners and a subtle border, so it's readable over the chart data without fully obscuring it.

**Tracking Mode:**
- The chart shows **two visual phases** separated by a vertical marker:
  - **Actuals phase (left of marker):** Solid line, 2.5px width, primary color at full opacity. These are the real-world values the user has entered.
  - **Projection phase (right of marker):** Dashed line, 2px width, primary color at ~60% opacity. These are the forecasted values from the last actual data point forward.
  - **"Today" vertical marker:** A vertical dashed line at the boundary between actuals and projections. Line style: 1px dashed, muted blue-gray. At the top of the line, a small label: _"Actuals → Projections"_ in muted text (~10px), with a small downward-pointing arrow.
- The area fill behaves the same way: solid fill (~8% opacity) under the actuals line, lighter/more transparent fill under the projection line.

### Behavior

- **Initial state (no simulation run):** The chart area is empty — axes are drawn with labels, the $0 reference line is visible, but no data is plotted. A centered message in muted text (~14px): _"Run a simulation to see your portfolio projection."_
- **On simulation complete:** The chart data renders with a quick draw-on animation: the line (or bands) draw from left to right over ~600ms, as if being "drawn" across the timeline. This provides a satisfying moment of reveal and naturally draws the user's eye across the timeline.
- **On subsequent simulation runs:** The old data crossfades to the new data (300ms). No draw-on animation for re-runs — it would feel slow on repeated iterations.

### State

- Derived from simulation results: arrays of monthly portfolio values (single path for Manual, percentile arrays for Monte Carlo, actuals + projection for Tracking).

---

## Affordance #43: Real vs. Nominal Toggle

**Purpose:** Switches the chart between displaying portfolio values in nominal dollars (future dollars, including inflation) and real dollars (today's purchasing power). Over a 40-year retirement, this difference is dramatic — a portfolio that looks healthy in nominal terms may be far less impressive in real terms.

**Control type:** Segmented toggle (two segments)

### Appearance

- Positioned **above the chart**, right-aligned, within the chart's top margin area.
- Small segmented toggle: two segments, "Nominal" and "Real". ~140px total width, ~28px height.
- Same styling as other segmented toggles in the app: active segment filled, inactive transparent. Uses a lighter/more muted fill color than the page-level toggles to indicate this is a local display control, not a global mode switch.
- A small label to the left of the toggle: "Values:" in muted text (~11px).

### Behavior

- Default: **Nominal** (shows the raw dollar amounts as they would appear in the future).
- Switching between modes:
  - The Y-axis rescales smoothly (300ms ease) to accommodate the new value range. Real values are always ≤ nominal values (deflated by inflation), so switching to Real will compress the Y-axis downward.
  - The line/bands morph smoothly to their new positions (300ms). This animation makes the inflation impact viscerally apparent — the user sees the portfolio "shrink" when switching to Real.
  - The Y-axis tick labels update to reflect the new values.
  - The chart tooltip (#47) also updates to show values in the selected denomination.
- **This toggle also affects the Detail Table's "Real" columns** — but only the chart. The table always shows both nominal and real in separate columns. The toggle is chart-specific.

### State

- `chartDisplayMode`: `"nominal"` | `"real"`

---

## Affordance #44: Asset Class Breakdown Toggle

**Purpose:** Switches the chart between showing the total portfolio value as a single line and showing the value broken down by asset class as a stacked area chart. This lets the user see how the portfolio composition changes over time — especially useful for visualizing bucket depletion or rebalancing drift.

**Control type:** Toggle switch with label

### Appearance

- Positioned **above the chart**, to the left of the Real/Nominal toggle (#43), with ~16px gap between them.
- A small labeled toggle switch: toggle track (~36px wide, ~20px tall) with the label "By Asset Class" to its left (~12px text).
- Off state: gray track (total portfolio view). On state: app's accent color (breakdown view).

### Behavior

- Default: **Off** (total portfolio view).
- **Turning on:**
  - **In Manual mode / Tracking Mode (single line):** The single portfolio line transforms into a **stacked area chart** with three layers:
    - Bottom layer: Stocks (blue fill, ~60% opacity)
    - Middle layer: Bonds (teal fill, ~60% opacity)
    - Top layer: Cash (amber fill, ~60% opacity)
    - The top edge of the stacked area represents the total portfolio value (same shape as the single line).
    - Each layer's height represents the dollar value of that asset class at each point in time.
    - The layers are separated by thin white lines (1px) for clarity.
  - The transition from single line to stacked area animates smoothly (400ms ease): the single line "splits" into three layers expanding downward from the top.
  - A small **legend** appears in the top-right corner (replacing or augmenting the Monte Carlo legend if present):
    - ● Stocks (blue swatch)
    - ● Bonds (teal swatch)
    - ● Cash (amber swatch)
  
  - **In Monte Carlo mode:** Breakdown view shows the **median path's** asset class breakdown as a stacked area. The confidence bands are **hidden** when breakdown is on — showing confidence bands for three asset classes simultaneously would be visually chaotic. A small note appears near the legend: _"Showing median path breakdown. Confidence bands hidden."_

- **Turning off:**
  - The stacked area collapses back into a single line (reverse animation, 400ms). Confidence bands reappear if in Monte Carlo mode.

### State

- `chartBreakdownEnabled`: boolean

### Edge Cases

- **Bucket strategy depletion:** When an asset class is fully depleted under bucket strategy, its layer in the stacked area shrinks to zero height at that point. The visual is striking — the user literally sees an asset class "disappear" from the chart, which powerfully communicates the bucket strategy's sequential drawdown behavior.
- **Very small asset class:** If Cash is $5K in a $1.5M portfolio, its layer will be extremely thin. This is fine — the layer is still visible (minimum ~1px rendered height), and the tooltip provides exact values on hover.

---

## Affordance #45: Monte Carlo Confidence Bands

**Purpose:** When Monte Carlo mode is active and a simulation has been run, the confidence bands visualize the distribution of possible portfolio trajectories. This is not a separate interactive control — it's an automatic rendering behavior of the chart (#42) described here for completeness.

**Control type:** Automatic chart overlay (no user interaction)

### Appearance

Described in #42 under "Monte Carlo Mode" rendering. The key visual elements:

- 10th–90th percentile band (widest, lightest fill)
- 25th–75th percentile band (narrower, medium fill)
- 50th percentile median line (solid)

### Behavior

- Rendered automatically when Monte Carlo is the active simulation mode and results exist.
- Hidden when Asset Class Breakdown (#44) is on.
- Hidden when in Tracking Mode (no Monte Carlo in Tracking).
- The bands are rendered as SVG or canvas filled paths, not as individual simulation lines. This ensures clean rendering even with 1,000+ simulations.

### Design Note: Why Not Show Individual Simulation Paths?

Some retirement calculators show all N simulation paths as individual semi-transparent lines (a "spaghetti chart"). This looks dramatic but is visually noisy and difficult to interpret — 1,000 overlapping lines create an undifferentiated blob. The confidence band approach is cleaner, more informative (the user sees exact percentile ranges), and renders more efficiently.

---

## Affordance #46: Tracking Mode Overlay

**Purpose:** When in Tracking Mode, visually distinguishes the actual (historical) portion of the chart from the projected (future) portion. This is an automatic rendering behavior described here for completeness.

**Control type:** Automatic chart overlay (no user interaction)

### Appearance

Described in #42 under "Tracking Mode" rendering:

- Solid line for actuals
- Dashed line for projections
- Vertical "Today" marker at the boundary

### Additional Detail: Actual Data Points

- Each month where the user has entered actual values is marked with a small **data point marker** on the solid line: a circle, ~5px diameter, white fill with a 2px border in the primary color. These markers confirm to the user exactly where their manually entered data sits.
- Months that are actual but were *not* edited by the user (i.e., they are interpolated or computed from surrounding actuals) do **not** get markers — only explicitly user-entered months get them. This distinction helps the user see where their real data is versus where the app filled in.

### Behavior

- Rendered automatically when in Tracking Mode and at least one actual value has been entered.
- If no actuals exist in Tracking Mode, the entire line is dashed (all projection), and no "Today" marker appears.
- As the user enters more actuals (editing cells in the table), the solid portion of the line extends rightward and the "Today" marker moves accordingly. This update is **immediate** (reactive in Tracking Mode).

---

## Affordance #47: Chart Tooltip on Hover

**Purpose:** Shows exact values at a specific point in time when the user hovers over the chart. The tooltip provides precise numeric detail that the visual chart line can only approximate.

**Control type:** Hover-activated tooltip with vertical crosshair

### Appearance

- **Vertical crosshair:** A thin vertical line (1px, muted gray, dashed) that follows the cursor's horizontal position as the user moves the mouse over the chart area. The line extends the full height of the chart from the X-axis to the top.
- **Data point highlight:** Where the crosshair intersects the portfolio line (or median line in Monte Carlo mode), a filled circle (~7px diameter) appears at the intersection, colored in the primary line color. If Asset Class Breakdown is on, three circles appear (one on each layer boundary) in the respective asset class colors.
- **Tooltip card:** Positioned near the cursor, offset ~12px to the right and ~12px above to avoid obstructing the crosshair. If the cursor is in the right ~30% of the chart, the tooltip flips to the left side to avoid clipping.
  - Background: white, rounded corners (6px), subtle drop shadow, 1px light gray border.
  - Internal padding: ~10px.
  - Max width: ~220px.

### Tooltip Content

The tooltip content adapts to the current mode and toggles:

**Manual Mode, Total View (breakdown off):**
```
Year 15 (Age 70) — Month 180
────────────────────────────
Portfolio:     $1,247,830
               ($891,024 real)
```

**Manual Mode, Breakdown View:**
```
Year 15 (Age 70) — Month 180
────────────────────────────
Stocks:     $872,481  (69.9%)
Bonds:      $312,405  (25.0%)
Cash:        $62,944  ( 5.1%)
────────────────────────────
Total:    $1,247,830
```

**Monte Carlo Mode (breakdown off):**
```
Year 15 (Age 70) — Month 180
────────────────────────────
90th percentile:  $2,103,600
75th percentile:  $1,671,200
Median:           $1,247,830
25th percentile:    $904,510
10th percentile:    $641,200
```

**Tracking Mode:**
```
Year 3 (Age 58) — Month 36
────────────────────────────
Portfolio:     $1,312,450
               ($1,247,830 real)
Source: Actual ✓
```
_(or "Source: Projected" for future months)_

### Tooltip Typography

- Header line (year/age/month): semi-bold, ~12px, dark text.
- Divider: thin horizontal line.
- Labels ("Stocks:", "Portfolio:", "Median:"): regular weight, ~11px, muted color.
- Values: tabular/monospace numerals, ~11px, dark text, right-aligned.
- Percentages in breakdown: muted text, parenthetical.
- "Source: Actual ✓": small green text with checkmark. "Source: Projected": small muted gray text.

### Behavior

- The tooltip appears immediately (no delay) when the cursor enters the chart area and follows the cursor horizontally. It snaps to the nearest month — the crosshair doesn't land between data points.
- The tooltip disappears immediately when the cursor leaves the chart area.
- **Touch (mobile):** Tap-and-hold activates the tooltip. Dragging the finger horizontally moves the crosshair. Lifting the finger dismisses it.
- The tooltip respects the Real/Nominal toggle (#43): when "Real" is selected, the primary value shown is the real value, with the nominal in parentheses (reversed from the normal display).
- The tooltip updates at ~60fps as the cursor moves, with no perceptible lag.

### State

- No persistent state — purely a hover-driven transient display.

---

## Affordance #48: Chart Zoom / Pan

**Purpose:** Allows the user to zoom into a specific time range on the chart for closer inspection, and to pan across the timeline when zoomed in. Over a 40-year retirement (480 months), the full chart can feel compressed — zooming in reveals monthly-level detail.

**Control type:** Composite — scroll-to-zoom + drag-to-pan + range selector bar

### Range Selector Bar

A small **range selector** sits directly below the main chart, acting as both a minimap and a zoom control.

#### Appearance

- **Dimensions:** Full width of the chart area, ~40px height. Positioned immediately below the X-axis, with ~4px gap.
- **Content:** A miniature, simplified version of the main chart rendered inside the selector. This mini-chart shows the full timeline at all times (it never zooms), using a simple filled area in a very muted color (~10% opacity primary). No axes, no labels, no grid — just the shape.
- **Selection window:** A draggable, resizable highlighted region within the range selector that represents the currently visible portion of the main chart:
  - The selected region has a slightly tinted background (primary color at ~15% opacity) and two **drag handles** at its left and right edges: small vertical bars (~8px wide, full height of the range selector, primary color at ~40% opacity, with a cursor of `ew-resize` on hover).
  - The area outside the selection window is overlaid with a darker tint (white at ~50% opacity), dimming the unselected portion of the mini-chart.
- When the chart is fully zoomed out (showing the entire timeline), the selection window fills the entire range selector and the handles are at the far left and right edges.

#### Behavior

- **Resizing the window (zooming):** Dragging a left or right handle changes the visible time range in the main chart. The main chart smoothly rescales its X-axis (200ms ease) as the handle moves. Dragging the left handle rightward or the right handle leftward zooms in. Minimum zoom: ~12 months visible.
- **Dragging the window (panning):** Clicking and dragging the body of the selection window (between the handles) pans the visible range left or right. The main chart scrolls accordingly.
- **Double-click to reset:** Double-clicking anywhere in the range selector resets the zoom to the full timeline (the selection window expands to fill the entire bar with a smooth animation, 300ms).

### Scroll-to-Zoom (Desktop)

- **Mouse wheel over the main chart:** Scrolling up zooms in, scrolling down zooms out. The zoom is centered on the cursor's horizontal position. The range selector's selection window updates to reflect the new zoom level.
- **Zoom limits:** Minimum ~12 months visible, maximum = full timeline.

### Drag-to-Pan (Desktop)

- **Click and drag on the main chart:** When zoomed in, clicking and dragging horizontally on the chart area pans the view. The cursor changes to `grab` on hover (when zoomed in) and `grabbing` while dragging.
- When fully zoomed out, drag-to-pan is disabled (nothing to pan to). The cursor remains the default pointer.

### Touch Interactions (Mobile/Tablet)

- **Pinch-to-zoom:** Standard two-finger pinch gesture on the chart area zooms in/out.
- **Single-finger drag:** When zoomed in, a single-finger horizontal swipe pans the view.
- The range selector is also touch-interactive: drag the handles or the window body.

### Zoom-Dependent X-Axis Behavior

As the user zooms in, the X-axis tick labels adapt to the zoom level:

| Visible Range | X-Axis Tick Format | Tick Interval |
|---|---|---|
| > 20 years | "Year 1 (55)", "Year 5 (60)" | Every ~5 years |
| 5–20 years | "Year 12 (67)", "Year 13 (68)" | Every 1–2 years |
| 1–5 years | "Jan 2032", "Jul 2032" | Every ~6 months |
| < 1 year | "Jan", "Feb", "Mar" | Every 1–2 months |

This progressive detail reveals monthly granularity when zoomed in, which is especially useful in Tracking Mode for reviewing recent actuals.

### State

- `chartZoom`: `{ startMonth: number, endMonth: number }` — the currently visible range. Default: `{ startMonth: 1, endMonth: totalMonths }` (fully zoomed out).

---

## Chart Area Controls Layout Summary

The controls above the chart are arranged in a single horizontal row:

```
[By Asset Class toggle]          [Values: [Nominal | Real]]
```

- Left-aligned: Asset Class Breakdown toggle (#44)
- Right-aligned: Real/Nominal toggle (#43)
- Center space is empty (clean, uncluttered)

The range selector (#48) sits below the chart:

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                  MAIN CHART AREA                 │
│                  (360px height)                  │
│                                                  │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  ░░░░░░[═══════════════════]░░░░░░░░░░░░░░░░░░░  │  ← Range Selector (40px)
└──────────────────────────────────────────────────┘
```

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Run Simulation (first time) | Chart draws on with left-to-right animation (~600ms). |
| Run Simulation (subsequent) | Chart crossfades to new data (300ms). |
| Toggle Real / Nominal | Y-axis rescales, line/bands morph smoothly (300ms). |
| Toggle Asset Class Breakdown | Line transforms to/from stacked area (400ms). MC bands hide/show. |
| Hover over chart | Vertical crosshair + tooltip appear, following cursor. |
| Scroll wheel on chart | Zoom in/out centered on cursor. Range selector updates. |
| Drag on chart (when zoomed) | Pan the visible range. Range selector updates. |
| Drag range selector handles | Zoom the main chart. |
| Drag range selector body | Pan the main chart. |
| Double-click range selector | Reset to full zoom (300ms animation). |
| Switch to Tracking Mode | Chart shows solid/dashed split with "Today" marker. |
| Edit an actual in Tracking Mode | Chart updates reactively — solid line extends, projections recalculate. |
| Resize browser | Chart redraws at new dimensions. Range selector scales proportionally. |

# Output Area — Section: Detail Table (#49–#56)

The Detail Table is the app's most data-dense output — a month-by-month (or year-by-year) ledger of the entire retirement simulation. It shows portfolio balances, market movements, withdrawals, income, expenses, and end-of-period values. It serves as both a verification tool (did the simulation do what I expected?) and a planning reference (what does month 237 look like?).

## Section Container

- **Position:** Below the Portfolio Chart, spanning the full width of the output area.
- **Section header row:** A thin horizontal bar containing the table's controls (Monthly/Annual toggle, Asset Class Columns toggle, Export button). This header row is **sticky** — it remains visible at the top of the table when scrolling vertically through rows. Background: white with a subtle bottom border (1px, light gray) and a faint drop shadow (0 2px 4px rgba(0,0,0,0.04)) to indicate it's floating above the scrolling content.
- **Top margin:** ~24px below the chart's range selector.
- **Table height:** The table does not have a fixed height. It renders all rows and the page scrolls naturally. However, the **column headers** (below the controls bar) are also sticky, positioned directly below the controls bar when scrolling.

---

## Table Controls Bar

The controls bar sits above the table column headers and contains three elements arranged horizontally:

```
[Monthly | Annual]     [☐ Show Asset Classes]     [⬇ Export CSV]
```

- **Left-aligned:** Monthly/Annual toggle (#49)
- **Center:** Asset Class Columns toggle (#50 — new number, replaces the old expandable rows concept)
- **Right-aligned:** Export CSV button (#56)

---

## Affordance #49: Monthly / Annual View Toggle

**Purpose:** Switches the table between showing every individual month (up to 480 rows for a 40-year retirement) and an aggregated annual view (up to 40 rows). The annual view sums or averages monthly values as appropriate.

**Control type:** Segmented toggle (two segments)

### Appearance

- Small segmented toggle: "Monthly" and "Annual". ~160px total width, ~28px height.
- Same styling as other local toggles (lighter fill than page-level toggles).

### Behavior

- Default: **Annual** (the monthly view for a 40-year retirement is 480 rows — starting with the more digestible annual view is a better default experience).
- **Switching to Monthly:** The table expands to show one row per month. All dollar values are monthly figures. The Period column shows month numbers (Planning) or month/year dates (Tracking).
- **Switching to Annual:** The table collapses to one row per year. Values are aggregated:

  | Column | Aggregation Method |
  |---|---|
  | Period | Year number or calendar year |
  | Age | Age at start of that year |
  | Portfolio Start | Portfolio value at the start of the year (= Month 1 of that year) |
  | Market Movement ($) | Sum of all monthly movements in that year |
  | Market Movement (%) | Compound return for the year: ((1+r₁)(1+r₂)...(1+r₁₂)) − 1 |
  | Withdrawal (Nominal) | Sum of all monthly withdrawals in that year |
  | Withdrawal (Real) | Sum of all monthly real withdrawals in that year |
  | Income | Sum of all income deposits in that year |
  | Expenses | Sum of all irregular expenses in that year |
  | Portfolio End | Portfolio value at the end of the year (= end of Month 12 of that year) |

- The transition between views is instant (no animation needed — the table simply re-renders with fewer or more rows). Scroll position resets to the top on toggle.

### State

- `tableViewMode`: `"monthly"` | `"annual"`

---

## Affordance #50: Asset Class Columns Toggle

**Purpose:** Switches the table between a compact view (aggregated portfolio totals) and an expanded view where each column that involves portfolio values is broken into three sub-columns (Stocks, Bonds, Cash). This replaces the previously planned "expandable rows" concept with a simpler column-based approach.

**Control type:** Checkbox toggle with label

### Appearance

- A small checkbox (standard styled checkbox, ~16px) with the label "Show Asset Classes" to its right, ~12px text.
- Positioned in the center of the controls bar.
- Unchecked state: compact view. Checked state: expanded view.

### Behavior

- Default: **Unchecked** (compact view).
- **When checked (expanded view):** The following columns split into three sub-columns each, with a grouped header:

  | Compact Column | Expanded Sub-Columns |
  |---|---|
  | Portfolio Start | Stocks Start, Bonds Start, Cash Start, Total Start |
  | Market Movement ($) | Stocks Mvmt, Bonds Mvmt, Cash Mvmt, Total Mvmt |
  | Market Movement (%) | Stocks %, Bonds %, Cash %, Portfolio % |
  | Withdrawal (Nominal) | Stocks Wdrl, Bonds Wdrl, Cash Wdrl, Total Wdrl |
  | Portfolio End | Stocks End, Bonds End, Cash End, Total End |

  The "Total" sub-column in each group matches what the compact view shows. The three asset class sub-columns are additional detail.

- **When unchecked (compact view):** Only the aggregate total columns are shown. The table is narrower and easier to scan.
- The transition between views is instant. Column widths adjust to accommodate the additional columns. If the expanded table exceeds the output area width, horizontal scrolling activates (see table scrolling behavior below).
- **Sub-column header styling:** Each asset class sub-column header includes the standard color dot (blue for Stocks, teal for Bonds, amber for Cash) to the left of the header text. The "Total" sub-column has no dot. The grouped parent header (e.g., "Portfolio Start") spans across its sub-columns with a thin bottom border separating it from the sub-column labels.

### State

- `tableShowAssetClasses`: boolean

---

## Table Column Definitions

Below is the full column specification for both compact and expanded views. Columns are listed left to right.

### Column: Period

**Compact & Expanded:** Single column (never splits).

| Attribute | Value |
|---|---|
| Header | "Period" |
| Width | ~80px (monthly) / ~60px (annual) |
| Alignment | Left |
| Format (Planning, Monthly) | "1", "2", ... "480" — plain month index |
| Format (Planning, Annual) | "Year 1", "Year 2", ... "Year 40" |
| Format (Tracking, Monthly) | "Jan 2028", "Feb 2028", ... — calendar month/year derived from Retirement Start Date (#4c) |
| Format (Tracking, Annual) | "2028", "2029", ... — calendar year |
| Sticky | Yes — this column is **horizontally sticky** (frozen) when the table scrolls horizontally in expanded view. It remains visible at the left edge so the user always knows which period they're looking at. |

### Column: Age

**Compact & Expanded:** Single column (never splits).

| Attribute | Value |
|---|---|
| Header | "Age" |
| Width | ~48px |
| Alignment | Center |
| Format (Monthly) | Age with one decimal: "55.0", "55.1", ... (incrementing by 1/12 per month). This is precise but potentially cluttered — alternatively, show integer age and only update when it changes: "55" for months 1–12, "56" for months 13–24, etc. **Use the integer approach** — it's cleaner and the monthly Period column provides the fine-grained time reference. |
| Format (Annual) | Integer age: "55", "56", ... |

### Column: Portfolio Start

**Compact view:** Single column showing the total portfolio value at the start of the period.

**Expanded view:** Four sub-columns: Stocks Start, Bonds Start, Cash Start, Total Start.

| Attribute | Value |
|---|---|
| Header (compact) | "Portfolio Start" |
| Header (expanded, parent) | "Portfolio Start" |
| Header (expanded, sub) | "● Stocks", "● Bonds", "● Cash", "Total" |
| Width per sub-column | ~100px |
| Alignment | Right |
| Format | Dollar amount with comma separators. For values ≥$1M, use abbreviated format: "$1.24M". For values <$1M, show full: "$847,230". For $0: "$0" in muted italic. |

### Column: Market Movement ($)

**Compact view:** Single column showing the total dollar change from market returns.

**Expanded view:** Four sub-columns: Stocks Mvmt, Bonds Mvmt, Cash Mvmt, Total Mvmt.

| Attribute | Value |
|---|---|
| Header (compact) | "Movement ($)" |
| Header (expanded, parent) | "Movement ($)" |
| Header (expanded, sub) | "● Stocks", "● Bonds", "● Cash", "Total" |
| Width per sub-column | ~90px |
| Alignment | Right |
| Format | Dollar amount with sign: "+$12,340" or "−$5,670". Positive values in green text (`#2E7D32`). Negative values in red text (`#C62828`). Zero in muted gray. |

### Column: Market Movement (%)

**Compact view:** Single column showing the portfolio's percentage return for the period.

**Expanded view:** Four sub-columns: Stocks %, Bonds %, Cash %, Portfolio %.

| Attribute | Value |
|---|---|
| Header (compact) | "Return (%)" |
| Header (expanded, parent) | "Return (%)" |
| Header (expanded, sub) | "● Stocks", "● Bonds", "● Cash", "Portfolio" |
| Width per sub-column | ~72px |
| Alignment | Right |
| Format | Percentage with two decimal places and sign: "+1.23%" or "−0.87%". Same green/red color coding as Movement ($). |

### Column: Withdrawal (Nominal)

**Compact view:** Single column showing the total nominal withdrawal for the period.

**Expanded view:** Four sub-columns showing which asset classes the withdrawal was sourced from: Stocks Wdrl, Bonds Wdrl, Cash Wdrl, Total Wdrl.

| Attribute | Value |
|---|---|
| Header (compact) | "Withdrawal" |
| Header (expanded, parent) | "Withdrawal (Nominal)" |
| Header (expanded, sub) | "● Stocks", "● Bonds", "● Cash", "Total" |
| Width per sub-column | ~90px |
| Alignment | Right |
| Format | Dollar amount: "$4,230". No sign (withdrawals are always outflows). |
| Clamped indicator | If the withdrawal was clamped by the spending phase min/max bounds, the **Total** sub-column (or the single compact column) displays a small inline icon to the right of the value: an upward arrow "↑" if clamped to the minimum (strategy wanted less, floor applied) or a downward arrow "↓" if clamped to the maximum (strategy wanted more, ceiling applied). The icon is ~10px, colored amber (`#F57F17`). On hover, a tooltip explains: _"Withdrawal clamped to phase minimum ($X,XXX)"_ or _"Withdrawal clamped to phase maximum ($X,XXX)"_. |
| Pre-withdrawal months | For months before the "Withdrawals Start At" month (#4b), the withdrawal columns show "—" in muted gray. In expanded view, all sub-columns show "—". |

### Column: Withdrawal (Real)

**Compact & Expanded:** Single column (never splits into asset classes — the real value is a property of the total withdrawal, not per-class).

| Attribute | Value |
|---|---|
| Header | "Withdrawal (Real)" |
| Width | ~100px |
| Alignment | Right |
| Format | Dollar amount: "$3,870". This is the nominal withdrawal deflated to today's dollars. |

### Column: Income

**Compact & Expanded:** Single column (never splits).

| Attribute | Value |
|---|---|
| Header | "Income" |
| Width | ~90px |
| Alignment | Right |
| Format | Dollar amount: "$2,500". If no income in this period: "—" in muted gray. If multiple income events fire in the same period, shows the sum. |
| Color | Green text (muted, `#388E3C`) to match the income card color language. |
| Tooltip on hover | If income > $0, a tooltip lists the individual income events that fired: _"Social Security: $2,500\nRental Income: $2,000\nTotal: $4,500"_. This disambiguates when multiple events overlap. |

### Column: Expenses

**Compact & Expanded:** Single column (never splits).

| Attribute | Value |
|---|---|
| Header | "Expenses" |
| Width | ~90px |
| Alignment | Right |
| Format | Dollar amount: "$25,000". If no expenses in this period: "—" in muted gray. If multiple expense events fire, shows the sum. |
| Color | Red text (muted, `#C62828`) to match the expense card color language. |
| Tooltip on hover | Same pattern as Income: lists individual expense events. _"New Roof: $25,000\nTotal: $25,000"_. |
| Shortfall indicator | If the portfolio couldn't fully cover the expense, the value shows with a small warning icon (⚠) and a tooltip: _"Shortfall: $X,XXX unfunded."_ The unfunded portion is shown in a lighter red/muted text. |

### Column: Portfolio End

**Compact view:** Single column showing the total portfolio value at the end of the period.

**Expanded view:** Four sub-columns: Stocks End, Bonds End, Cash End, Total End.

| Attribute | Value |
|---|---|
| Header (compact) | "Portfolio End" |
| Header (expanded, parent) | "Portfolio End" |
| Header (expanded, sub) | "● Stocks", "● Bonds", "● Cash", "Total" |
| Width per sub-column | ~100px |
| Alignment | Right |
| Format | Same as Portfolio Start. |
| Depletion styling | When an asset class reaches $0, the cell shows "$0" in muted italic red text. When the total portfolio reaches $0, the entire row's Portfolio End cell (or Total sub-column) shows "$0" with a red background tint (`#FFF5F5`) to highlight the failure point. |

---

## Table Row Styling

### Alternating Row Backgrounds

- Even rows: white (`#FFFFFF`).
- Odd rows: very faint gray (`#FAFAFA`).
- This subtle zebra striping improves horizontal readability across wide rows (especially in expanded view).

### Tracking Mode: Actual vs. Projected Rows

In Tracking Mode, rows have additional visual treatments:

- **Rows with user-entered actuals:** White background (standard), but with a thin **left border accent** (3px, app's primary color at ~40% opacity) on the Period cell. This subtle accent marks the row as containing real data without overwhelming the table.
- **Rows with user-entered actuals — individual cell markers:** Each specific cell that was manually entered by the user displays a small **dot indicator** (4px, primary color) in the top-right corner of the cell. This distinguishes user-entered values from computed values within the same row (the user might enter the Stocks Start value but not Bonds Start — only the edited cell gets the dot).
- **Rows in the past without actuals (gap-fill):** Same styling as projected rows (no special treatment). These are simulated months, indistinguishable from future projections.
- **Projected future rows:** Faint blue-gray background tint (`#F5F7FA`) replacing the standard white/gray alternation. This creates a clear visual boundary between "resolved" months (past) and "projected" months (future).
- **The boundary row:** The first projected row (the month immediately after the last actual, or the first future month) has a **top border** (2px, dashed, muted blue-gray) acting as the "today" divider. This aligns with the chart's "Today" marker.

### Year Boundary Rows (Monthly View)

In the monthly view, the first month of each year (Month 1, Month 13, Month 25, ...) has a slightly **thicker top border** (2px, light gray instead of the standard 1px) to visually group months into years. This subtle banding helps the user navigate 480 rows without losing their place.

### Portfolio Depletion Row

The row in which the total portfolio first reaches $0 gets special treatment:
- The entire row has a faint red background tint (`#FFF0F0`).
- The Portfolio End cell shows "$0" in bold red.
- A small inline annotation appears in the Period cell: a red dot (●) to the left of the period label.
- This row is the simulation's "failure point" and deserves strong visual emphasis.

---

## Affordance #51: Sticky Headers

**Purpose:** Keeps the column headers visible at all times while scrolling through potentially hundreds of rows.

**Control type:** Automatic CSS sticky positioning

### Appearance

- The table controls bar (containing #49, #50, #56) is sticky at the top of the table's scroll container, with `z-index` above the column headers.
- The column headers row sits directly below the controls bar, also sticky. In expanded view, the **grouped parent headers** and **sub-column headers** are both sticky (two header rows).
- Both sticky elements have a white background with a subtle bottom shadow (0 2px 4px rgba(0,0,0,0.04)) to indicate they're floating above the scrolling content.

### Behavior

- As the user scrolls down through rows, the controls bar and column headers remain fixed at the top of the visible table area.
- As the user scrolls horizontally (in expanded view), the Period column remains fixed at the left edge (horizontal sticky).
- The intersection of vertical and horizontal sticky (top-left corner) is handled cleanly — the Period column header cell has a white background with appropriate z-index to avoid visual stacking issues.

---

## Affordance #52: Tracking Mode Editable Cells

**Purpose:** In Tracking Mode, allows the user to enter actual portfolio values and withdrawal amounts for months that have already occurred. This is the mechanism by which real-world data enters the simulation.

**Control type:** Inline editable table cells

### Which Cells Are Editable

A cell is editable if **all** of the following are true:
1. The app is in **Tracking Mode**.
2. The row's calendar date is **on or before the current real-world date** (the month has actually occurred).
3. The cell belongs to one of the following columns (only in expanded view — in compact view, the aggregated columns are **not directly editable**; the user must enable "Show Asset Classes" to edit):
   - **Stocks Start** (under Portfolio Start)
   - **Bonds Start** (under Portfolio Start)
   - **Cash Start** (under Portfolio Start)
   - **Stocks Wdrl** (under Withdrawal Nominal)
   - **Bonds Wdrl** (under Withdrawal Nominal)
   - **Cash Wdrl** (under Withdrawal Nominal)

This gives the user six editable fields per month: three asset class starting values and three asset class withdrawal amounts. All other cells (market movement, percentages, totals, income, expenses, portfolio end) are **computed** from these inputs and the simulation configuration.

### Compact View Behavior

When "Show Asset Classes" is unchecked (compact view), the table shows aggregated columns that are not directly editable. If the user is in Tracking Mode and clicks on a compact-view cell that *would* be editable in expanded view, a small tooltip appears: _"Enable 'Show Asset Classes' to edit individual values."_ This gently guides the user to the expanded view without silently failing.

### Editable Cell Appearance

- **Non-editing state:** The cell looks identical to a non-editable cell, except:
  - On hover, the cell background lightens slightly (a barely-there highlight, `#F0F4FF`) and the cursor changes to `text` (I-beam), indicating editability.
  - If the cell already contains a user-entered value, the small dot indicator (4px, primary color) is visible in the top-right corner.
- **Editing state (on click/focus):**
  - The cell transforms into a compact inline input. The cell's border becomes visible (1px, primary color), the background becomes white, and the value becomes editable text.
  - The dollar formatting strips to a raw number (same behavior as all currency inputs in the app). The "$" prefix remains as static text.
  - The input is right-aligned to match the column alignment.
  - Focus is managed: Tab moves to the next editable cell in the same row (left to right). Enter confirms the edit and moves focus down to the same cell in the next row. Escape cancels the edit and reverts to the previous value.
- **After editing (on blur/Enter):**
  - The value re-formats with dollar sign and commas.
  - The dot indicator appears (or updates) in the top-right corner.
  - The **Total** sub-column and all computed columns in the same row update immediately (the engine recalculates that row's totals, market movement, and portfolio end).
  - All projected rows below recalculate immediately (the reactive Tracking Mode re-forecast).
  - If Monte Carlo results exist, they become stale (see #3 revision).

### Clearing an Actual

- If the user selects the value in an edited cell and deletes it entirely (leaving it blank) and then blurs, the cell reverts to a **computed value** (the simulation fills it in). The dot indicator disappears. The cell is no longer treated as an actual.
- This allows the user to "un-enter" an actual for a specific cell without using the global "Clear Actuals" button (#61).

### Validation

- Values must be non-negative integers (no cents). Negative values are rejected — the cell reverts to the previous value with an amber flash.
- The Total Start (sum of the three asset class starts) is computed, not editable. If the user enters values that seem inconsistent (e.g., they update Stocks Start but not Bonds or Cash), this is fine — the app uses whatever values are present (user-entered or computed) and recalculates accordingly.

### State

- Actuals are stored in a separate data structure: `actuals[monthIndex].stocksStart`, `actuals[monthIndex].bondsStart`, `actuals[monthIndex].cashStart`, `actuals[monthIndex].stocksWithdrawal`, `actuals[monthIndex].bondsWithdrawal`, `actuals[monthIndex].cashWithdrawal`. Each field is either a number (user-entered) or `null` (not entered, use computed value).

---

## Affordance #53: Sort by Column

**Purpose:** Allows the user to sort table rows by any column, useful for finding extremes (worst month, best return, highest withdrawal, etc.).

**Control type:** Clickable column headers

### Appearance

- Each column header is clickable. On hover, the header text color intensifies slightly and a small sort icon appears to the right of the header text:
  - Unsorted: faint up/down arrow pair (⇅) in muted gray.
  - Sorted ascending: solid upward arrow (↑) in the app's primary color.
  - Sorted descending: solid downward arrow (↓) in the app's primary color.
- The sort icon is ~12px, positioned immediately after the header text with ~4px gap.

### Behavior

- **Click once:** Sort ascending (smallest to largest / earliest to latest).
- **Click again:** Sort descending (largest to smallest / latest to earliest).
- **Click a third time:** Reset to the default chronological order (by Period).
- Only one column can be sorted at a time. Clicking a different column resets the previous sort.
- In expanded view, clicking a sub-column header sorts by that specific sub-column (e.g., sort by Stocks Start). Clicking the parent group header sorts by the Total sub-column.
- Sorting is purely visual — it reorders the displayed rows but doesn't affect the underlying data or simulation.
- **Tracking Mode consideration:** Sorting in Tracking Mode mixes actual and projected rows. The row styling (actual accent, projected tint) is preserved regardless of sort order, so the user can still distinguish actuals from projections even when sorted by, say, withdrawal amount.

### State

- `tableSort`: `{ column: string | null, direction: "asc" | "desc" | null }`

---

## Affordance #54: (Removed)

_This affordance previously described "Tracking Mode: Editable Cells" as a separate item. It has been merged into #52 above._

---

## Affordance #55: (Removed)

_This affordance previously described "Sort by Column" separately. It has been renumbered as #53 above._

---

## Affordance #56: Export to CSV Button

**Purpose:** Exports the current table data to a CSV file that the user can open in Excel, Google Sheets, or any spreadsheet tool. This is the app's primary data export mechanism.

**Control type:** Action button

### Appearance

- Positioned in the right side of the table controls bar.
- A small secondary-style button: subtle border (1px, light gray), no background fill, muted dark text.
- Icon: a small download arrow (⬇) to the left of the label.
- Label: "Export CSV"
- Size: auto-width, ~28px height.

### Behavior

- **On click:** Generates and downloads a CSV file immediately. No confirmation dialog needed.
- **File name:** `retirement-forecast-[mode]-[date].csv` — e.g., `retirement-forecast-planning-2026-02-09.csv`. The mode (planning/tracking) and the current date are included for the user's reference.
- **CSV content:**
  - The export includes **all columns in the current view** (compact or expanded, depending on the toggle state). If "Show Asset Classes" is checked, the CSV includes all sub-columns. If unchecked, only the aggregated columns.
  - The export includes **all rows in the current view** (monthly or annual, depending on the toggle state).
  - The export respects the current **sort order**. If the user has sorted by a column, the CSV rows match that order.
  - Header row: column names, with grouped headers flattened. E.g., in expanded view, the header for stocks start is "Portfolio Start - Stocks" (parent + sub-column, separated by " - ").
  - Values are exported as **raw numbers** (no dollar signs, no commas, no abbreviations). Percentages are exported as decimals (e.g., 0.0123 for 1.23%). This ensures clean spreadsheet import.
  - A second "units" row below the header indicates the format: "$", "$", "%", etc. This helps the user apply formatting in their spreadsheet.
- In **Tracking Mode:** The CSV includes an additional column "Source" with values "Actual" or "Projected" for each row, so the user can filter/distinguish in their spreadsheet.
- In **Monte Carlo mode:** The CSV exports the **median path** data. A note is included in the first row as a comment: "# Monte Carlo median path (50th percentile) from [X] simulations". Some CSV parsers will treat this as a comment; others will show it in cell A1. Either is acceptable.

### State

- No persistent state — the export is generated on-demand from the current simulation results and table view settings.

---

## Table Scrolling & Sizing

### Vertical Scrolling

- The table renders all rows inline (no virtualized scrolling for v1 — 480 rows is manageable for modern browsers). The page scrolls naturally.
- The sticky controls bar and column headers ensure the user always has context regardless of scroll position.

### Horizontal Scrolling

- **Compact view:** The table fits within the output area width without horizontal scrolling on most desktop screens (~900px+). No horizontal scroll needed.
- **Expanded view:** The table may exceed the output area width (estimated ~1400–1600px total column width). A horizontal scrollbar appears at the bottom of the table.
  - The **Period column** is horizontally sticky (frozen at the left edge) so the user always knows which row they're looking at while scrolling right through asset class columns.
  - The horizontal scrollbar is a standard browser scrollbar (no custom styling needed), but the table container is set to `overflow-x: auto` to enable it.
  - **Scroll shadow indicators:** When horizontally scrolled, a subtle shadow appears on the left edge of the scrollable area (when content is hidden to the left) and/or the right edge (when content is hidden to the right). These shadows (linear gradient overlays, ~20px wide, fading from a light shadow to transparent) provide a visual cue that more columns exist in that direction.

### Performance Note

At 480 rows × ~20 columns (expanded view), the table contains ~9,600 cells. Modern browsers handle this without virtualization, but the app should avoid expensive per-cell re-renders. When the simulation updates, the table should re-render as a batch (not cell-by-cell) for performance.

---

## Monte Carlo Mode Table Behavior

In Monte Carlo mode, the table presents a unique challenge: there are 1,000+ simulation paths, but the table can only show one set of rows. The approach:

- The table displays the **median (50th percentile) path**. Each row's values represent the median outcome at that point in time.
- A small **banner** appears above the table (below the controls bar, above the column headers): _"Showing median (50th percentile) path from [X] simulations."_ — muted text, ~11px, with a small ℹ icon. This is important context so the user doesn't mistake the median path for a deterministic projection.
- The percentile detail is available on the chart (confidence bands) and summary stats. The table's role in Monte Carlo mode is to provide the detailed month-by-month breakdown of the *most likely* outcome, not to show the distribution (that's the chart's job).

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Toggle Monthly / Annual | Table re-renders with appropriate row granularity. Scroll resets to top. |
| Toggle Show Asset Classes | Columns expand/collapse. Horizontal scrollbar may appear/disappear. |
| Click a column header | Rows sort by that column. Click again to reverse. Click third time to reset. |
| Hover over an Income or Expenses cell | Tooltip shows individual event breakdown. |
| Hover over a clamped withdrawal | Tooltip explains which bound was hit and the original calculated value. |
| Click an editable cell (Tracking Mode, expanded) | Cell becomes an inline input. Edit, Tab/Enter to confirm, Escape to cancel. |
| Edit and confirm an actual value | Row recalculates. All projected rows re-forecast. MC results become stale if applicable. |
| Clear an actual value | Cell reverts to computed. Dot indicator disappears. Downstream recalculation triggers. |
| Click Export CSV | CSV file downloads immediately with current view's data. |
| Scroll vertically | Controls bar and column headers remain sticky. |
| Scroll horizontally (expanded view) | Period column remains frozen at left. Scroll shadows indicate hidden content. |

# Output Area — Section: Stress Test Panel (#57–#59)

The Stress Test Panel lets the user explore "what if" scenarios by applying hypothetical market shocks to their base simulation and comparing the outcomes. Its primary purpose is to make **sequence-of-returns risk** tangible — the reality that *when* a downturn happens matters as much as *whether* it happens. A 30% stock crash in Year 1 of retirement is catastrophically different from the same crash in Year 25, and this panel makes that difference visible.

## Section Container

- **Position:** Below the Detail Table, spanning the full width of the output area. This is the final section of the output area.
- **Collapsible panel** with a header bar that serves as the expand/collapse toggle.
- **Header bar appearance:**
  - Full-width horizontal bar, ~44px height, subtle background (faint warm gray, `#F5F3F0` — slightly warmer than the cool grays used elsewhere to give this section a distinct "sandbox" feel).
  - Left side: A small caution/experiment icon (⚗ or ⚠ in muted amber) + label "Stress Test" in semi-bold ~14px text.
  - Right side: Expand/collapse chevron (▸ when collapsed, ▾ when expanded), muted gray.
  - The entire header bar is clickable (not just the chevron).
- **Default state:** **Collapsed.** The stress test is an advanced/exploratory tool — most users will focus on the core simulation results first. Collapsing it by default keeps the output area focused.
- **Expanded state:** The panel opens with a slide-down animation (200ms ease). Internal padding: ~16px on all sides.
- **Prerequisite:** The panel content is only functional when a base simulation has been run. If expanded before any simulation, the interior shows a centered muted message: _"Run a simulation first to enable stress testing."_ No controls are interactive.

---

## Affordance #57: Stress Scenario Configuration

**Purpose:** Allows the user to define one or more hypothetical market shock scenarios to apply on top of the base simulation. The user selects from presets or builds a custom shock.

**Control type:** A horizontally scrollable row of scenario cards, plus an "Add Scenario" button.

### Scenario Card Design

Each scenario card represents a single stress test case. The panel supports **1 to 4 active scenario cards** displayed in a horizontal row.

#### Card Appearance

- **Dimensions:** ~260px wide, ~200px tall (fixed height). Cards are arranged in a horizontal row with ~12px gap between them.
- **Card styling:** White background, 1px border (light gray), rounded corners (8px). A colored **top border accent** (3px) distinguishes each scenario:
  - Scenario 1: muted orange (`#E67E22` at 70%)
  - Scenario 2: muted purple (`#8E44AD` at 70%)
  - Scenario 3: muted teal (`#16A085` at 70%)
  - Scenario 4: muted indigo (`#2C3E80` at 70%)
  - These colors are chosen to be distinct from the app's existing color language (blue/teal/amber for asset classes, green/red for income/expenses). Each scenario gets its own color for identification in the comparison display (#59).
- **Card layout (internal, top to bottom):**
  1. **Card header row:** Scenario label + remove button (×)
  2. **Scenario type selector**
  3. **Configuration fields** (vary by type)
  4. **Apply timing fields**

#### Sub-Affordance #57a: Scenario Label

- A small editable text field at the top of the card, ~12px, bold.
- Default labels: "Scenario A", "Scenario B", etc.
- Max 24 characters. The user can rename to something descriptive like "2008-Style Crash" or "Stagflation."

#### Sub-Affordance #57b: Scenario Type Selector

**Purpose:** Selects what kind of market shock to apply.

**Control type:** Dropdown

**Options:**

| Type | Description |
|---|---|
| Stock Crash | A one-time percentage drop in stock values |
| Bond Crash | A one-time percentage drop in bond values |
| Broad Market Crash | A simultaneous drop in both stocks and bonds |
| Prolonged Bear Market | Below-average returns sustained over multiple years |
| High Inflation Spike | Inflation rate increases for a defined period |
| Custom | User defines exact annual returns per asset class for a period |

Default: **Stock Crash** (the most common and intuitive stress test).

#### Sub-Affordance #57c: Shock Parameters (vary by type)

Each scenario type exposes different configuration inputs within the card:

**Stock Crash:**
- **Drop magnitude (%):** Slider + numeric input, range −10% to −80%, default −30%. Label: "Stock drop". The slider is oriented so dragging right makes the drop *more* severe (−10% → −80%). The value is always displayed as a negative percentage in red text.
- A helper below: _"Portfolio stocks drop from $X to ~$Y"_ — computed from the current portfolio stocks value and the drop magnitude. This contextualizes the abstract percentage.

**Bond Crash:**
- **Drop magnitude (%):** Same as Stock Crash but for bonds. Range −5% to −40%, default −15%.
- Helper: _"Portfolio bonds drop from $X to ~$Y"_

**Broad Market Crash:**
- **Stock drop (%):** Range −10% to −80%, default −30%.
- **Bond drop (%):** Range −5% to −40%, default −10%.
- **Cash impact:** Cash is assumed unaffected (it's cash). A small note: _"Cash holdings unaffected."_

**Prolonged Bear Market:**
- **Duration (years):** Numeric input, range 1 to 10, default 3.
- **Stock return during period (%):** Numeric input, range −20% to +5%, default −5%. This replaces the normal expected stock return for the defined period.
- **Bond return during period (%):** Numeric input, range −10% to +3%, default +1%.
- Helper: _"Returns revert to base assumptions after Year X."_

**High Inflation Spike:**
- **Spike inflation rate (%):** Numeric input, range 3% to 20%, default 8%. This replaces the configured inflation rate for the defined period.
- **Duration (years):** Numeric input, range 1 to 10, default 3.
- Helper: _"Inflation reverts to X% after Year Y"_ (where X is the base inflation rate).
- Note: High inflation affects both the real value of withdrawals and the purchasing power erosion. It does *not* directly change nominal returns (the stress test isolates the inflation impact).

**Custom:**
- A small inline table with one row per year of the shock period:
  - Columns: Year, Stocks Return (%), Bonds Return (%), Cash Return (%)
  - Up to 5 rows (years). Add/remove row buttons.
  - Each cell is a small numeric input.
- This is the most flexible option, allowing the user to define exact return sequences (e.g., recreating a historical crisis like 2000–2002 or 2007–2009).

#### Sub-Affordance #57d: Shock Timing

**Purpose:** Defines *when* during retirement the shock occurs. This is the key variable for exploring sequence-of-returns risk.

**Control type:** Two inputs, present on every scenario card regardless of type.

- **Start year:** Numeric input, range 1 to retirement duration, default **1**. Label: "Starts in Year".
- **For one-time crashes (Stock Crash, Bond Crash, Broad Market Crash):** The drop applies at the *beginning* of this year, before that year's returns are calculated. No end year needed — the crash is a one-time event and returns revert to normal assumptions immediately after.
- **For duration-based scenarios (Prolonged Bear, High Inflation, Custom):** The start year is the first year affected. The end year is computed: start year + duration − 1. A helper displays: _"Years X through Y affected."_

### Scenario Card State

```
stressScenarios[i]: {
  label: string,
  type: "stock-crash" | "bond-crash" | "broad-crash" | "prolonged-bear" | "high-inflation" | "custom",
  params: { ... },  // type-specific parameters
  startYear: number
}
```

---

## Affordance #58: Add / Remove Scenario Controls

### Add Scenario Button

- Positioned to the right of the last scenario card in the horizontal row.
- Appearance: A dashed-border card placeholder (~260px wide, same height as scenario cards, ~200px), with a centered "+" icon and the text "Add Scenario" in muted text. This is visually consistent with other "empty state + add" patterns in the app (e.g., spending phases, income/expense events).
- **On click:** Creates a new scenario card with defaults (Stock Crash, −30%, Year 1). The card animates in (fade + slide from right, 200ms).
- **Maximum 4 scenarios.** When the 4th scenario is added, the "Add Scenario" placeholder disappears. A small note appears below the row: _"Maximum 4 scenarios."_
- **When no scenarios exist (initial state):** Only the "Add Scenario" placeholder is visible. Below it, a line of muted helper text: _"Add a stress scenario to see how your plan holds up under adverse conditions."_

### Remove Scenario Button

- On each scenario card: a small × icon button in the top-right corner of the card header row. Same styling as income/expense card remove buttons (~24px, muted gray → muted red on hover).
- **On click:** No confirmation dialog. Card animates out (fade + collapse, 200ms). Remaining cards slide left to close the gap.
- If the removed card was the last one, the "Add Scenario" placeholder returns as the sole element.

---

## Affordance #59: Stress Test Results Display

**Purpose:** Shows the comparison between the base simulation and each stress scenario, making the impact of the shock immediately visible.

**Control type:** A results area below the scenario cards, containing a comparison bar chart and a comparison metrics table.

### Results Area Visibility

- **Hidden** when no scenarios are defined or when no simulation has been run.
- **Shown** when at least one scenario card is configured AND a base simulation exists.
- Results compute **automatically** when scenarios are configured — no separate "Run Stress Test" button. The stress test engine takes the base simulation's configuration and re-runs it with the shock parameters overlaid. This is computationally cheap for Manual mode (single path); for Monte Carlo mode, the stress test re-runs the full Monte Carlo (potentially expensive — see performance note below).

### Computation Behavior

- **Manual mode:** The stress test re-runs the single stochastic simulation with the same random seed as the base simulation, but with the shock parameters overlaid during the affected period. Using the same random seed ensures the *only* difference between base and stress cases is the shock itself — all other market randomness is identical. This isolates the shock's impact cleanly.
- **Monte Carlo mode:** The stress test re-runs the full Monte Carlo (same number of simulations, same historical era) with the shock overlaid. This produces stress-case confidence bands and probability of success. This is computationally expensive (N scenarios × 1,000 simulations), so a small spinner appears on the results area while computing, and results render progressively as each scenario completes.

### Comparison Bar Chart

A horizontal grouped bar chart positioned directly below the scenario cards.

#### Appearance

- **Width:** Full width of the panel.
- **Height:** ~160px (grows slightly if 4 scenarios require more vertical space).
- **Structure:** One group of horizontal bars per metric, with the base case and each scenario side by side. Three metric groups:

  1. **Terminal Portfolio Value** — the headline comparison.
  2. **Total Drawdown (Real)** — how much spending the plan supports.
  3. **Probability of Success** — Monte Carlo only; hidden in Manual mode.

- Each group has a label on the left (metric name, ~12px, muted) and bars extending to the right.
- **Bar colors:**
  - Base Case: app's primary color (dark navy) at ~70% opacity.
  - Scenario 1: muted orange (matching its card accent).
  - Scenario 2: muted purple.
  - Scenario 3: muted teal.
  - Scenario 4: muted indigo.
- **Bar labels:** Each bar shows its value at the right end (inside or outside the bar depending on bar length): "$1.2M", "$340K", "94.2%", etc.
- **Zero line:** A thin vertical line at $0 for portfolio value bars. Bars that go to $0 (portfolio depletion) terminate at this line with a small red marker (●) to emphasize failure.
- Between each metric group, a thin horizontal divider.

#### Behavior

- Bars render with a quick grow-from-left animation (300ms, staggered by 50ms per bar) when results first appear.
- Hovering over a bar highlights it and shows a tooltip with the exact value and the delta from the base case: _"$412K (−$835K vs. base)"_ or _"72.3% (−21.9pp vs. base)"_.
- If a stress scenario causes earlier depletion, the Terminal Value bar shows "$0" and the tooltip notes: _"Depleted in Month XXX (age XX)"_.

### Comparison Metrics Table

Below the bar chart, a small table provides the numeric detail.

#### Appearance

- Compact table, full width, with light styling (no heavy borders — just subtle row dividers).
- **Columns:**
  - Metric name (left-aligned)
  - Base Case (right-aligned, in primary color)
  - Scenario A (right-aligned, in scenario A's color)
  - Scenario B (right-aligned, in scenario B's color)
  - ... up to Scenario D
  - Each scenario column header shows the scenario label from the card.

- **Rows:**

| Metric | Description |
|---|---|
| Terminal Portfolio Value | End-of-retirement balance. $0 in red. |
| Δ Terminal vs. Base | Dollar difference from base. Always negative or zero for shocks. Red text. |
| Probability of Success | MC only. Percentage. Color-coded (green/amber/red). |
| Δ Success vs. Base | Percentage point difference. Red text. MC only. |
| Total Drawdown (Real) | Sum of real withdrawals. |
| Δ Drawdown vs. Base | Dollar difference. Red if lower (shock reduced total spending). |
| Median Monthly Withdrawal (Real) | Median real monthly withdrawal. |
| Depletion Month | The month the portfolio hits $0, or "Never" if it survives. "Never" in green; month number in red. |
| First Year of Reduced Withdrawals | The first year where the stress scenario's withdrawal is lower than the base case's withdrawal. Highlights where the impact first becomes visible to the retiree. |

- In Manual mode, the "Probability of Success" and "Δ Success vs. Base" rows are hidden.
- The "Δ" (delta) rows use smaller text (~10px) and are visually subordinate to the primary metric rows — they're supporting detail, not headlines.

#### Monte Carlo Specific Detail

When in Monte Carlo mode, each scenario column in the table can optionally show a small **mini confidence range** below the primary value:

```
Terminal Value:     $412K
                    (10th: $0 — 90th: $1.1M)
```

This is shown in very small muted text (~9px) below the main value, providing distribution context without cluttering the table. Only shown for Terminal Value and Total Drawdown rows.

---

## Timing Sensitivity Mini-Chart (Optional Enhancement)

Below the comparison table, a small optional chart provides deeper insight into sequence-of-returns risk.

### Purpose

Shows how the same shock produces different outcomes depending on *when* it occurs. This directly answers: "Does it matter if the crash happens in Year 1 vs. Year 10 vs. Year 20?"

### Appearance

- **Dimensions:** Full panel width, ~120px height.
- **Type:** Line chart with multiple series.
- **X-axis:** "Shock Start Year" — from Year 1 to the retirement duration.
- **Y-axis:** Terminal Portfolio Value (or Probability of Success in MC mode).
- **Series:** One line per active scenario, colored by the scenario's accent color. Each line plots the terminal value (or PoS) that would result if that scenario's shock started in that year.
- The chart is auto-generated: the engine runs the base config + each scenario's shock at every possible start year and records the terminal outcome. For a 40-year retirement, that's 40 data points per scenario.

### Behavior

- **Computation cost:** In Manual mode, this is 40 × N_scenarios single-path simulations — fast enough to compute on demand. In Monte Carlo mode, this would be 40 × N_scenarios × 1,000 simulations — prohibitively expensive. Therefore, **this chart is only shown in Manual mode.** In Monte Carlo mode, a note replaces it: _"Timing sensitivity analysis is available in Manual simulation mode."_
- The chart renders after the primary comparison results, with a slight delay (~500ms) to avoid blocking the initial results display.
- Hover tooltip: Shows the exact terminal value for each scenario at the hovered start year.
- A thin horizontal dashed line at $0 marks the depletion threshold. Where a scenario's line drops to $0, it terminates (the portfolio was depleted before retirement ended).

### Visual Insight

The typical shape of these lines is a downward slope from left to right — early shocks are worse than late shocks. But the *steepness* of the slope varies dramatically by shock type and withdrawal strategy. A conservative strategy (low withdrawal rate) produces a flatter line (more resilient to timing); an aggressive strategy produces a steep line (highly sensitive to early shocks). This chart makes that trade-off viscerally clear.

- A small helper below the chart: _"Earlier shocks typically cause worse outcomes due to sequence-of-returns risk. The slope of each line indicates how timing-sensitive your strategy is."_

---

## Interaction Between Stress Test and Base Simulation

### When the Base Simulation Updates

If the user re-runs the base simulation (clicks Run Simulation with new parameters), the stress test results **automatically recompute** using the new base as the reference. No user action needed — the stress test always reflects the current base simulation.

If the user changes a stress scenario card's configuration (different type, magnitude, timing), the results for that scenario recompute automatically. Other scenarios' results are unaffected.

### Stress Test in Tracking Mode

The stress test works in Tracking Mode with the same behavior as Planning Mode:
- The shock is applied to the **projected portion** of the simulation only. Actual months are locked and unaffected by the stress test — you can't retroactively apply a shock to months that already happened.
- The shock timing (#57d) is relative to the projected months. "Year 1" means the first year of the projection (not the first year of retirement).
- This answers the question: _"Given where I am now, what happens if the market crashes next year?"_

A small note appears below the timing input in Tracking Mode: _"Year 1 = first projected year ([calendar year])."_

---

## Section-Level Interaction Summary

| User Action | Result |
|---|---|
| Expand the panel (first time, no sim run) | Interior shows "Run a simulation first." message. |
| Expand the panel (after simulation) | Interior shows empty state with "Add Scenario" placeholder. |
| Add a scenario | Card appears with defaults. Results compute and render automatically. |
| Edit a scenario parameter | Results for that scenario recompute. Bar chart and table update. |
| Change shock timing | Results recompute. Timing sensitivity chart updates (Manual mode). |
| Add a second/third/fourth scenario | New card + new bar/column in results. Max 4. |
| Remove a scenario | Card and its bar/column disappear. Remaining results unaffected. |
| Re-run the base simulation | All stress test results recompute against the new base. |
| Switch to Monte Carlo mode | Stress tests re-run as Monte Carlo. PoS rows appear. Timing chart hides. |
| Switch to Tracking Mode | Shock timing reanchors to projected months. Actuals are immune to shocks. |
| Collapse the panel | All state preserved. Re-expanding shows the same scenarios and results. |