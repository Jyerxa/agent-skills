---
name: pattern-design
description: 'Turn a system design spec or PRD into a disciplined pattern-based design: which patterns to apply, where, and why, plus repo-ready agent instructions that enforce the design. Use when the user wants to design a system with design patterns (GoF or other catalogs), asks "which patterns should I use for this spec", or wants pattern-enforcement rules generated for coding agents. Input: a spec/PRD file path or pasted text.'
metadata:
  version: "0.0.1"
  lifecycle: "in-progress"
---

# Pattern design

Take a design specification or PRD as input and produce two artifacts:

1. **Pattern design document.** Which patterns apply, where, and why, with each decision traced back to the spec.
2. **Agent instructions.** A repo-ready rules file, wired into the target repo's `CLAUDE.md`, that makes coding agents and humans implement and preserve the pattern design.

This skill's value is discipline, not pattern knowledge. An undisciplined
pass over a spec produces pattern soup: a Factory for every `new`, a Singleton
for every service. Every rule below exists to prevent that.

## Non-negotiable discipline rules

- **Forces first.** Never select a pattern from a keyword in the spec. Extract
  *forces* (Phase 2) and select patterns only to resolve a named force.
- **"No pattern" is the null hypothesis.** Plain functions, modules, and
  composition are the default. A pattern must beat the plain solution for a
  specific force to justify its indirection. If you are unsure, use no pattern.
- **YAGNI gate.** Design only for variation the spec states or strongly implies,
  such as a roadmap item, "pluggable", or "supports multiple". Reject
  speculative flexibility, and log each rejection with its reason.
- **Language idiom check.** Patterns compensate for missing language features
  as often as they express a design. In a language with first-class
  functions, Strategy is usually a function parameter. With modules or DI
  containers, Singleton is usually a module-level instance. Prefer the idiom,
  and still name the pattern's intent in the design doc so the reasoning is
  visible.
- **Pattern budget.** If you select more than roughly one pattern per two or
  three forces, you are adding patterns for their own sake. Prune before
  writing outputs.
- **Log rejections.** Every selection records its rejected alternatives, each
  with a one-line reason. The rejection log matters as much as the selections.

## Workflow

### Phase 0: Intake

1. Locate the input spec: a file path given as an argument, pasted text, or a
   spec-like file in the repo (`*SPEC*.md`, `*PRD*.md`, `docs/`). If you find
   nothing, ask the user for it. Do not invent requirements.
2. Note the target language or stack and the existing architecture if the
   spec or repo reveals them. The idiom check and the placement of
   participants depend on them.
3. Confirm the output repo (usually the current one) and output paths
   (defaults in Phase 5).

### Phase 1: Load pattern catalogs

Enumerate every file in `references/catalogs/` (relative to this skill) and
read each one. Each catalog follows the shared schema in
`references/catalog-schema.md` and starts with a Signal Index that maps force
signals to candidate patterns. To add a pattern family (enterprise,
distributed, concurrency, DDD), add a catalog file. This workflow needs no
change.

### Phase 2: Forces inventory

Read the spec end to end. Extract **forces**, not features. A force is a
requirement or constraint that pushes the design toward a particular shape.
Scan for these categories:

| Category | Signals in a spec |
|---|---|
| Variation | "supports multiple…", "pluggable", "configurable", per-tenant/per-region behavior |
| Multiplicity | families of related objects that must stay consistent |
| Coupling boundary | third-party APIs, legacy systems, modules owned by different teams |
| Construction complexity | many-step setup, optional parts, validation before use |
| State-dependent behavior | "when in X mode…", lifecycle diagrams, status fields that change behavior |
| Cross-cutting behavior | logging, caching, retry, authorization applied across features |
| Interface mismatch | integrating components that don't share a contract |
| History / undo / audit | "undo", "replay", "audit trail", queued or scheduled operations |
| Notification / reaction | "when X happens, Y should…", event-driven requirements |
| Resource constraints | many similar objects, expensive/remote/lazy access |
| Traversal / structure | trees, nested hierarchies, part-whole compositions |

For each force, record an ID (`F1`, `F2`, …), a one-line statement, the spec
citation (a quote or section reference), and a volatility rating for how
likely this axis is to change: **stated**, **implied**, or **speculative**.
Speculative forces do not justify patterns. Record them so the rejection log
can say why.

### Phase 3: Pattern selection

For each non-speculative force:

1. Collect candidates from each catalog's Signal Index.
2. Test the null hypothesis. Write one line describing the plain solution.
   If it works at the spec's stated scale, select no pattern.
3. Otherwise pick the simplest candidate that resolves the force. Check the
   catalog entry's **Do not use when** list against the spec.
4. Apply the language idiom check.
5. Record the decision: the force ID, the pattern (or "none"), a
   one-paragraph rationale, and the rejected candidates with reasons.

Then run the pattern budget check across all selections and prune.

### Phase 4: Design synthesis

Turn selections into a concrete design in the target system's vocabulary:

- **Pattern map.** A table with the force, the pattern, where it lives (module
  or file path), and its participants. Name participants (interfaces,
  classes, functions) in the system's domain language, not the pattern's:
  `PaymentGateway`, not `IStrategy`.
- **Per-application detail.** For each pattern, the participants, how it works
  with neighboring patterns, and the boundary it protects.
- **Key-flow sketch.** For the one or two most important flows in the spec,
  a short sequence showing how the patterns work together.
- **Soup check.** Reread the whole design as if reviewing a stranger's PR.
  Remove anything you can't justify in one sentence.

### Phase 5: Generate outputs

Use the templates in `references/templates.md`. Confirm these defaults, or
adjust them to the user's repo conventions:

- Design doc: `docs/design/pattern-design.md`
- Agent instructions: `docs/design/pattern-rules.md`
- Wire-up: add a short section to the target repo's `CLAUDE.md` that points
  to the rules file, or an `@docs/design/pattern-rules.md` import if the repo
  already uses imports. Create `CLAUDE.md` if it is absent.

Each rule in the agent instructions must be:

- **Imperative and scoped.** For example: "When adding a new export format,
  implement `ExportRenderer` in `src/export/renderers/` and register it in
  `rendererRegistry`. Do not branch on format type anywhere else."
- **Checkable.** A reviewer or agent can verify compliance from the diff
  alone.
- **Traceable.** Each rule cites the pattern application in the design doc
  that motivates it.

Also include a **Forbidden moves** list and a **review checklist** that agents
run before committing. Forbidden moves are the shortcuts that violate each
pattern, such as type switches beside a Strategy or `new` calls that bypass a
Factory.

### Phase 6: Self-review

Before presenting results, verify:

- [ ] Every selected pattern cites a stated or implied force.
- [ ] Every force has a decision, even if the decision is "no pattern".
- [ ] The rejection log covers every candidate considered but not used, and
      every speculative force.
- [ ] Participant names use the system's domain vocabulary.
- [ ] Every agent rule is checkable from a diff and traceable to the design doc.
- [ ] Pattern count passes the budget check.

Present a summary to the user: the pattern map, the two or three most
consequential decisions with their rationale, and where you wrote the
artifacts.

## Extending with new catalogs

To add a catalog, add a file to `references/catalogs/` that follows
`references/catalog-schema.md`, with the Signal Index at the top and then one
schema-conformant entry per pattern. Candidates for future catalogs include
enterprise application patterns (PoEAA), distributed-systems patterns,
concurrency patterns, and DDD tactical patterns. The workflow needs no
changes, because Phase 1 reads every catalog file.
