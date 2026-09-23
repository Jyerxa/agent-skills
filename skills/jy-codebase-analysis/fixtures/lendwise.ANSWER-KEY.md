# Lendwise Fixture: Answer Key (for grading skill runs)

**Do NOT feed this file to the skill.** It documents what was deliberately
planted in `fixtures/lendwise/` so a human can evaluate a
`/jy-codebase-analysis` run. A good run doesn't need to match this word for
word. It needs to surface every planted item with correct evidence, and it
must not fall for the traps.

**How to run:** copy `fixtures/lendwise/` somewhere outside this repo (so the
answer key isn't discoverable), `git init` and commit it, then invoke the
skill there. The repo is small enough for one work unit. To exercise the
fan-out and the cross-unit consolidation phase, tell the orchestrator to
partition by layer (for example: domain; application + api + app; infrastructure +
reporting + tests). The headline conflict (X-1) spans `domain/` and
`reporting/`, so it is only caught if Phase 3 does its job.

## Business overview: expected gist

Consumer installment-loan servicing: originate fixed-rate amortizing loans
($1k–$50k, 6–84 months, APR up to 36%), generate monthly schedules, post
payments, charge late fees, flag delinquency and hand it to an external
collections partner, quote payoffs, and produce a month-end portfolio report
for finance.

Actors:
- borrowers or channels calling the HTTP API
- the operations nightly job (`flask assess-late-fees`)
- finance (portfolio report CLI)
- the collections partner (outbound protobuf/HTTP)
- borrowers receiving late-fee emails

## Planted calculations (all must appear in the catalog)

| # | Calculation | Key details a good run captures |
|---|---|---|
| C1 | Monthly installment (`amortization.monthly_payment`) | `P × r × (1+r)^n / ((1+r)^n − 1)`, `r = APR/12`; rounded half-even to cents; worked example **10,000 @ 6% × 36 → 304.22** |
| C2 | Amortization schedule (`build_schedule`) | Period interest = `round_half_even(balance × APR/12)`, which is **monthly, not day-count based**. The **last installment absorbs rounding** (304.18 in the example, interest 1.51). Due dates are `first_due + (k−1)` months, **clamped to month-end**, and the first due date is origination + 1 month |
| C3 | Accrued interest (`interest.accrued_interest`) | Simple, non-compounding: `balance × APR × year_fraction`; rounded once, half-even; zero when end ≤ start; the convention comes from `LENDWISE_DAY_COUNT` (default **30/360**) |
| C4 | 30/360 year fraction (`Thirty360`) | `d1 = min(d1, 30)`; `d2 = 30` only if `d2 = 31` and `d1 = 30`; `days = 360Δy + 30Δm + (d2 − d1)`; `/360`. **Simplified US 30/360: no February month-end adjustment**, so Jan 31 → Mar 1 counts as 31 days |
| C5 | Late fee (`LateFeePolicy.fee_for`) | `min(max(round(5% × installment), $15), $100)`: **floor applied, then cap**. Example: 304.22 → 15.21. The rate, floor, and cap are **hard-coded** in `fees.py`, not in config |
| C6 | Payment allocation waterfall (`allocate_payment`) | Order: outstanding fees → accrued interest → principal → leftover returned as unapplied (refund). No prepayment penalty |
| C7 | Payoff quote (`GetPayoffQuote`) | `balance + accrued_interest(30/360, to good-through date) + fees_outstanding`; good-through defaults to today (API) |
| C8 | Portfolio accrued interest (`reporting._accrued`) | `balance × APR × actual_days / 365`, **ROUND_HALF_UP**, computed on raw `Decimal` without the `Money` type |
| C9 | Weighted-average APR (report) | `Σ(balance × APR) / Σ balance`, quantized to 4 dp; 0 when the portfolio is empty |

## Planted rules

| # | Rule | Precision a good run captures |
|---|---|---|
| R1 | Origination APR limit | `0 < APR ≤ 0.36`; `MAX_APR` lives in config, but the error message hard-codes "36%" |
| R2 | Term limit | 6 ≤ term ≤ 84 months, **inclusive** (config) |
| R3 | Principal limit | $1,000 ≤ principal ≤ $50,000, inclusive, **hard-coded in the use case** (not in config) |
| R4 | Late-fee trigger | **Strictly more than** `LATE_FEE_GRACE_DAYS` (default 10, env-overridable) days after the due date. Day 10: no fee. Day 11: fee (the test states it) |
| R5 | Late-fee exemptions | Never charged on HARDSHIP loans, on paid installments, or twice for the same installment |
| R6 | Delinquency | An ACTIVE loan with **days past due > 30** (DPD is measured from the *oldest unpaid installment*) becomes DELINQUENT, and a LoanBecameDelinquent event goes to collections |
| R7 | Cure | A DELINQUENT loan returns to ACTIVE when a payment leaves no overdue installment |
| R8 | Installment satisfaction | An installment counts as paid only when a **single payment ≥ that installment's amount**. Partial payments never mark an installment paid, and one payment marks **at most one** installment |
| R9 | Payment eligibility | Payments are accepted only on ACTIVE, DELINQUENT, and HARDSHIP loans |
| R10 | Lifecycle | Transition table in `loan.py`. Notably, **HARDSHIP → PAID_OFF is not allowed**, and PAID_OFF and CHARGED_OFF are terminal |
| R11 | Portfolio report scope | Includes ACTIVE loans (DELINQUENT opt-in via the builder; the CLI opts in). **HARDSHIP loans are never included**, and there is no builder option for them |

## Planted conflicts (must appear in the catalog's conflicts section)

| # | Conflict | Evidence |
|---|---|---|
| X-1 | **Accrued interest is computed two ways.** Payoff and payments use 30/360 with half-even rounding. The portfolio report uses actual/365 with half-up rounding. The two disagree, for example on 10,000 @ 6%: Jan 31 → Mar 1 gives **51.67 vs 47.67**, and Jan 15 → Feb 15 gives **50.00 vs 50.96**. Finance's reported accrued interest won't reconcile with payoff quotes. The report's approach is also a Strategy bypass | `domain/interest.py`, `domain/daycount.py`, `reporting/portfolio_report.py:_accrued` |
| X-2 | README says interest accrues on **actual/365**, but the code default is **30/360** | `README.md` vs `config.py` |
| X-3 | README says the late fee is 5% of the missed payment, omitting the **$15 floor and $100 cap** | `README.md` vs `domain/fees.py` |

Acceptable extra: noting that schedule interest (C2, monthly rate) and
accrued interest (C3, day count) use different conventions. This is standard
for amortizing loans, so it should be flagged as a convention note, not as a
bug.

## Planted anomalies (suspected bugs)

| # | Anomaly | Impact |
|---|---|---|
| A1 | `PostPayment` sets `interest_paid_through = paid_on` **even when interest was only partially paid**, so the unpaid accrued interest is silently forgiven | Revenue leakage (high) |
| A2 | Paying off a **HARDSHIP** loan in full raises `InvalidTransition` (HARDSHIP → PAID_OFF is disallowed) after allocation but before save, so **hardship borrowers cannot pay off** | Customer-facing failure (high) |
| A3 | The zero-APR branch in `monthly_payment` is unreachable, because origination rejects APR ≤ 0 | Dead code (low) |
| A4 | `CollectionsGateway` makes a synchronous HTTP call (5 s timeout, no retry) inside the in-process bus. A failure during `AssessLateFees` raises after the status transition but **before `save`**, so that loan's fees and status are lost **and the job aborts for all remaining loans** | Reliability (high) |
| A5 | HARDSHIP loans are excluded from the portfolio report, which understates the outstanding book (R11) | Reporting accuracy (medium) |
| A6 | `PAYMENT_GATEWAY_API_KEY` is defined but never used | Dead config (low) |
| A7 | Each repository call opens its own connection, and there is no unit of work, so multi-loan jobs are non-atomic | Consistency (medium) |

## Expected patterns (engineering report)

| Pattern | Form / conformance | Evidence |
|---|---|---|
| Layered with ports & adapters (hexagonal-leaning) | partial | Ports (`LoanRepository` ABC, `EventPublisher` Protocol) live in `application/ports.py`, with adapters in `infrastructure/`. **Violations:** `api/routes.py` imports `domain.fees.LateFeePolicy` directly (the late-fee preview bypasses use cases); `reporting/` bypasses the application layer and reimplements domain math; `domain/fees.py` imports `lendwise.config` |
| Use Case / Interactor + command objects | classic, consistent in the API | `CreateLoan`, `PostPayment`, `AssessLateFees`, `GetPayoffQuote`, each with `execute()`, plus `*Command` dataclasses |
| Repository + Data Mapper functions | classic | `LoanRepository` → `SqlLoanRepository`; `_to_row`/`_from_row`; the schedule is **derived on load**, not stored |
| Strategy + registry | classic, **partial** | `DayCountConvention` → `Thirty360`, `Actual365`; `get_convention` registry; context `accrued_interest`. Bypassed by `reporting._accrued` (X-1) |
| Observer (in-process event bus) + domain events | idiomatic | `InProcessEventBus.subscribe/publish`; frozen event dataclasses; handlers `EmailNotifier`, `CollectionsGateway` |
| Value Object | classic | `Money`: frozen, value equality, half-even quantization in `of()`. Reporting uses raw `Decimal` instead (convention split) |
| Entity / rich domain model | classic | `Loan` has identity and behavior (`activate`, `transition_to`, `days_past_due`) |
| State machine via transition table | idiomatic (not GoF State) | `_ALLOWED_TRANSITIONS` + `transition_to` guard |
| Fluent Builder | classic | `PortfolioReportBuilder.as_of().including_delinquent().with_min_balance().build()` |
| Gateway / Adapter to an external system | classic | `CollectionsGateway` (domain event → protobuf over HTTP), `EmailNotifier` (SMTP) |
| Composition root with manual constructor injection | idiomatic DI | `app.build_container` |

## Traps (must land in "Considered, not found", not in the pattern inventory)

| Trap | Why it isn't the pattern |
|---|---|
| `LateFeePolicyFactory` → Factory Method | A static method that always constructs `LateFeePolicy`, with no variation. It is name-only, and `routes.py` bypasses it anyway |
| Loan status → GoF State | An enum plus a transition table; there are no state objects that own behavior |
| `*Command` dataclasses → GoF Command | Request DTOs with no `execute`/`undo`. The handlers are use cases |
| Payment waterfall → Chain of Responsibility | A fixed sequence in one function with no handler objects or pass/stop semantics |
| `@bp.post` / `@app.cli.command` → Decorator | Framework route and command registration, not a same-interface wrapper |
| `_CONVENTIONS` module instances → Singleton | Module-level registry instances; nothing enforces a single instance |
| `build_schedule` → Builder | Only a function name |

## Coverage and hygiene expectations

- `lendwise/_generated/loan_pb2.py` is **skipped as generated** (the header
  says `DO NOT EDIT`), and `proto/loan.proto` is **in scope** as its source spec.
- Empty `__init__.py` files are either analyzed as light or skipped with a
  logged reason. Either is fine if it's logged.
- **Secrets:** `config.py` holds a literal `PAYMENT_GATEWAY_API_KEY` and a
  default `DATABASE_URL` containing a password. The outputs must name the
  **locations only**. Any appearance of either value in the outputs is a
  failure.
- Conventions a good run reports:
  - `Decimal`/`Money` for money in the domain (raw `Decimal` in reporting)
  - frozen dataclasses for values, events, and commands
  - ABCs/Protocols for ports
  - exceptions for validation, mapped to HTTP 422
  - **no logging anywhere**
  - server-local `date.today()` (no timezone handling)
  - ruff with line length 100
  - pytest function-style tests covering **domain only**: no tests for use
    cases, the API, the repository, or reporting

## Grading checklist

- [ ] All 9 calculations present, with formula, variables, rounding, and a worked example; C1 = 304.22 and C5 = 15.21 are reproduced.
- [ ] X-1 is found and quantified, and is in the conflicts section **and** in the headline findings.
- [ ] X-2 and X-3 (docs vs code) are found.
- [ ] R4 boundary stated as "strictly more than 10 days" (not "after 10 days").
- [ ] R8 and R10 (the HARDSHIP → PAID_OFF gap) are captured as rules.
- [ ] A1, A2, and A4 are reported as suspected defects with evidence.
- [ ] Every trap lands in "Considered, not found" with a reason.
- [ ] Strategy is marked **partial** conformance because of the reporting bypass.
- [ ] Layer violations cite `api/routes.py` and `reporting/`.
- [ ] The generated file is skipped and its `.proto` is analyzed; the coverage numbers reconcile.
- [ ] No secret values appear in any output.
- [ ] The business artifacts use no class or function names outside the evidence references.
- [ ] Every Mermaid diagram renders.
