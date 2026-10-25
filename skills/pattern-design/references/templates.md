# Output templates

Each run generates two artifacts. Fill every `<placeholder>`. Delete a section
only when it has no content, and say so. Writing "None." is better than
silence. Use the system's domain vocabulary throughout. Name participants
`PaymentGateway` and `ExportRenderer`, never `ConcreteStrategyA`.

---

## Template 1: pattern design document

Default path: `docs/design/pattern-design.md`

```markdown
# Pattern design: <System Name>

**Source spec**: <path or reference, with version/date if available>
**Target stack**: <language / framework>
**Catalogs consulted**: <for example, GoF>
**Date**: <date>

## 1. Forces inventory

| ID | Force | Spec citation | Volatility |
|----|-------|---------------|------------|
| F1 | <one-line pressure on the design> | <quoted line or §ref> | stated / implied / speculative |

## 2. Pattern map

| Force | Decision | Location | Participants |
|-------|----------|----------|--------------|
| F1 | <Pattern name, or "no pattern, plain <solution>"> | <module/dir path> | <domain-named interfaces & types> |

## 3. Pattern applications

### <Pattern Name> for F<n>: <force one-liner>

- **Why this pattern**: <one paragraph: the force, why the plain solution
  falls short, why this is the simplest sufficient pattern>
- **Participants**: <each role, its domain name, and its file path>
- **Collaborations**: <how it connects to neighboring patterns/components>
- **Boundary it protects**: <what change this contains, for example "adding a
  provider touches only src/gateways/">

<!-- repeat per application -->

## 4. Key flows

### <Flow name, for example "Order placement">

<Short numbered sequence showing how the selected patterns interact in a
real flow from the spec.>

## 5. Rejection log

| Candidate | Considered for | Rejected because |
|-----------|----------------|------------------|
| <Pattern> | F<n> | <one line, for example "two variants, no growth signal; plain if"> |
| <Pattern> | F<n> (speculative) | <YAGNI: variation not stated in spec> |

## 6. Open questions

<Each ambiguity in the spec that forced an assumption, with the assumption
made. "None." if none.>
```

---

## Template 2: agent instructions (pattern rules)

Default path: `docs/design/pattern-rules.md`, which the target repo's
`CLAUDE.md` references.

Each rule is imperative, scoped to paths, checkable from a diff alone, and
traceable, citing its design-doc section. Keep rationale in the design doc.
This file says what to do, not why.

```markdown
# Pattern rules: <System Name>

Agent instructions for implementing and preserving the pattern design in
[pattern-design.md](./pattern-design.md). Follow these when writing or
reviewing code in this repo. Each rule cites the design decision it
enforces. Read that decision before deviating, and if a rule must change,
update the design doc in the same PR.

## Architecture rules

### R1: <short rule name> (per design §3.<n>)

- **Rule**: <imperative, path-scoped. "Every export format implements
  `ExportRenderer` in `src/export/renderers/` and has an entry in
  `src/export/registry.ts`.">
- **When adding a new <thing>**: <numbered recipe an agent can follow:
  files to create, where to register, what to name it, what tests to add>
- **Forbidden**: <the shortcut that violates the pattern, for example "a switch on
  format type anywhere outside the registry">

<!-- repeat per rule; one rule per pattern application, more if a pattern
     implies several checkable constraints -->

## Deliberately NOT used

<The rejection-log entries that agents are most likely to "helpfully"
reintroduce.>

- Do not introduce <pattern> for <area>: <one-line reason>. If the spec
  changes to warrant it, update pattern-design.md first.

## Pre-commit review checklist

Before committing changes in this repo, verify:

- [ ] <checkable item per rule, for example "No `new StripeClient` outside
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
are binding when writing or reviewing code. Read them before making
structural changes.
```

If the repo already uses `@import` syntax in `CLAUDE.md`, use
`@docs/design/pattern-rules.md` instead of the prose pointer.
