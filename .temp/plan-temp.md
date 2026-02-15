Page-Level Controls

Mode Toggle — Planning Mode / Tracking Mode (segmented toggle or tab pair, persistent at top of page)
Monte Carlo Toggle — On/Off switch (only visible/relevant in Planning Mode)
Run Simulation Button — (only when Monte Carlo is on; debounces expensive recalculation)


Input Panel (Sidebar or Collapsible Left Panel)
Section: Core Parameters

4. Starting Age — Slider with numeric input (range: 30–80)
5. Retirement Duration (Years) — Slider with numeric input (range: 5–50)
6. Expected Inflation Rate (%) — Slider with numeric input (range: 0–10%, step 0.1%)

Section: Starting Portfolio

7. Stocks Starting Balance ($) — Numeric input with currency formatting
8. Bonds Starting Balance ($) — Numeric input with currency formatting
9. Cash Starting Balance ($) — Numeric input with currency formatting
10. Total Portfolio Display — Read-only computed field showing the sum, with a mini donut/pie showing allocation

Section: Return Assumptions

11. Stocks Expected Return (%) — Numeric input (step 0.1%)
12. Stocks Std. Deviation (%) — Numeric input (step 0.1%, dimmed/disabled when Monte Carlo is off)
13. Bonds Expected Return (%) — Numeric input
14. Bonds Std. Deviation (%) — Numeric input (dimmed/disabled when Monte Carlo is off)
15. Cash Expected Return (%) — Numeric input
16. Cash Std. Deviation (%) — Numeric input (dimmed/disabled when Monte Carlo is off)

Section: Spending Phases

Spending Phases List — A dynamic list of phase cards. Default: 1 phase covering the full retirement. Each phase card contains:

