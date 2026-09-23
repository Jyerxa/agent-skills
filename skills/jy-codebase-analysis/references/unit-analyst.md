# Unit Analyst: Worker Brief and Findings Card

The orchestrator writes one brief per work unit to
`.jy-codebase-analysis/briefs/U-###.md` using the template below, then
launches a worker with the prompt: *"Read and follow `<brief path>` exactly."*

The brief must be **self-contained**. A worker in any agent (Claude Code,
Cursor, Codex, Copilot) starts with no memory of the conversation, so
everything it needs is in the brief or in files the brief names by absolute
path.

## Brief template

````markdown
# Work Unit U-### — <name>

You are a code analyst. Read every line of the files listed below and write
one findings card. You are one of many workers, each covering a different
part of the codebase, so stay inside your file list. You may open other files
**only** to resolve a reference (for example to see the signature of a
function your files call). Do not analyze those other files.

Do not spawn subagents. Do not modify any file except your output card.

## Context (from the orchestrator's survey — provisional, verify against code)

- System hypothesis: <one paragraph from system-map.md>
- This unit's component: <component> — layer: <layer> — depth tier: <deep|light>
- Neighboring components this unit likely talks to: <list>
- Seed glossary terms relevant here: <terms>

## Files you own (read every line)

- <absolute or repo-relative path> (<lines> lines)
- ...
<If a file is split: "path — lines 1–2050 of 3900 (another unit covers the rest)">

## Read these instructions before starting

1. `<abs path>/references/business-logic-extraction.md` — how to find and
   record business rules and calculations. **Required.**
2. `<abs path>/references/pattern-recognition.md` — how to recognize design
   patterns from structural evidence. **Required.**
3. The card schema at the end of `<abs path>/references/unit-analyst.md`.

## Output

Write your findings card to: `<abs workspace path>/cards/U-###.md`.
If you cannot write files, return the complete card as your final message
and nothing else.

## Rules

- Cite `path:line` or `path:start-end` for every finding.
- Tag every finding **[stated]** or **[inferred]**.
- Calculations are business logic. Record every formula in full.
- Names are not evidence of patterns. Record structural evidence.
- Record what the code does. Put suspected bugs under "Anomalies".
- Never copy secret values (keys, passwords, tokens, connection strings).
  Note only that one exists and where.
- In "Files read", list every file you own and confirm you read all of its lines.
````

## Findings card schema

Every card uses exactly these sections, in this order. Write "None found" for
an empty section; never omit one. IDs are unit-scoped so the orchestrator can
merge cards without collisions: `R-###-n` for rules, `C-###-n` for
calculations, `P-###-n` for patterns, `A-###-n` for anomalies, where `###` is
the unit number.

```markdown
# Findings Card — U-### <name>

## Files read
| File | Lines | Fully read | One-line role |
|---|---|---|---|

## Purpose
<2–5 sentences: what this unit does for the business, then technically.>

## Capabilities and workflows
<The user- or system-facing things this code makes possible, in business
language. For each: trigger → steps → outcome, with citations.>

## Domain concepts
| Term (as in code) | Business meaning | Citation | Notes (synonyms, lifecycle/status values) |

## Business rules
<One block per rule, format per business-logic-extraction.md §Rule record.>

## Calculations
<One block per calculation, format per business-logic-extraction.md
§Calculation record.>

## Data and state
<Entities or tables touched (read/write), important fields, status fields and
their allowed transitions, and invariants enforced by the schema.>

## Interfaces
- Inbound: <how this unit is invoked — routes, handlers, public functions,
  events consumed — with citations>
- Outbound: <what this unit calls — other components (by path/module),
  external systems, DB, queues, files — with citations>

## Patterns observed
<One block per pattern, format per pattern-recognition.md §Pattern claim.
Include idiomatic forms (a function-parameter Strategy, for example).>

## Considered, not found
<Pattern names suggested by identifiers that fail the structural test, each
with the one-line reason.>

## Conventions
| Aspect | What this unit does | Citation | Consistent within unit? |
Aspects to cover when present: naming; error handling (exceptions vs result
types, where caught); validation (where and how); logging; dependency
acquisition (DI, construction, globals); transaction and unit-of-work
boundaries; async/concurrency style; null handling; money and numeric types
(float vs decimal); date/time and timezone handling; configuration access;
test style (framework, naming, fixtures, what is mocked).

## Anomalies
<Suspected bugs, dead code, contradictions between code and comments, docs,
or tests, duplicated logic, and magic numbers without explanation. Each item
has a citation and an impact note.>

## Secrets and sensitive data
<Locations only, with no values. "None found" if none.>

## Open questions
<Things the code alone cannot answer that a human SME should confirm.>
```

### Card quality bar

- A product manager could read "Capabilities" and "Business rules" and learn
  something true and specific about the product.
- A developer could jump from any citation straight to the code.
- Someone could re-derive each calculation from its block alone: every
  variable is defined, with units.
- Light-tier cards can be brief, but still list every file under "Files read"
  and still capture any rule or calculation found, however small.
