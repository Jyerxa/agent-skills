---
name: pattern-design
description: 'Turn a system design spec or PRD into a disciplined pattern-based design — which patterns to apply, where, why, and the repo-ready agent instructions that enforce the design. Use when the user wants to design a system with design patterns (GoF or other catalogs), asks "which patterns should I use for this spec", or wants pattern-enforcement rules generated for coding agents. Input: a spec/PRD file path or pasted text.'
---

# Pattern Design

Take a design specification or PRD as input and produce two artifacts:

1. **Pattern Design Document** — which patterns apply, where, and why, with full traceability back to the spec.
2. **Agent Instructions** — a repo-ready rules file that makes coding agents (and humans) implement and preserve the pattern design, wired into the target repo's `CLAUDE.md`.

The value of this skill is **discipline**, not pattern knowledge. An undisciplined
pass over a spec produces pattern soup — a Factory for every `new`, a Singleton for
every service. Every rule below exists to prevent that.

## Non-negotiable discipline rules

- **Forces first.** Never select a pattern from a keyword in the spec. Extract
  *forces* (Phase 2) and select patterns only to resolve a named force.
- **"No pattern" is the null hypothesis.** Plain functions, modules, and
  composition are the default. A pattern must earn its indirection by beating
  the plain solution for a specific force. When in doubt, don't.
- **YAGNI gate.** Design only for variation the spec states or strongly implies
  (e.g., a roadmap item, "pluggable", "supports multiple"). Speculative
  flexibility is rejected — and logged as rejected, with the reason.
- **Language idiom check.** Patterns are compensations for missing language
  features as often as they are designs. In a language with first-class
  functions, Strategy is usually a function parameter; with modules/DI
  containers, Singleton is usually just a module-level instance. Prefer the
  idiom; name the pattern intent in the design doc anyway so the reasoning is
  visible.
- **Pattern budget.** If selected patterns exceed roughly one per two or three
  forces, you are decorating, not designing. Prune before writing outputs.
- **Every selection records its rejected alternatives** with a one-line reason
  each. The rejection log is as important as the selections.

## Workflow

### Phase 0 — Intake

1. Locate the input spec: a file path given as an argument, pasted text, or a
   spec-like file in the repo (`*SPEC*.md`, `*PRD*.md`, `docs/`). If nothing is
   found, ask the user for it — do not invent requirements.
2. Note the target language/stack and existing architecture if the spec or repo
   reveals them. These drive the idiom check and where participants live.
3. Confirm the output repo (usually the current one) and output paths
   (defaults in Phase 5).

### Phase 1 — Load pattern catalogs

Enumerate every file in `references/catalogs/` (relative to this skill) and
read each one. Each catalog follows the shared schema in
`references/catalog-schema.md` and starts with a **Signal Index** mapping force
signals to candidate patterns. Catalogs are the extension point: new pattern
families (enterprise, distributed, concurrency, DDD) are added as new files
and require no change to this workflow.

### Phase 2 — Forces inventory

Read the spec end to end. Extract **forces**, not features. A force is a
pressure on the design's shape. Categories to scan for:

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

For each force record: an ID (`F1`, `F2`, …), a one-line statement, the spec
citation (quote or section ref), and a volatility rating (how likely this axis
is to actually change: **stated** / **implied** / **speculative**). Speculative
forces do not justify patterns — they exist so the rejection log can say why.

### Phase 3 — Pattern selection

For each non-speculative force:

1. Collect candidates from each catalog's Signal Index.
2. Test the null hypothesis: write one line on what the plain solution looks
   like. If it holds up at the spec's stated scale, select no pattern.
3. Otherwise pick the simplest candidate that resolves the force. Check the
   catalog entry's **Do not use when** list against the spec.
4. Apply the language idiom check.
5. Record the decision: force ID → pattern (or "none") → one-paragraph
   rationale → rejected candidates with reasons.

Then run the **pattern budget** check across all selections and prune.

### Phase 4 — Design synthesis

Turn selections into a concrete design in the target system's vocabulary:

- **Pattern map**: table of force → pattern → where it lives (module/file
  path) → participants (interface and class/function names in the system's
  domain language, not the pattern's — `PaymentGateway`, not `IStrategy`).
- **Per-application detail**: for each pattern, the participants, how it
  collaborates with neighboring patterns, and the boundary it protects.
- **Key-flow sketch**: for the one or two most important flows in the spec,
  a short sequence description showing the patterns working together.
- **Soup check**: reread the whole design as if reviewing a stranger's PR.
  Remove anything you can't defend in one sentence.

### Phase 5 — Generate outputs

Use the templates in `references/templates.md`. Defaults (confirm or adjust
per the user's repo conventions):

- Design doc → `docs/design/pattern-design.md`
- Agent instructions → `docs/design/pattern-rules.md`
- Wire-up: add to the target repo's `CLAUDE.md` a short section pointing at
  the rules file (or an `@docs/design/pattern-rules.md` import if the repo
  already uses imports). Create `CLAUDE.md` if absent.

**Quality bar for agent instructions** — each rule must be:

- **Imperative and scoped**: "When adding a new export format, implement
  `ExportRenderer` in `src/export/renderers/` and register it in
  `rendererRegistry`. Do not branch on format type anywhere else."
- **Checkable**: a reviewer (or agent) can verify compliance from the diff
  alone.
- **Traceable**: each rule cites the pattern application in the design doc
  that motivates it.
- Include a **Forbidden moves** list (the shortcuts that erode each pattern —
  e.g., type-switches beside a Strategy, `new` calls bypassing a Factory) and
  a **review checklist** agents run before committing.

### Phase 6 — Self-review

Before presenting results, verify:

- [ ] Every selected pattern cites a stated/implied force; no orphan patterns.
- [ ] Every force has a decision, even if the decision is "no pattern".
- [ ] Rejection log covers every considered-but-unused candidate and every
      speculative force.
- [ ] Participant names use the system's domain vocabulary.
- [ ] Every agent rule is checkable from a diff and traceable to the design doc.
- [ ] Pattern count passes the budget check.

Present a summary to the user: pattern map, the two or three most consequential
decisions with their rationale, and where the artifacts were written.

## Extending with new catalogs

Add a file to `references/catalogs/` following `references/catalog-schema.md`
(Signal Index at the top, then one schema-conformant entry per pattern).
Candidates for future catalogs: enterprise application patterns (PoEAA),
distributed-systems patterns, concurrency patterns, DDD tactical patterns.
No workflow changes are needed — Phase 1 picks up every catalog file.