17a. Phase Name — Editable text label (e.g., "Active Retirement")
17b. Start Year — Numeric input or dropdown (constrained: must equal previous phase's end year + 1, or year 1 for the first phase)
17c. End Year — Numeric input or dropdown (constrained: max = retirement duration)
17d. Min Monthly Spend ($) — Numeric input with currency formatting (today's dollars)
17e. Max Monthly Spend ($) — Numeric input with currency formatting (today's dollars)


Add Phase Button — Appends a new phase card (max 4 phases)
Remove Phase Button — On each phase card (min 1 phase must remain)

Section: Withdrawal Strategy

Strategy Selector — Dropdown with options: Percent of Portfolio, 1/N, Dynamic SWR, Guyton-Klinger, Yale Endowment, CAPE-Based
Strategy-Specific Parameters — A dynamic sub-panel that swaps based on the selected strategy:

21a. Percent of Portfolio: Withdrawal Rate (%) — Numeric input
21b. 1/N: No additional parameters (show explanatory text)
21c. Dynamic SWR: Base Rate (%) — Numeric input; Adjustment Sensitivity — Slider or numeric
21d. Guyton-Klinger: Initial Rate (%) — Numeric input; Prosperity Rule Threshold (%) — Numeric input; Capital Preservation Threshold (%) — Numeric input
21e. Yale Endowment: Spending Rate (%) — Numeric input; Smoothing Weight (%) — Slider or numeric
21f. CAPE-Based: CAPE Ratio — Numeric input; Multiplier — Numeric input


Strategy Info Tooltip / Expandable Explainer — A small "?" icon or expandable section next to the dropdown that briefly explains the selected strategy's logic

Section: Asset Drawdown Strategy

Drawdown Strategy Selector — Dropdown or segmented toggle: Bucket Strategy / Rebalancing Strategy
Bucket Strategy Config — (visible when Bucket is selected)

24a. Drag-to-reorder list of asset classes showing the drawdown priority order (e.g., drag Cash above Bonds above Stocks)


Rebalancing Strategy Config — (visible when Rebalancing is selected)

25a. Target Allocation Inputs — Three numeric inputs (Stocks %, Bonds %, Cash %) that must sum to 100%. Show a validation indicator.
25b. Enable Glide Path Toggle — On/Off switch


Glide Path Editor — (visible when Rebalancing + Glide Path is enabled)

26a. Glide Path Waypoint List — Dynamic list of rows, each containing: Year (numeric input), Stocks %, Bonds %, Cash % (must sum to 100%)
26b. Add Waypoint Button
26c. Remove Waypoint Button (per row, min 2 waypoints)
26d. Glide Path Mini-Chart — A small stacked area or line chart showing the interpolated allocation over time as a visual preview



Section: Additional Income Events

Income Events List — Dynamic list of income cards. Each card contains:

27a. Name/Label — Text input
27b. Amount ($) — Numeric input (today's dollars)
27c. Deposit Into — Dropdown: Stocks / Bonds / Cash
27d. Start Date — Month/Year picker
27e. Frequency — Dropdown: One-Time / Monthly / Quarterly / Annually
27f. End Date — Month/Year picker (disabled when Frequency = One-Time; option for "End of Retirement")
27g. Inflation-Adjusted Toggle — On/Off switch


Add Income Event Button
Remove Income Event Button (per card)

Section: Irregular / Large Expenses

Expense Events List — Dynamic list of expense cards. Each card contains:

30a. Name/Label — Text input
30b. Amount ($) — Numeric input (today's dollars)
30c. Source From — Dropdown: Stocks / Bonds / Cash / "Follow Drawdown Strategy"
30d. Date — Month/Year picker
30e. Frequency — Dropdown: One-Time / Monthly / Annually
30f. End Date — Month/Year picker (disabled when Frequency = One-Time)
30g. Inflation-Adjusted Toggle — On/Off switch


Add Expense Event Button
Remove Expense Event Button (per card)


Output Area (Main Content)
Section: Summary Statistics Bar

Total Drawdown (Nominal) — Stat card
Total Drawdown (Real) — Stat card
Median Monthly Withdrawal (Real) — Stat card
Mean Monthly Withdrawal (Real) — Stat card
Std. Deviation of Withdrawals (Real) — Stat card
25th Percentile Withdrawal (Real) — Stat card
75th Percentile Withdrawal (Real) — Stat card
Terminal Portfolio Value — Stat card (highlighted — green if positive, red if depleted)
Probability of Success — Stat card (only visible when Monte Carlo is on; prominent, large font)

Section: Portfolio Chart

The Chart Itself — Line/area chart showing portfolio value over time
Real vs. Nominal Toggle — Segmented toggle above the chart
Asset Class Breakdown Toggle — Switch to toggle between total portfolio line and stacked area by asset class
Monte Carlo Confidence Bands — (automatic when Monte Carlo is on) Shaded regions for percentile ranges
Tracking Mode Overlay — (automatic in Tracking Mode) Solid line for actuals, dashed for projections, vertical "today" marker
Chart Tooltip on Hover — Shows exact values at the hovered time point
Chart Zoom / Pan — Ability to zoom into a time range (scroll to zoom, drag to pan, or a range selector below the chart)

Section: Detail Table

Monthly / Annual View Toggle — Segmented toggle
The Table Itself — With columns as defined in the original spec (Period, Age, Portfolio Start, Market Movement $/%, Withdrawal Nominal/Real, Income, Expenses, Portfolio End, Clamped indicator)
Sticky Header Row — Headers remain visible while scrolling
Expandable Rows — Click a row to expand and see per-asset-class breakdown
Tracking Mode: Actual vs. Projected Row Styling — Visual distinction (e.g., background color)
Tracking Mode: Editable Cells — In Tracking Mode, certain cells in "actual" rows become editable (actual market return per asset class, actual withdrawal amount)
Sort by Column — Click column headers to sort
Export to CSV Button — Above the table

Section: Stress Test Panel

Stress Test Expandable/Collapsible Panel
Early Downturn Scenario Selector — Dropdown or presets: e.g., "-20% stocks year 1", "-30% stocks years 1-3", "2008-style crash", custom
Stress Test Comparison Display — Side-by-side or inline comparison: Base Case terminal value vs. Stress Case terminal value, with a delta

---

### Addendums

