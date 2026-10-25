---
name: jy-codebase-analysis
description: 'Deep, evidence-backed analysis of an existing codebase that produces four Markdown artifacts: a business overview and a business-logic catalog (for product managers on brownfield projects, with calculations and formulas recorded as business rules), plus an architecture overview with Mermaid diagrams and a layer-by-layer engineering-patterns report (for architects and developers). An orchestrator surveys the repo, then fans out subagents that read every file line by line. Use when the user wants to understand, document, onboard onto, or reverse-engineer what a codebase does and how it is built. Works in Claude Code, Cursor, Codex, and GitHub Copilot, with a sequential fallback when subagents are unavailable.'
metadata:
  version: "0.0.2"
  lifecycle: "in-progress"
---

# JY codebase analysis

Reverse-engineer an existing codebase into four artifacts:

| # | Artifact | Audience | Answers |
|---|---|---|---|
| 1 | Business Overview | Product managers, business stakeholders | What is this system, who uses it, what for, how |
| 2 | Business Logic Catalog | Product managers, analysts, SMEs | Every rule, policy, and calculation the system enforces, in business terms, with the math |
| 3 | Architecture Overview | Architects, developers | Components, layers, data, integrations, and key flows, with diagrams |
| 4 | Engineering Patterns & Standards | Architects, developers | Layer by layer, which patterns and conventions the code actually follows, how consistently, and where it deviates |

This skill runs design in reverse. `system-discovery` turns an idea into a
brief, and `pattern-design` turns a brief into patterns. This skill turns
**code into a brief and patterns**. What matters is **completeness and
evidence**, not polished prose. An undisciplined pass skims a few entry points
and writes a plausible story. Every rule below exists to prevent that.

## Non-negotiable discipline rules

- **Every file is accounted for.** Analyze each tracked file (deep or light),
  or skip it and log the reason. The final coverage report shows this.
- **Calculations are business logic.** How interest accrues, how a discount
  applies, how a score is weighted, and how rounding works are business
  decisions. Capture formulas, constants, units, rounding, and edge cases as
  business rules, and never dismiss them as implementation detail. See
  `references/business-logic-extraction.md`.
- **Cite evidence for every finding.** Cite `path:line` or a line range. Tag
  every finding **stated** (the code or a test says it directly) or
  **inferred** (a reasonable reading that the code does not spell out).
  Inferred findings are allowed. Unlabeled findings are not.
- **Names are not evidence.** `PaymentFactory` does not prove a Factory, and
  a Strategy is often a function parameter with no pattern name anywhere.
  Pattern claims need structural evidence. See
  `references/pattern-recognition.md`.
- **Describe what the code does, not what it should do.** When code, docs,
  comments, and tests disagree, treat the code as the fact and record the
  disagreement as a finding. Report suspected bugs and inconsistencies. Never
  silently "correct" them in the write-up.
- **Merge rules, do not summarize them away.** Copy rules and calculations
  from the findings cards into the Business Logic Catalog intact. Summarize
  only narrative sections.
- **Treat the target as read-only.** Never modify, format, or run migrations
  on the analyzed code. Write only inside the workspace and output directories.
- **Keep secrets out of outputs.** If a key, password, token, or connection
  string appears in code or config, record that a secret is present and where
  it is, never its value.

## Runtime model: orchestrator and workers

You (the agent that loaded this skill) are the **orchestrator**. You run the
survey, plan work units, dispatch **workers**, verify, and synthesize. Workers
each analyze one work unit and write one findings card.

The orchestrator and workers communicate through **files on disk**. This
makes the workflow the same on every agent and lets an interrupted run resume:

```
<target-repo>/.jy-codebase-analysis/      # workspace (working state)
  system-map.md          # survey output: hypothesis, components, layers, glossary seed
  manifest.md            # every work unit, its files, depth tier, and status
  skipped.md             # every skipped file/glob with its reason
  briefs/U-###.md        # self-contained instructions for one worker (V-###.md for verifiers)
  cards/U-###.md         # one findings card per unit (worker output)
  rollups/<component>.md # component rollups (large repos only)
  verification/V-###.md  # verifier outputs, one per batch
  verification.md        # merged verdicts and totals
<target-repo>/docs/codebase-analysis/     # deliverables (default; confirm in Phase 0)
  README.md  01-business-overview.md  02-business-logic-catalog.md
  03-architecture-overview.md  04-engineering-patterns.md
```

