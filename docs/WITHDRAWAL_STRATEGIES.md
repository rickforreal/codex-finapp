# Withdrawal Strategies — Mathematical Reference

This document provides the precise formulas and algorithmic logic for all 12 withdrawal strategies and both drawdown (asset sourcing) strategies. It is the authoritative reference for implementing the simulation engine. Every variable name maps to a SPECS.md parameter or a derived simulation value.

---

## Table of Contents

1. [Global Conventions](#global-conventions)
2. [Spending Phase Clamping](#spending-phase-clamping)
3. [Strategy 1: Constant Dollar](#strategy-1-constant-dollar)
4. [Strategy 2: Percent of Portfolio](#strategy-2-percent-of-portfolio)
5. [Strategy 3: 1/N](#strategy-3-1n)
6. [Strategy 4: Variable Percentage Withdrawal (VPW)](#strategy-4-variable-percentage-withdrawal-vpw)
7. [Strategy 5: Dynamic SWR](#strategy-5-dynamic-swr)
8. [Strategy 6: Sensible Withdrawals](#strategy-6-sensible-withdrawals)
9. [Strategy 7: 95% Rule](#strategy-7-95-rule)
10. [Strategy 8: Guyton-Klinger](#strategy-8-guyton-klinger)
11. [Strategy 9: Vanguard Dynamic Spending](#strategy-9-vanguard-dynamic-spending)
12. [Strategy 10: Endowment Strategy](#strategy-10-endowment-strategy)
13. [Strategy 11: Hebeler Autopilot II](#strategy-11-hebeler-autopilot-ii)
14. [Strategy 12: CAPE-Based](#strategy-12-cape-based)
15. [Drawdown Strategy A: Bucket](#drawdown-strategy-a-bucket)
16. [Drawdown Strategy B: Rebalancing](#drawdown-strategy-b-rebalancing)
17. [Appendix: PMT Function](#appendix-pmt-function)

---

## Global Conventions

### Variable Glossary

| Variable | Source | Description |
|---|---|---|
| `P₀` | Starting Portfolio (#7+#8+#9) | Total portfolio value at retirement start |
| `Pₜ` | Simulation state | Total portfolio value at start of year `t` (after prior year's market returns and withdrawals) |
| `Wₜ` | Computed | Gross annual withdrawal in year `t` (before spending phase clamping) |
| `Wₜ_clamped` | Computed | Final annual withdrawal after spending phase clamping |
| `Wₜ₋₁` | Simulation state | Final withdrawal from the previous year (clamped) |
| `i` | Inflation Rate (#6) | Annual inflation rate (e.g., 0.03 for 3%) |
| `N` | Retirement Duration (#5) | Total number of retirement years |
| `nₜ` | Derived: `N - t + 1` | Remaining years at start of year `t` (inclusive of year `t`) |
| `rₜ` | Simulation state | Actual portfolio return realized in year `t` (weighted average across asset classes) |

### Annual-to-Monthly Conversion

All withdrawal strategies calculate an **annual** withdrawal at the start of each simulation year (every 12th month). The monthly withdrawal is:

```
monthly_withdrawal = annual_withdrawal / 12
```

This monthly amount is applied evenly across all 12 months of that year. The annual recalculation happens at the start of the next year using the portfolio value at that point.

### Year Indexing

- Year `t = 1` is the first year of retirement.
- Year `t = N` is the final year.
- `nₜ = N - t + 1` gives remaining years including the current year.
- At `t = 1`: `nₜ = N`. At `t = N`: `nₜ = 1`.

### Withdrawal Timing Within a Year

Each simulation year follows this sequence:

1. Record `Pₜ` (portfolio value at start of year).
2. Calculate `Wₜ` using the active withdrawal strategy.
3. Apply spending phase clamping → `Wₜ_clamped`.
4. Divide by 12 for monthly withdrawals.
5. Each month: apply market returns, process income/expense events, deduct the monthly withdrawal via the drawdown strategy.
6. At month 12, the ending balance becomes `Pₜ₊₁`.

### Real vs. Nominal

Some strategies operate in real (inflation-adjusted) terms. When a formula references "real" values:

```
real_value = nominal_value / (1 + i)^(t - 1)
```

When inflating a prior year's withdrawal forward by one year:

```
Wₜ₋₁_inflated = Wₜ₋₁ × (1 + i)
```

---

## Spending Phase Clamping

Every strategy's output is subject to a global post-processing step. The active spending phase for year `t` defines:

- `phase_min`: Minimum monthly withdrawal (in today's dollars, from #17d)
- `phase_max`: Maximum monthly withdrawal (in today's dollars, from #17e)

These bounds are inflation-adjusted to year `t`:

```
min_annual_t = phase_min × 12 × (1 + i)^(t - 1)
max_annual_t = phase_max × 12 × (1 + i)^(t - 1)
```

Clamping logic:

```
if Wₜ < min_annual_t:
    Wₜ_clamped = min_annual_t        # floor applied — flagged with ↑ in table
elif Wₜ > max_annual_t:
    Wₜ_clamped = max_annual_t        # ceiling applied — flagged with ↓ in table
else:
    Wₜ_clamped = Wₜ                  # no clamping
```

**Important:** Strategies that reference "prior year withdrawal" (Strategies 7–11) should reference the **clamped** value `Wₜ₋₁_clamped`, since that is what the retiree actually received and what the portfolio actually paid out. The clamped value is the ground truth.

---

## Strategy 1: Constant Dollar

**Category:** Basic  
**SPECS parameters:** `initialWithdrawalRate` (21-1a)

### Formula

**Year 1:**

```
W₁ = P₀ × initialWithdrawalRate
```

**Year t > 1:**

```
Wₜ = Wₜ₋₁_clamped × (1 + i)
```

The withdrawal is computed once in Year 1 and then adjusted upward by inflation each subsequent year. Portfolio performance has no effect on the withdrawal amount.

### Notes

- This is the classic "4% Rule" when `initialWithdrawalRate = 0.04`.
- The inflation adjustment compounds: by Year 20 at 3% inflation, the nominal withdrawal is ~1.81× the Year 1 amount.
- If spending phase clamping overrides the withdrawal in a given year, the next year's inflation adjustment is based on the clamped amount (what was actually withdrawn).

---

## Strategy 2: Percent of Portfolio

**Category:** Basic  
**SPECS parameters:** `annualWithdrawalRate` (21-2a)

### Formula

**Every year:**

```
Wₜ = Pₜ × annualWithdrawalRate
```

### Notes

- The portfolio can never be fully depleted under this strategy in isolation (withdrawals shrink proportionally), though income events, expenses, and negative returns can still cause depletion.
- Income is highly volatile — a 30% market drop immediately produces a 30% income drop.

---

## Strategy 3: 1/N

**Category:** Basic  
**SPECS parameters:** None

### Formula

**Every year:**

```
Wₜ = Pₜ / nₜ
```

Where `nₜ = N - t + 1` (remaining years including this one).

### Notes

- Year 1 of a 40-year retirement: `W₁ = P₁ / 40` (2.5% rate).
- Year 30: `W₃₀ = P₃₀ / 11` (~9.1% rate).
- Final year: `Wₙ = Pₙ / 1` (entire remaining portfolio).
- The effective withdrawal rate increases monotonically over time.

---

## Strategy 4: Variable Percentage Withdrawal (VPW)

**Category:** Adaptive  
**SPECS parameters:** `expectedRealReturn` (21-4a), `drawdownTarget` (21-4b)

### Formula

**Every year:**

```
residual = (1 - drawdownTarget) × Pₜ
Wₜ = PMT(expectedRealReturn, nₜ, Pₜ, -residual)
```

Where `PMT` is the standard financial payment function (see [Appendix](#appendix-pmt-function)).

When `drawdownTarget = 1.0` (100%), `residual = 0`, simplifying to:

```
Wₜ = PMT(expectedRealReturn, nₜ, Pₜ, 0)
```

### Expanded PMT for this case

```
if expectedRealReturn == 0:
    Wₜ = (Pₜ - residual) / nₜ
else:
    r = expectedRealReturn
    Wₜ = (Pₜ × r - residual × r) / (1 - (1 + r)^(-nₜ))
```

### Notes

- This produces a **real** (inflation-adjusted) withdrawal. The simulation engine should treat the PMT output as a real value and convert to nominal for the actual withdrawal:
  ```
  Wₜ_nominal = Wₜ_real × (1 + i)^(t - 1)
  ```
- At `drawdownTarget = 100%` and `expectedRealReturn = 0%`, VPW degenerates to 1/N.
- The withdrawal percentage naturally increases as `nₜ` decreases.

---

## Strategy 5: Dynamic SWR

**Category:** Adaptive  
**SPECS parameters:** `expectedRateOfReturn` (21-5a)  
**Also uses:** `inflationRate` from Core Parameters (#6)

### Formula

**Every year:**

```
roi = expectedRateOfReturn       # nominal
inf = inflationRate

if roi == inf:
    Wₜ = Pₜ / nₜ               # degenerates to 1/N
else:
    Wₜ = Pₜ × (roi - inf) / (1 - ((1 + inf) / (1 + roi))^nₜ)
```

### Derivation Context

This formula is a present-value annuity calculation that determines the level real withdrawal stream which, given the expected nominal return and inflation rate, would exactly exhaust the portfolio over `nₜ` remaining years. The numerator `(roi - inf)` is approximately the real return; the denominator accounts for the compounding of real returns over time.

### Notes

- The output is a **nominal** withdrawal amount (the formula already accounts for inflation internally).
- If `roi < inf` (negative expected real return), the formula still works but produces higher withdrawals earlier (spending down faster because the portfolio is expected to lose real value).
- Edge case: if `roi == inf`, use the `Pₜ / nₜ` fallback to avoid division by zero.
- As `nₜ → 1`, `Wₜ → Pₜ × (roi - inf) / (1 - (1+inf)/(1+roi))` which approaches `Pₜ` (full spend in the last year).

---

## Strategy 6: Sensible Withdrawals

**Category:** Adaptive  
**SPECS parameters:** `baseWithdrawalRate` (21-6a), `extrasWithdrawalRate` (21-6b)

### Formula

**Year 1:**

```
W₁ = P₁ × baseWithdrawalRate
```

(No extras in Year 1 — there is no prior year to measure gains against.)

**Year t > 1:**

```
base = Pₜ × baseWithdrawalRate

# Calculate prior year's real portfolio gain
# realGain = actual portfolio growth minus inflation
realGain = Pₜ - Pₜ₋₁ × (1 + i)
# Note: Pₜ₋₁ here is the portfolio at the START of the prior year.
# More precisely: realGain = (Pₜ + total_withdrawals_year_t-1) - Pₜ₋₁ × (1 + i)
# i.e., the gain before accounting for withdrawals, inflation-adjusted.

if realGain > 0:
    extras = realGain × extrasWithdrawalRate
else:
    extras = 0

Wₜ = base + extras
```

### Calculating Real Gain Precisely

The "real gain" should measure how the portfolio performed in the prior year, excluding the effect of withdrawals and income. The correct calculation:

```
# For year (t-1):
portfolio_start = Pₜ₋₁
portfolio_end_before_flows = Pₜ₋₁ × (1 + rₜ₋₁)    # hypothetical end with no withdrawals/income
real_portfolio_start = Pₜ₋₁ × (1 + i)               # inflation-adjusted starting value

realGain = portfolio_end_before_flows - real_portfolio_start
         = Pₜ₋₁ × (rₜ₋₁ - i)
```

Simplified:

```
realGain = Pₜ₋₁ × (rₜ₋₁ - i)
```

Where `rₜ₋₁` is the weighted portfolio return for year `t-1`.

### Notes

- The base component ensures a minimum income every year regardless of market performance.
- The extras component acts as a dividend of sorts — sharing good fortune when it occurs, but never requiring spending from losses.

---

## Strategy 7: 95% Rule

**Category:** Guardrails  
**SPECS parameters:** `annualWithdrawalRate` (21-7a), `minimumFloor` (21-7b)

### Formula

**Year 1:**

```
W₁ = P₁ × annualWithdrawalRate
```

**Year t > 1:**

```
target = Pₜ × annualWithdrawalRate
floor  = Wₜ₋₁_clamped × minimumFloor

Wₜ = max(target, floor)
```

### Notes

- The floor creates a ratchet-like effect: spending can decrease, but only by `(1 - minimumFloor)` per year (5% with the default 95% floor).
- There is **no ceiling** — if the portfolio grows, the full `target` is taken. The asymmetry (soft floor, no ceiling) means spending drifts upward over time in bull markets and resists downward pressure in bear markets.
- This asymmetry is also the strategy's main risk: during prolonged downturns, the floor can sustain unsustainably high withdrawals. The spending phase max acts as an external safeguard.
- Named after Bob Clyatt's book "Work Less, Live More."

---

## Strategy 8: Guyton-Klinger

**Category:** Guardrails  
**SPECS parameters:** `initialWithdrawalRate` (21-8a), `capitalPreservationTrigger` (21-8b), `capitalPreservationCut` (21-8c), `prosperityTrigger` (21-8d), `prosperityRaise` (21-8e), `guardrailsSunset` (21-8f)

This is the most complex strategy. It combines an inflation-adjusted base withdrawal (like Constant Dollar) with four decision rules applied in sequence each year.

### Derived Constants

```
iwr = initialWithdrawalRate                           # e.g., 0.052
capTriggerRate = iwr × (1 + capitalPreservationTrigger) # e.g., 0.052 × 1.20 = 0.0624
prosTriggerRate = iwr × (1 - prosperityTrigger)         # e.g., 0.052 × 0.80 = 0.0416
sunsetYear = N - guardrailsSunset                       # e.g., 40 - 15 = 25
```

### Formula

**Year 1:**

```
W₁ = P₀ × iwr
```

**Year t > 1 — apply rules in this order:**

**Rule 1: Withdrawal Rule (inflation adjustment)**

```
if rₜ₋₁ < 0 AND (Wₜ₋₁_clamped / Pₜ) > iwr:
    # Negative return year AND current withdrawal rate exceeds initial rate
    # FREEZE: no inflation adjustment
    Wₜ_base = Wₜ₋₁_clamped
else:
    # Normal: adjust for inflation
    Wₜ_base = Wₜ₋₁_clamped × (1 + i)
```

**Rule 2: Capital Preservation Rule**

```
currentRate = Wₜ_base / Pₜ

if t <= sunsetYear AND currentRate > capTriggerRate:
    Wₜ_adjusted = Wₜ_base × (1 - capitalPreservationCut)
else:
    Wₜ_adjusted = Wₜ_base
```

**Rule 3: Prosperity Rule**

```
currentRate = Wₜ_adjusted / Pₜ

if t <= sunsetYear AND currentRate < prosTriggerRate:
    Wₜ = Wₜ_adjusted × (1 + prosperityRaise)
else:
    Wₜ = Wₜ_adjusted
```

**Rule 4: Portfolio Management Rule**

The original Guyton-Klinger formulation includes a Portfolio Management Rule that governs asset allocation changes. In this application, asset sourcing is handled by the separate Drawdown Strategy (Bucket or Rebalancing), so **Rule 4 is not implemented as part of the withdrawal calculation**. The drawdown strategy subsumes this function.

### Execution Order

The rules must be applied in precisely this order: Withdrawal Rule → Capital Preservation → Prosperity. Applying them out of order produces different results because each rule modifies the withdrawal that the next rule evaluates.

### The Sunset Provision

After `sunsetYear` (i.e., when `t > N - guardrailsSunset`), the Capital Preservation and Prosperity rules stop being evaluated. Only the Withdrawal Rule (inflation adjustment freeze) continues. The rationale: near the end of retirement, guardrails that might cut spending are counterproductive — the retiree should be spending down, not preserving capital.

### Notes

- Both Capital Preservation and Prosperity can fire in the same year (though this is rare in practice — it would require the withdrawal rate to be simultaneously above the cap trigger and below the prosperity trigger after adjustment, which is impossible by construction).
- The Capital Preservation cut and Prosperity raise are **one-time adjustments to the withdrawal amount**, not permanent rate changes. However, because subsequent years build on the adjusted amount (via inflation), the effect persists and compounds.
- `rₜ₋₁` in Rule 1 is the portfolio's total weighted return for the prior year (across all asset classes).

### Worked Example

```
Setup: P₀ = $1,000,000, iwr = 5.2%, i = 3%
       capTrigger = 20%, capCut = 10%, prosTrigger = 20%, prosRaise = 10%
       sunsetYear = 25

Year 1: W₁ = $1,000,000 × 0.052 = $52,000

Year 2: Portfolio dropped to $900,000, rₜ₋₁ = -10%
  Rule 1: r < 0 AND ($52,000 / $900,000 = 5.78%) > 5.2% → FREEZE
          Wₜ_base = $52,000
  Rule 2: currentRate = $52,000 / $900,000 = 5.78%
          capTriggerRate = 5.2% × 1.20 = 6.24%
          5.78% < 6.24% → no cut
          Wₜ_adjusted = $52,000
  Rule 3: prosTriggerRate = 5.2% × 0.80 = 4.16%
          5.78% > 4.16% → no raise
  W₂ = $52,000

Year 3: Portfolio recovered to $1,100,000, rₜ₋₁ = +22%
  Rule 1: r > 0 → inflate
          Wₜ_base = $52,000 × 1.03 = $53,560
  Rule 2: currentRate = $53,560 / $1,100,000 = 4.87%
          capTriggerRate = 6.24%
          4.87% < 6.24% → no cut
  Rule 3: prosTriggerRate = 4.16%
          4.87% > 4.16% → no raise
  W₃ = $53,560

Year 4: Portfolio surged to $1,400,000, rₜ₋₁ = +27%
  Rule 1: r > 0 → inflate
          Wₜ_base = $53,560 × 1.03 = $55,167
  Rule 2: currentRate = $55,167 / $1,400,000 = 3.94%
          3.94% < 6.24% → no cut
  Rule 3: 3.94% < 4.16% → PROSPERITY RAISE
          Wₜ = $55,167 × 1.10 = $60,684
```

---

## Strategy 9: Vanguard Dynamic Spending

**Category:** Guardrails  
**SPECS parameters:** `annualWithdrawalRate` (21-9a), `ceiling` (21-9b), `floor` (21-9c)

### Formula

**Year 1:**

```
W₁ = P₁ × annualWithdrawalRate
```

**Year t > 1:**

```
target = Pₜ × annualWithdrawalRate

# Ceiling and floor are applied in REAL terms
prior_real = Wₜ₋₁_clamped                # already in year t-1 nominal dollars
ceiling_amount = prior_real × (1 + i) × (1 + ceiling)
floor_amount   = prior_real × (1 + i) × (1 - floor)

Wₜ = clamp(target, floor_amount, ceiling_amount)
```

Where:
```
clamp(x, lo, hi) = min(max(x, lo), hi)
```

### Explanation of Real-Terms Constraint

The ceiling and floor constrain changes in **real (inflation-adjusted) spending**. This means:

- The prior year's withdrawal is first inflated to maintain purchasing power: `prior_real × (1 + i)`
- Then the ceiling/floor percentages are applied on top of that inflated base
- A 5% ceiling means real spending can grow at most 5% above last year's real spending
- A 2.5% floor means real spending can shrink at most 2.5% below last year's real spending

### Notes

- With `ceiling = 0` and `floor = 0`, this degenerates to Constant Dollar (inflation-only adjustments).
- With very large ceiling and floor values, this approaches Percent of Portfolio (unconstrained).
- The floor and ceiling create a "corridor" that the withdrawal walks through over time, tracking the portfolio with dampened volatility.

---

## Strategy 10: Endowment Strategy

**Category:** Endowment & Hybrid  
**SPECS parameters:** `spendingRate` (21-10a), `smoothingWeight` (21-10b)

### Formula

**Year 1:**

```
W₁ = P₁ × spendingRate
```

**Year t > 1:**

```
prior_inflated = Wₜ₋₁_clamped × (1 + i)
new_calculation = Pₜ × spendingRate

Wₜ = smoothingWeight × prior_inflated + (1 - smoothingWeight) × new_calculation
```

### Notes

- At `smoothingWeight = 1.0`: pure Constant Dollar (ignores current portfolio entirely).
- At `smoothingWeight = 0.0`: pure Percent of Portfolio (ignores prior spending entirely).
- The default `smoothingWeight = 0.70` means 70% of the withdrawal is based on prior spending (stability) and 30% on the current portfolio (responsiveness).
- This is modeled after how university endowments manage spending — smooth, gradual adjustments that avoid shocking the operating budget.
- The inflation adjustment on the prior component ensures the "stable" portion maintains purchasing power, not just nominal value.

---

## Strategy 11: Hebeler Autopilot II

**Category:** Endowment & Hybrid  
**SPECS parameters:** `initialWithdrawalRate` (21-11a), `pmtExpectedReturn` (21-11b), `priorYearWeight` (21-11c)

### Formula

**Year 1:**

```
W₁ = P₀ × initialWithdrawalRate
```

**Year t > 1:**

```
# PMT component: level real payment to exhaust portfolio over remaining years
pmt_component = PMT(pmtExpectedReturn, nₜ, Pₜ, 0)

# Prior year component: last year's withdrawal adjusted for inflation
prior_component = Wₜ₋₁_clamped × (1 + i)

# Blend
Wₜ = priorYearWeight × prior_component + (1 - priorYearWeight) × pmt_component
```

### PMT Expansion

```
if pmtExpectedReturn == 0:
    pmt_component = Pₜ / nₜ
else:
    r = pmtExpectedReturn
    pmt_component = (Pₜ × r) / (1 - (1 + r)^(-nₜ))
```

### Notes

- The PMT component is a **real** withdrawal amount (it uses a real expected return). The prior component is inflated to nominal. The blend therefore mixes a real and nominal value. This is consistent with Hebeler's original formulation — the PMT provides the "what should I be spending" signal in real terms, while the prior year provides continuity.
- To keep units consistent in the blend, convert the PMT output to nominal before blending:
  ```
  pmt_nominal = pmt_component × (1 + i)^(t - 1)
  Wₜ = priorYearWeight × prior_component + (1 - priorYearWeight) × pmt_nominal
  ```
- At `priorYearWeight = 1.0`: pure Constant Dollar behavior.
- At `priorYearWeight = 0.0`: pure VPW behavior (with 100% drawdown target).
- Created by financial advisor Henry K. Hebeler. The "Autopilot II" name distinguishes it from his earlier, simpler "Autopilot" method.

---

## Strategy 12: CAPE-Based

**Category:** Endowment & Hybrid  
**SPECS parameters:** `baseWithdrawalRate` (21-12a, denoted `a`), `capeWeight` (21-12b, denoted `b`), `startingCAPE` (21-12c)

### Formula

**Every year:**

```
# In Manual mode: CAPE is constant throughout
CAPEₜ = startingCAPE

# Withdrawal rate for this year
rate_t = a + (b / CAPEₜ)

# Withdrawal
Wₜ = Pₜ × rate_t
```

### CAPE Behavior by Simulation Mode

**Manual mode:**
- `CAPEₜ = startingCAPE` for all years. The CAPE ratio does not change over the simulation. This is a deliberate simplification for v1.

**Monte Carlo mode:**
- If the historical dataset includes CAPE values for each month, `CAPEₜ` is derived from the sampled historical month's data. Each simulation path will have different CAPE trajectories based on which historical periods were sampled.
- If CAPE data is not bundled in the historical dataset, fall back to the constant `startingCAPE` approach and display a note to the user.

### Formula Behavior at Extremes

| CAPE | Rate | Interpretation |
|---|---|---|
| 10 (cheap) | `1.5% + 0.5/10 = 6.5%` | High withdrawal — market is undervalued |
| 20 (moderate) | `1.5% + 0.5/20 = 4.0%` | Moderate withdrawal |
| 30 (expensive) | `1.5% + 0.5/30 = 3.2%` | Lower withdrawal — market is overvalued |
| 40 (very expensive) | `1.5% + 0.5/40 = 2.75%` | Conservative withdrawal |

(Using defaults: `a = 1.5%`, `b = 0.5`)

### Notes

- The formula `a + b/CAPE` is equivalent to `a + b × earnings_yield`, since `1/CAPE` ≈ the cyclically adjusted earnings yield.
- The base rate `a` acts as a floor — even at extremely high CAPE values, the withdrawal rate never drops below `a`.
- There is no explicit ceiling, but at very low CAPE values (e.g., CAPE = 5), the rate could be quite high (e.g., `1.5% + 0.5/5 = 11.5%`). The spending phase max acts as a safeguard.

---

## Drawdown Strategy A: Bucket

**SPECS parameters:** `bucketOrder` (derived from #24 drag order)

The Bucket strategy processes withdrawals sequentially through asset classes in priority order.

### Algorithm

Given a monthly withdrawal amount `w` and asset class balances `[S, B, C]` (Stocks, Bonds, Cash) with priority order `bucketOrder`:

```
remaining = w

for assetClass in bucketOrder:
    available = balance[assetClass]
    deduction = min(remaining, available)
    balance[assetClass] -= deduction
    remaining -= deduction
    if remaining == 0:
        break

if remaining > 0:
    # Portfolio cannot fully fund the withdrawal
    # Record shortfall: actual_withdrawal = w - remaining
    # This is a partial depletion event
```

### Income Event Deposits

Income events deposit into their specified asset class (per #27c). The deposit does **not** trigger any rebalancing — it simply increases that asset class balance.

### Expense Event Sourcing

Large expenses with `sourceFrom = "follow-strategy"` use the same bucket algorithm above. Expenses with a specific asset class source from that class first; if insufficient, the remainder follows the bucket order as a fallback.

### Notes

- Under pure Bucket with the default order (Cash → Bonds → Stocks), the portfolio composition shifts dramatically over time: Cash depletes first, then Bonds, leaving an all-Stocks portfolio in later years. This is visible in the asset class breakdown chart.
- After an asset class is fully depleted, it stays at $0 unless replenished by an income event deposited into it.

---

## Drawdown Strategy B: Rebalancing

**SPECS parameters:** `targetAllocation` (#25a), `glidePathEnabled` (#25b), `glidePath` (#26a waypoints)

The Rebalancing strategy sources withdrawals to move the portfolio toward its target allocation.

### Determining the Target

**If glide path is disabled:**
```
target = targetAllocation    # e.g., { stocks: 0.70, bonds: 0.25, cash: 0.05 }
```

**If glide path is enabled:**

Find the two waypoints bracketing the current year and linearly interpolate:

```
# Find waypoints where wp_before.year <= currentYear <= wp_after.year
for each asset class:
    target[asset] = wp_before[asset] + 
        (wp_after[asset] - wp_before[asset]) × 
        (currentYear - wp_before.year) / (wp_after.year - wp_before.year)
```

If `currentYear` exactly matches a waypoint, use that waypoint's values directly.

### Withdrawal Sourcing Algorithm

Given a monthly withdrawal amount `w`, current balances `{S, B, C}`, and target allocation `{tS, tB, tC}`:

```
totalPortfolio = S + B + C

# Step 1: Calculate current allocation
currentAlloc = { stocks: S/total, bonds: B/total, cash: C/total }

# Step 2: Calculate overweight amounts (dollars above target)
overweight = {}
for each asset:
    targetDollars = totalPortfolio × target[asset]
    overweight[asset] = max(0, balance[asset] - targetDollars)

totalOverweight = sum(overweight.values())

# Step 3: Source from overweight classes proportionally
if totalOverweight >= w:
    # Sufficient overweight to cover the entire withdrawal
    for each asset:
        deduction[asset] = w × (overweight[asset] / totalOverweight)
else:
    # Withdraw all overweight, then distribute remainder proportionally
    remainder = w - totalOverweight
    for each asset:
        deduction[asset] = overweight[asset] + remainder × target[asset]

# Step 4: Apply deductions
for each asset:
    # Never withdraw more than available
    deduction[asset] = min(deduction[asset], balance[asset])
    balance[asset] -= deduction[asset]

# Step 5: Handle any remaining shortfall (if portfolio is nearly depleted)
actualWithdrawn = sum(deduction.values())
if actualWithdrawn < w:
    # Try to make up difference from any remaining balances
    shortfall = w - actualWithdrawn
    for each asset with balance[asset] > 0:
        additional = min(shortfall, balance[asset])
        balance[asset] -= additional
        shortfall -= additional
```

### Income Event Interaction

Income deposits go to the user-specified asset class. This may push the portfolio away from its target. The next withdrawal will preferentially draw from the now-overweight class, naturally correcting the drift.

### Expense Event Sourcing

Same as Bucket: expenses with `sourceFrom = "follow-strategy"` use the rebalancing algorithm. Expenses targeting a specific asset class source from that class first, with rebalancing-based fallback for any shortfall.

### Asset Class Depletion

If an asset class reaches $0, the target allocation becomes unachievable. The engine recalculates target proportions among the surviving classes:

```
# If stocks depleted:
adjustedTarget = {
    bonds: target.bonds / (target.bonds + target.cash),
    cash:  target.cash  / (target.bonds + target.cash)
}
```

This ensures the remaining classes still converge toward a proportional target rather than leaving orphaned allocation targets.

### Notes

- This is "soft" rebalancing — it only occurs through withdrawals and deposits. There are no explicit buy/sell rebalancing trades. The portfolio drifts with market returns between events.
- In months with both income deposits and withdrawals, process income first, then withdrawals. This gives the rebalancing algorithm the most accurate picture of the current portfolio state.

---

## Appendix: PMT Function

The PMT (Payment) function calculates the level periodic payment for an annuity given a rate, number of periods, present value, and future value. It is used by Strategies 4 (VPW) and 11 (Hebeler Autopilot II).

### Standard Definition

```
PMT(rate, nper, pv, fv)
```

Returns the periodic payment needed to go from `pv` (present value) to `fv` (future value) over `nper` periods at the given `rate` per period.

### Formula

```
if rate == 0:
    PMT = -(pv + fv) / nper
else:
    PMT = -rate × (pv × (1 + rate)^nper + fv) / ((1 + rate)^nper - 1)
```

### Sign Convention

In the standard financial convention, PMT returns a **negative** value for outflows (payments). For withdrawal purposes, we want a positive withdrawal amount, so:

```
withdrawal = -PMT(rate, nper, pv, fv)
```

Or equivalently, use the absolute value / flip the sign in the formula:

```
if rate == 0:
    withdrawal = (pv + fv) / nper
else:
    withdrawal = rate × (pv × (1 + rate)^nper + fv) / ((1 + rate)^nper - 1)
```

Note: `fv` for full spend-down is `0`. For VPW with a residual target, `fv = -(1 - drawdownTarget) × Pₜ` (negative because it's a remaining balance, not a payment).

### Example

```
PMT(0.03, 30, 1000000, 0):
  = 0.03 × (1000000 × 1.03^30 + 0) / (1.03^30 - 1)
  = 0.03 × (1000000 × 2.4273) / (2.4273 - 1)
  = 0.03 × 2427262 / 1.4273
  = 72818 / 1.4273
  = $51,019 / year
```

This means: at a 3% real return over 30 years, withdrawing ~$51,019/year (in real terms) will fully exhaust a $1,000,000 portfolio.