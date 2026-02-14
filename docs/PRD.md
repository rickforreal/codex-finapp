# Retirement Forecasting App — Product Requirements Document

## What This App Does

This is a single-page web application that helps people approaching or in early retirement answer a fundamental question: **will my money last?**

The user describes their financial situation — how much they've saved, how they plan to spend, and what income they expect — and the app simulates their entire retirement trajectory month by month, projecting portfolio balances, withdrawal income, and the probability of running out of money. There is no backend, no accounts, no saved state between sessions.

## Who It's For

The primary user is someone within a few years of retirement (or recently retired) who has accumulated meaningful savings across stocks, bonds, and cash, and wants to stress-test whether their nest egg can sustain them for 30–40 years. They are financially literate but not necessarily finance professionals. They want depth and precision — this is not a simplified "retirement calculator" with three inputs and a green/red answer. It is a power-user tool that rewards exploration.

## The Two Modes

The app has two operating modes, toggled at the top of the page:

**Planning Mode** is for pre-retirement exploration. The user configures their assumptions — portfolio size, expected returns, spending patterns, withdrawal strategy — and runs simulations to see projected outcomes. Nothing is "real" in this mode; it's a sandbox for testing strategies and asking "what if?" The user can run a single stochastic simulation (one possible future) or a Monte Carlo simulation (a thousand possible futures drawn from historical market data) to understand the range of outcomes and the probability their portfolio survives.

**Tracking Mode** is for people already in retirement. They enter actual portfolio values and actual withdrawals as months pass, and the app re-forecasts their remaining trajectory from where they actually are. This turns the app from a planning tool into an ongoing monitoring dashboard. The user can see whether they're ahead of or behind their plan, and can run Monte Carlo simulations from their current position to get an updated probability of success incorporating real-world data.

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

**Summary statistics** are the headline numbers — total spending, median monthly income, terminal portfolio value, and (in Monte Carlo mode) the probability of success. These give an instant pass/fail assessment.

**The portfolio chart** shows how the portfolio value evolves over time as a line chart. In Monte Carlo mode, confidence bands show the range of possible outcomes. In Tracking Mode, the chart distinguishes actual historical performance from projected future values. The user can toggle between nominal and inflation-adjusted views, and can switch to an asset class breakdown to see how the portfolio composition shifts over time.

**The detail table** is a month-by-month (or year-by-year) ledger showing every number — starting balance, market movement, withdrawals, income, expenses, ending balance — with the option to expand each row into per-asset-class detail. In Tracking Mode, past months are editable so the user can enter actual values.

**Snapshot and history controls** sit in the application toolbar alongside the mode toggle. An undo/redo pair lets the user step backward and forward through recent changes, encouraging experimentation. A snapshot system lets the user save the complete state of their dashboard — all inputs, actuals, and configuration — to a named JSON file on their local drive, and reload any previously saved snapshot. This gives the app session-to-session continuity without a backend.

**The stress test panel** lets the user apply hypothetical market shocks — a stock crash, a prolonged bear market, an inflation spike — and compare the outcomes against the base case. This makes sequence-of-returns risk tangible: the same crash is far more damaging in Year 1 than in Year 20, and the stress test makes that visible.

## Design Principles

**Information-dense but not overwhelming.** The app packs a lot of data into a single page. Inputs live in a sidebar; outputs fill the main area. Sections collapse and expand. Detail is progressive — summary first, chart second, table third, stress test last.

**Professional financial aesthetic.** Clean, muted colors. No playful gradients or illustrations. Tabular numerals in the table. The app should feel like a Bloomberg terminal's approachable cousin, not a consumer fintech app.

**Desktop-first.** This is a power-user tool optimized for large screens. It should be usable on tablet but is not designed for phones. Horizontal space is assumed to be generous.

**Explore-and-iterate workflow.** In Planning Mode, changing inputs does not automatically re-run the simulation — the user adjusts parameters and clicks "Run Simulation" when ready. This gives them control over when expensive computations happen and lets them make multiple changes before seeing results. In Tracking Mode, editing actual values triggers immediate re-forecasting for responsiveness.

**Nondestructive exploration.** The app supports deep undo/redo history (up to 100 changes) so users can experiment freely without fear of losing a good configuration. Users can also save named snapshots of their entire dashboard state to disk as JSON files and reload them later, enabling side-by-side strategy comparison across sessions and providing durable persistence without requiring a backend or accounts.