### Dispatching workers on each agent

Use whatever mechanism your agent provides to launch a subagent with a fresh
context, and give it the prompt: *"Read and follow `<workspace>/briefs/U-###.md`
exactly."* The brief is self-contained, so the worker needs nothing else.

| Agent | How to launch workers | Notes |
|---|---|---|
| Claude Code | `Agent`/`Task` tool, general-purpose subagent | Send several calls in one message to run them in parallel. Subagents cannot spawn subagents, so only the orchestrator dispatches. |
| Cursor | `Task` tool (subagents) | Issue multiple Task calls in one message for parallelism. |
| Codex | Subagents (spawn worker agents); optionally `spawn_agents_on_csv` with one row per unit | Codex spawns subagents only when explicitly asked. Treat this skill's instructions as that explicit request. Dispatch workers, and do not analyze units inline. If Codex still analyzes inline, ask the user to re-invoke with "use subagents" in the prompt. |
| GitHub Copilot | VS Code: `runSubagent` tool. Copilot CLI: its subagent/task mechanism | Subagents cannot create other subagents. |

Rules that hold everywhere:

- **One level of delegation.** Workers never spawn workers. Even where the
  agent supports nesting, a flat fan-out keeps the manifest the single source
  of truth.
- **Use a worker type that can read files.** It should also be able to write
  its card. If the worker type is read-only, instruct it to return the full
  card as its final message, then write that message to `cards/U-###.md`
  yourself, verbatim.
