# Output Templates

Two artifacts are generated per run. Fill every `<placeholder>`; delete
sections only when genuinely empty (and say so — "None." beats silence).
Keep the system's domain vocabulary throughout: participants are named
`PaymentGateway` and `ExportRenderer`, never `ConcreteStrategyA`.

---

## Template 1 — Pattern Design Document

Default path: `docs/design/pattern-design.md`

```markdown
# Pattern Design: <System Name>

**Source spec**: <path or reference, with version/date if available>
**Target stack**: <language / framework>
**Catalogs consulted**: <e.g., GoF>
**Date**: <date>

## 1. Forces Inventory

| ID | Force | Spec citation | Volatility |
|----|-------|---------------|------------|
| F1 | <one-line pressure on the design> | <quoted line or §ref> | stated / implied / speculative |

## 2. Pattern Map

| Force | Decision | Location | Participants |
|-------|----------|----------|--------------|
| F1 | <Pattern name, or "no pattern — plain <solution>"> | <module/dir path> | <domain-named interfaces & types> |

## 3. Pattern Applications

### <Pattern Name> for F<n>: <force one-liner>

- **Why this pattern**: <one paragraph: the force, why the plain solution
  falls short, why this is the simplest sufficient pattern>
- **Participants**: <role → domain name → file path>
- **Collaborations**: <how it connects to neighboring patterns/components>
- **Boundary it protects**: <what change this contains, e.g. "adding a
  provider touches only src/gateways/">

<!-- repeat per application -->

## 4. Key Flows

### <Flow name, e.g. "Order placement">

<Short numbered sequence showing the selected patterns cooperating on a
real flow from the spec.>

## 5. Rejection Log

| Candidate | Considered for | Rejected because |
|-----------|----------------|------------------|
| <Pattern> | F<n> | <one line — e.g. "two variants, no growth signal; plain if"> |
| <Pattern> | F<n> (speculative) | <YAGNI: variation not stated in spec> |

## 6. Open Questions

<Ambiguities in the spec that forced an assumption; each with the
assumption made. "None." if none.>
```

---

## Template 2 — Agent Instructions (pattern rules)

Default path: `docs/design/pattern-rules.md`, referenced from the target
repo's `CLAUDE.md`.

Rule quality bar: imperative, scoped to paths, checkable from a diff alone,
and traceable (each rule cites its design-doc section). No rationale essays
here — rationale lives in the design doc; this file is operational.

```markdown
# Pattern Rules: <System Name>

Agent instructions for implementing and preserving the pattern design in
[pattern-design.md](./pattern-design.md). Follow these when writing or
reviewing code in this repo. Each rule cites the design decision it
enforces — read it before deviating, and if a rule must change, update the
design doc in the same PR.

## Architecture rules

### R1 — <short rule name> (per design §3.<n>)

- **Rule**: <imperative, path-scoped. "Every export format implements
  `ExportRenderer` in `src/export/renderers/` and is registered in
  `src/export/registry.ts`.">
- **When adding a new <thing>**: <numbered recipe an agent can follow —
  files to create, where to register, what to name it, what tests to add>
- **Forbidden**: <the shortcut that erodes the pattern — "a switch on
  format type anywhere outside the registry">

<!-- repeat per rule; one rule per pattern application, more if a pattern
     implies several checkable constraints -->

## Deliberately NOT used

<From the rejection log — the entries agents are most likely to
"helpfully" reintroduce.>

- Do not introduce <pattern> for <area>: <one-line reason>. If the spec
  changes to warrant it, update pattern-design.md first.

## Pre-commit review checklist

Before committing changes in this repo, verify:

- [ ] <checkable item per rule, e.g. "No `new StripeClient` outside
      src/gateways/">
- [ ] <...>
- [ ] Any change that violates a rule above updates
      pattern-design.md in the same PR with the new decision.
```

### Wiring into CLAUDE.md

Append to the target repo's `CLAUDE.md` (create it if absent):

```markdown
## Pattern architecture

This codebase follows a pattern design documented in
`docs/design/pattern-design.md`. The rules in `docs/design/pattern-rules.md`
are binding when writing or reviewing code — read them before making
structural changes.
```

If the repo already uses `@import` syntax in `CLAUDE.md`, use
`@docs/design/pattern-rules.md` instead of the prose pointer.
