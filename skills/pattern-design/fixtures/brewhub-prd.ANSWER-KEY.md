# BrewHub PRD — Answer Key (for grading skill runs)

**Do NOT feed this file to the skill.** It documents what was deliberately
planted in `brewhub-prd.md` so a human can evaluate a `/pattern-design` run.
A good run doesn't need to match this 1:1 — idiomatic substitutions (e.g.,
discriminated union instead of State classes) are fine *if the run says so
and why* — but every planted force should show up in the forces inventory,
and every trap should land in the rejection log, not the pattern map.

## Planted pattern forces

| Spec | Force | Expected direction |
|---|---|---|
| FR-1–FR-3 | Unbounded part-whole menu hierarchy, uniform ops on leaf/group | **Composite** |
| FR-3, FR-6 | Multiple growing derivations over a stable structure (render, allergen sheet, price, nutrition, ticket, future margin) | **Visitor** — or exhaustive match over a node union (idiom); either is a pass if justified |
| FR-4–FR-5 | Stacking modifiers, each adjusting price/nutrition; canonical ordering | **Decorator** (the textbook case) — note FR-5's ordering constraint must be addressed (sort at ticket-render, or ordered assembly) |
| FR-8 | Favorite = template copied into an editable fresh cart | **Prototype** (clone-with-independence). Plain deep-copy/spread is an acceptable idiom answer if named |
| FR-10, FR-13 | ~1 new payment method/year; checkout method-agnostic | **Strategy** + registry |
| FR-11 | Frozen SOAP legacy (SVS), types must not leak | **Adapter** with a hard module boundary |
| FR-12 | Tender-splitting policy across methods | Orchestration in one place (plain policy object/function); a run that buries this inside a strategy should be dinged |
| FR-14–FR-16 | Rich lifecycle, per-state behavior AND guarded transitions, atomicity | **State** (or explicit state machine — must centralize transition validation; FR-16/double-refund is the tell) |
| FR-17 | Marketing-authored expression language, no eng review | **Interpreter** (small grammar: boolean ops, comparisons, aggregates, calendar predicates) |
| FR-18 | Priority-ordered evaluation, exclusive short-circuit, stackable accumulate | **Chain of Responsibility** (or ordered pipeline — same intent, must be named) |
| FR-20–FR-22 | Events × channels vary independently, both axes have committed growth | **Bridge** (notification kind abstraction over channel implementor). Both axes are *stated*, so this is a legitimate Bridge, rare in the wild |
| FR-23 | Order pipeline must not know listeners; multiple reactors | **Observer** (platform event emitter idiom acceptable) |
| FR-25 | Three incompatible POS protocols, list historically grows | **Adapter** per vendor behind one port interface |
| FR-26 | One "send order to store" op over vendor link + inventory + ticketing | **Facade** |
| FR-27 | Retry/timeout/circuit-break/logging uniform across vendors, not per-vendor | **Decorator** (or Proxy) wrapping the POS port — the "must not be reimplemented per vendor" line is the signal |
| NFR-2 | Cache transparency for menu reads | **Proxy** (caching) — decorator also acceptable with rationale |
| FR-28–FR-30 | Reified actions: audit, queue/schedule, per-action undo, monthly new types | **Command** (with undo); FR-30 ties scheduler and support tooling to the same abstraction |

Rough expected count: ~12–14 pattern applications from ~18–20 forces.
A run producing 20+ applications failed the budget check; under ~8 probably
missed stated forces.

## Planted traps (must land in the rejection log / "no pattern")

| Spec | Trap | Expected outcome |
|---|---|---|
| §2 non-goals | Canada expansion "eventually, no committed timeline" | **Speculative — YAGNI.** No i18n abstraction layers. Logged as rejected |
| FR-7 | Cross-device cart persistence | Plain serialization/storage. A run proposing **Memento** machinery here is over-engineering (the state isn't encapsulation-protected; it's a stored row) |
| FR-24 | Tier thresholds/earn rates "configuration, not logic" | **No pattern** — data table. Strategy here is a miss |
| NFR-4 | Regional tax/tip/rounding tables | **No pattern** — versioned lookup data. (Rounding *rules* could tempt Strategy; spec says table-maintained, so reject) |
| NFR-5 | "Global AppConfig singleton everyone can import" — explicitly posed | **Reject Singleton**; instantiate at composition root, inject. The PRD literally asks the design phase to settle it — the run must answer |
| FR-19 | Four fixed promotion effects | Borderline: a simple discriminated union / enum-dispatch is fine; full Strategy acceptable only if the run notes effects are expected to grow (spec does not say so). Best answers flag this as a judgment call |

## Grading checklist

- [ ] Every table-1 force appears in the forces inventory with a citation.
- [ ] Every trap lands as "no pattern"/rejected with a reason (not silently omitted).
- [ ] Decorator (drinks) addresses FR-5 ordering; State addresses FR-16 atomic guards.
- [ ] SVS and POS adapters come with an import-boundary rule in the agent instructions ("no SVS/vendor types outside <dir>").
- [ ] Bridge is justified by *both* axes being stated (FR-20 growth + FR-21 SMS committed) — not by vibes.
- [ ] Agent instructions include forbidden moves (e.g., no switch on payment method outside registry; no status checks outside the state module) and a checklist.
- [ ] Participants use BrewHub vocabulary (`PaymentMethod`, `PosPort`, `OrderState`…), not pattern jargon.