- **Batch the fan-out.** Launch workers in waves (usually 4 to 8 at a time,
  or your agent's concurrency limit). After each wave, update `manifest.md`
  statuses before launching the next.
- **Sequential fallback.** If no subagent mechanism is available, process the
  briefs one at a time yourself. Before each unit, re-read only its brief and
  the reference files it names. After writing its card, do not reuse that
  unit's file contents. Rely on the card on disk instead. Tell the user up
  front that the run is sequential and will take longer.

## Workflow

### Phase 0: Intake

1. **Target**: the repo root (the current working directory by default) and
   any sub-path scope the user named.
2. **Output location**: `docs/codebase-analysis/` by default. Confirm it, or
   use the user's choice.
3. **Exclusions**: honor `.gitignore`, and ask whether any directories are out
   of scope (other teams' code, deprecated modules).
4. **Scale and cost**: count files and lines (Phase 1, step 1). The cost is
   the user's decision. If the plan exceeds about 40 work units, report the
   file, line, and unit counts once before dispatching. Then proceed unless
   the user narrows the scope.
5. **Resume check**: if `.jy-codebase-analysis/manifest.md` exists, offer to
   resume. Units marked `done` keep their cards. Dispatch only `pending` and
   `failed` units.

### Phase 1: Survey (orchestrator, shallow)

Follow `references/recon.md`. You read **structure, not bodies**: the file
inventory, manifests and build files, READMEs and docs, entry points, file
headers, directory names, and the import/reference graph. Output:

- `system-map.md`: a one-paragraph hypothesis of what the system is, its
  candidate components and layers, entry points, external integrations,
  persistence, and a seed glossary of domain terms.
- `skipped.md`: generated, vendored, binary, lockfile, and minified files,
  with reasons.
- `manifest.md`: work units (cohesive file groups sized for one worker
  context), each with a depth tier (`deep` or `light`), a component, and a
  layer.

Mark the hypothesis as provisional. Phase 2 confirms or overturns it.

### Phase 2: Deep read (workers, fan-out)

For each unit, write `briefs/U-###.md` using the brief template in
`references/unit-analyst.md`. Fill in the absolute paths to that file, to
`references/business-logic-extraction.md`, and to
`references/pattern-recognition.md`, resolved from this skill's install
directory. Also fill in the unit's file list, depth tier, system-map context,
and output path. Then dispatch workers as described above.

When each wave returns, check every card against the card schema: all
required sections present, every file in the unit listed under "Files read",
and every finding carrying a citation and a stated/inferred tag. Re-dispatch
a failing unit once with a note saying what was missing. If it fails again,
mark it `failed` in the manifest and list it in the coverage report.

### Phase 3: Cross-unit consolidation (orchestrator)

Workers cannot see each other's units, so do these joins yourself, working
from the cards:

1. **Glossary merge**: unify domain terms, and flag synonyms (the same concept
   under different names) and homonyms (one name, different meanings).
2. **Duplicate and conflicting logic**: group calculations and rules by the
   business concept they implement. Where two implementations of one concept
   differ (formula, constant, rounding, day-count, threshold), record a
   **conflict**. In financial and analytical code, these are often the most
   valuable findings in the whole analysis.
3. **Dependency graph**: assemble component-to-component dependencies from the
   cards' outbound references, and flag cycles and layer violations.
4. **Rollups (large repos only)**: if there are more than about 30 units,
   dispatch one worker per component to read that component's cards and write
   `rollups/<component>.md` (narrative purpose, workflows, patterns summary).
   Rollups summarize narrative only. Rules and calculations still come
   straight from the cards.

### Phase 4: Verification (workers)

Follow `references/verification.md`. Re-check every calculation, every
conflict, every high-impact rule, and every pattern claim against the cited
code, and try to prove each one wrong. Verifiers return **confirmed**,
**corrected** (with the fix), or **refuted**. Apply corrections, drop refuted
claims and log them, and record the counts for the coverage report.

### Phase 5: Synthesis

Write the four artifacts plus the index, using the templates in
`references/templates/`. Read each template before writing its artifact.

- `01-business-overview.md` from `templates/business-overview.md`
- `02-business-logic-catalog.md` from `templates/business-logic-catalog.md`
- `03-architecture-overview.md` from `templates/architecture-overview.md`
- `04-engineering-patterns.md` from `templates/engineering-patterns.md`
- `README.md` (index and coverage report) from `templates/index.md`

**Audience discipline.**

- Write artifacts 1 and 2 for a product manager. Lead every item with plain
  business language. Class and function names appear only in the "Where in
  code" references.
- Write artifacts 3 and 4 for architects and developers. Be precise and
  technical, and link claims to code.
- All four use the system's own domain vocabulary from the merged glossary.

For very large systems, you may delegate each artifact to a worker. Give it
the template path, the inputs to read (system map, cards or rollups,
verification results), and the output path, then review what it wrote
against the self-review checklist.

### Phase 6: Self-review and report

Before presenting results, verify:

- [ ] Every tracked file appears in a card's "Files read" or in `skipped.md`.
- [ ] Every calculation in the catalog has a formula, variable definitions
      with units, constants, rounding, edge cases, and a citation.
- [ ] Every conflict found in Phase 3 appears in the catalog's conflicts
      section with both sides cited.
- [ ] Every pattern claim has structural evidence, and name-only look-alikes
      are listed under "considered, not found".
- [ ] Every Mermaid diagram uses quoted labels and would render (no
      unbalanced brackets, no reserved words as bare IDs).
- [ ] No secret values appear anywhere in the outputs.
- [ ] Business artifacts contain no unexplained jargon, and technical
      artifacts contain no unsupported claims.
- [ ] Inferred claims are labeled everywhere they appear.

Then give the user a short summary: what the system is (two sentences), the
three to five most consequential findings (especially logic conflicts and
surprising rules), coverage numbers, and where you wrote the artifacts.
Mention that `.jy-codebase-analysis/` holds the full audit trail. Suggest
adding it to `.gitignore` unless they want it committed.

## Reference files

| File | Used in | Purpose |
|---|---|---|
| `references/recon.md` | Phase 1 | Survey procedure, skip rules, work-unit partitioning, manifest format |
| `references/unit-analyst.md` | Phase 2 | Worker brief template and findings-card schema |
| `references/business-logic-extraction.md` | Phase 2 (workers) | How to find and record rules and calculations |
| `references/pattern-recognition.md` | Phase 2 (workers), Phase 4 | Evidence-based recognition catalog: GoF, architectural, enterprise, fluent |
| `references/verification.md` | Phase 4 | Verifier brief and verdict format |
| `references/templates/*.md` | Phase 5 | Artifact templates |

`fixtures/` contains a small codebase with planted issues (`lendwise/`) and an
answer key for grading a run of this skill. Never give the answer key to the
agent running the skill.
