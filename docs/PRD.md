# Retirement Forecasting App — Product Requirements Document

## What This App Does

This is a single-page web application that helps people approaching or in early retirement answer a fundamental question: **will my money last?**

The user describes their financial situation — how much they've saved, how they plan to spend, and what income they expect — and the app simulates their entire retirement trajectory month by month, projecting portfolio balances, withdrawal income, and the probability of running out of money. The app uses a stateless backend compute service (no accounts, no server-side user state persistence between sessions).

## Who It's For

The primary user is someone within a few years of retirement (or recently retired) who has accumulated meaningful savings across stocks, bonds, and cash, and wants to stress-test whether their nest egg can sustain them for 30–40 years. They are financially literate but not necessarily finance professionals. They want depth and precision — this is not a simplified "retirement calculator" with three inputs and a green/red answer. It is a power-user tool that rewards exploration.

## The Two Modes

The app has two operating modes, toggled at the top of the page:

**Planning Mode** is for pre-retirement exploration. The user configures assumptions — portfolio size, expected returns, spending patterns, withdrawal strategy — and runs simulations to see projected outcomes. Nothing is "real" in this mode; it's a sandbox for testing strategies and asking "what if?" The user can run a single stochastic simulation (one possible future) or a Monte Carlo simulation (a thousand possible futures drawn from historical market data) to understand the range of outcomes and the probability their portfolio survives.

**Tracking Mode** is for people already in retirement. They enter actual portfolio values and actual withdrawals as months pass, and the app re-forecasts their remaining trajectory from where they actually are. This turns the app from a planning tool into an ongoing monitoring dashboard. The user can see whether they're ahead of or behind their plan, and can run Monte Carlo simulations from their current position to get an updated probability of success incorporating real-world data.

Planning and Tracking operate as independent workspaces. On first switch into Tracking, the app clones the current Planning inputs once, clears Tracking simulation caches, and then both modes evolve independently.

## How the Simulation Works

The simulation engine models retirement month by month. Each month, it applies market returns to the portfolio, deposits any scheduled income, calculates a withdrawal based on the chosen strategy, deducts any irregular expenses, and records the end-of-month balance. This repeats for every month of the retirement period.

The user controls the simulation through several major input categories:

**Portfolio and market assumptions** define the starting balances in stocks, bonds, and cash, and the expected returns and volatility for each. In Monte Carlo mode, the app samples returns from actual historical market data spanning 1926–2024, with the user choosing which historical era to draw from.

**Spending phases** allow the user to define different spending levels across retirement — higher spending in active early years, lower in the middle, potentially higher again in late retirement for healthcare. Each phase sets a floor and ceiling on monthly withdrawals.

**Withdrawal strategy** determines how much money to pull from the portfolio each month. The app offers twelve strategies ranging from simple (a fixed percentage of the portfolio) to sophisticated (Guyton-Klinger guardrails, CAPE-based dynamic withdrawals, endowment-style smoothing). Each strategy has its own trade-offs between income stability and portfolio longevity, and the app surfaces the relevant parameters for whichever strategy is selected.

**Asset drawdown strategy** determines which asset classes the withdrawals come from — either a bucket approach (deplete cash first, then bonds, then stocks) or a rebalancing approach (withdraw from overweight classes to maintain target allocations, with optional glide path shifts over time).

**Income events and large expenses** let the user model real-world cash flows — Social Security starting at a certain age, a pension, rental income, an inheritance, a new roof, long-term care costs, gifts to children. These are layered on top of the core withdrawal simulation.

## What the User Sees

The output area presents results at four levels of detail, each answering the question differently:

**Summary statistics** are the headline numbers — total drawdown, median monthly income, portfolio end (real), and (in Monte Carlo mode) the probability of success. These give an instant pass/fail assessment.

**The portfolio chart** shows how the portfolio value evolves over time as a line chart. In Monte Carlo mode, confidence bands show the range of possible outcomes. In Tracking Mode, the chart distinguishes actual historical performance from projected future values. The user can toggle between nominal and inflation-adjusted views, and can switch to an asset class breakdown to see how the portfolio composition shifts over time.

**The detail ledger** is a month-by-month (or year-by-year) ledger showing every number — starting balance, market movement, withdrawals, income, expenses, ending balance — with a Breakdown control to switch between compact and per-asset-class columns. In Tracking Mode, past months are editable so the user can enter actual values.

**Snapshot controls** sit in the application toolbar alongside the mode toggle. The user can save the complete state of their dashboard — inputs, actuals, configuration, and cached outputs — to a named JSON file on their local drive, and reload any previously saved snapshot. This gives the app session-to-session continuity without a backend.

**CSV export is deferred** in the current release and is reserved for a future phase.

**The stress test panel** lets the user apply hypothetical market shocks — a stock crash, a prolonged bear market, an inflation spike — and compare the outcomes against the base case. Stress scenarios are also overlaid directly on the main chart with legend and tooltip support, so base-vs-scenario divergence is visible in context.

**Theme system** lets the user switch visual identity globally (Light, Dark, High Contrast in the current release). Themes are server-defined token bundles (color, typography, spacing, chart/state styling) and are applied app-wide by selecting a theme ID.

## Design Principles

**Information-dense but not overwhelming.** The app packs a lot of data into a single page. Inputs live in a sidebar; outputs fill the main area. Sections collapse and expand. Detail is progressive — summary first, chart second, table third, stress test last.

**Professional financial aesthetic.** Clean, muted colors. No playful gradients or illustrations. Tabular numerals in the table. The app should feel like a Bloomberg terminal's approachable cousin, not a consumer fintech app.
Themed variants must preserve this professional tone while supporting stronger contrast variants for accessibility.

**Desktop-first.** This is a power-user tool optimized for large screens. It should be usable on tablet but is not designed for phones. Horizontal space is assumed to be generous.

**Explore-and-iterate workflow.** In Planning Mode, changing inputs does not automatically re-run the simulation — the user adjusts parameters and clicks "Run Simulation" when ready. This gives them control over when expensive computations happen and lets them make multiple changes before seeing results. In Tracking Mode, editing actual values triggers immediate re-forecasting for responsiveness.

**Nondestructive exploration.** The app supports named snapshot files as the primary recovery and comparison mechanism. Users can save and reload complete dashboard states as JSON files, enabling side-by-side strategy comparison across sessions and durable persistence without requiring a backend or accounts.
Theme selection is part of the persisted state so loaded snapshots restore their visual context exactly.
