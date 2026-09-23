# Business Logic Extraction

The business logic is **whatever the system decides or computes on the
business's behalf**. In analytical, financial, pricing, scoring, scheduling,
and insurance systems, most of it is written as arithmetic and algorithms.
A formula for accrued interest, a discounted-cash-flow loop, a weighted
risk score, or a pro-ration rule is the business logic, even though it looks
like implementation detail. Your job is to lift it out of the code and state
it so a product manager can read it and a developer can verify it.

## Where rules hide

Look beyond `if` statements in "service" classes:

| Location | What to look for |
|---|---|
| Arithmetic on business quantities | Any `*`, `/`, `**`, `pow`, `exp`, `log`, `sum`, `round` touching money, rates, quantities, dates, scores, weights |
| Loops that accumulate | Schedules, projections, allocations, waterfalls, iterative solvers (IRR, Newton-Raphson), and simulations |
| Constants and magic numbers | `0.05`, `360`, `365`, `12`, `100`, thresholds, caps, floors, and grace periods, including ones in config, env defaults, and enums |
| Validation | Schema validators, annotations (`@Min`, `@Pattern`), DB `CHECK` constraints, form validators, guard clauses |
| State machines | Status enums with allowed-transition maps, `canX()` methods, and guards before a status change |
| Ordering and precedence | The order of steps in allocation or waterfall code, priority lists, and sort comparators that decide who or what wins |
| Dates and time | Business-day calendars, cutoffs, time zones, "end of month" handling, and inclusive/exclusive boundaries |
| Queries | `WHERE` clauses that define eligibility, aggregations that define metrics, and stored procedures and views |
| Config and rule files | Rate tables, tier tables, feature flags that change behavior, and rule-engine definitions |
| Tests | Assertions with concrete numbers are **executable specifications**. They often state boundaries and edge cases (for example "day 10 no fee, day 11 fee") more clearly than the code |
| Comments and docs | Claims to verify against the code. A disagreement is an anomaly |

## Rule types

Classify each rule as one of the following types:
- `eligibility/validation`
- `decision/policy`
- `calculation`
- `lifecycle/state`
- `temporal` (deadlines, grace periods, schedules)
- `authorization/entitlement`
- `allocation/ordering`
- `derivation` (a value computed from other data without heavy math)
- `integration constraint`

## Impact rating

Rate each rule:
- **high**: affects money, compliance or regulatory obligations,
  customer-facing decisions (approve/deny, price, eligibility), or data
  integrity.
- **medium**: shapes a workflow or user experience.
- **low**: a cosmetic default or convenience.

## Rule record

```markdown
### R-###-n — <short business name>
- **Type / impact:** <type> / <high|medium|low>
- **Rule (business language):** <one or two sentences a PM would understand.
  E.g., "A late fee is charged when an installment is more than 10 days past
  due.">
- **Conditions:** <exact triggering conditions, including boundary
  inclusivity — "strictly more than 10 calendar days", not "after 10 days">
- **Outcome:** <what the system does>
- **Exceptions:** <cases where the rule doesn't apply, with citations>
- **Parameters:** <constants/config the rule depends on, their values, and
  where they're defined — note if configurable at runtime>
- **Evidence:** `path:line` — [stated|inferred]
- **Also asserted by:** <test or doc citations, if any; note disagreements>
```

## Calculation record

```markdown
### C-###-n — <short business name, e.g., "Monthly installment amount">
- **Purpose (business language):** <what this number means and who uses it>
- **Formula:**
  ```
  payment = P × r / (1 − (1 + r)^(−n))
  ```
- **Variables:**
  | Symbol | Meaning | Unit / type | Source (param, field, config) |
  |---|---|---|---|
  | P | principal at origination | currency, Decimal | `loan.principal` |
  | r | periodic rate = APR / 12 | rate per month, Decimal | derived |
  | n | number of monthly installments | count | `loan.term_months` |
- **Constants:** <every literal with its meaning — 12 = months per year>
- **Numeric handling:** <type (float/decimal/integer cents), precision,
  rounding mode and **where** rounding happens (each step vs. final),
  truncation, integer division, overflow/underflow guards>
- **Conventions:** <day count (30/360, actual/365, actual/actual), compounding
  frequency, nominal vs. effective rate, sign conventions, currency
  conversion timing, business-day adjustment — whichever apply>
- **Edge cases:** <zero rate, zero/negative inputs, final-period residuals,
  leap years, month-end dates, empty collections — and what the code does for
  each (including "unhandled")>
- **Worked example:** <concrete inputs → step-by-step → output, computed by
  following the code. E.g., P = 10,000.00, APR = 6%, n = 36 → r = 0.005 →
  payment = 304.22 (rounded half-even to cents)>
- **Evidence:** `path:start-end` — [stated|inferred]
- **Used by:** <callers/consumers you can see>
- **Also asserted by:** <tests with concrete numbers, if any>
```

### Formula notation

- Write formulas in a fenced code block in plain notation (`×`, `/`, `^`,
  `Σ`, `min()`, `max()`). This renders on every agent and in every Markdown
  viewer.
- For iterative or piecewise logic, write numbered steps or a small
  pseudocode block that follows the code's control flow, not a paraphrase.
- Keep the code's order of operations. If the code rounds an intermediate
  value, the formula shows that rounding at that step.

### Numeric subtleties checklist

Check each item for every calculation. They are where two implementations of
"the same" formula silently disagree:

- [ ] Floating point vs. decimal vs. integer minor units (cents)
- [ ] Rounding mode (half-up, half-even/banker's, floor, ceiling, truncate)
      and scale
- [ ] Rounding at each step vs. once at the end
- [ ] Day-count convention and how the day difference is computed
- [ ] Compounding frequency and nominal vs. effective rate
- [ ] Rate expressed as a percent (5) or a fraction (0.05)
- [ ] Inclusive vs. exclusive boundaries (`>` vs. `>=`, `<` vs. `<=`)
- [ ] Caps, floors, minimums, and the order they apply in (cap then floor, or floor then cap)
- [ ] Residual handling (last installment absorbs rounding, pennies
      allocated to the first line, etc.)
- [ ] Time zone and cutoff for "today" and "due date"
- [ ] Currency and unit conversion, and when it happens
- [ ] Integer division or truncation in languages where `/` on integers
      truncates

## Duplicates and conflicts (orchestrator, Phase 3)

After all cards are in, group calculations and rules by **business concept**
(for example "accrued interest" or "late fee eligibility"), not by name. For
each concept with more than one implementation, compare them on the formula,
constants, numeric handling, conventions, and boundaries. Record:

```markdown
### X-n — <concept> is computed differently in <k> places
- **Implementations:** C-004-2 (`path:line`), C-011-1 (`path:line`)
- **Differences:** <e.g., 30/360 vs. actual/365; half-even vs. half-up>
- **Business consequence:** <e.g., the portfolio report's accrued interest
  will not match payoff quotes; divergence grows with balance and period length>
- **Which one is used where:** <customer-facing vs. internal reporting>
- **Question for SMEs:** <which one is intended?>
```

Conflicts are high-value findings. Surface them prominently in the Business
Logic Catalog and in the final summary to the user.
