# Process Model v1

This contract lets a captured process stand alone and feed later explanation
or improvement. Fidelity is required; completeness is not. It defines a small
Markdown envelope and stable references, not a database schema or executable
process language. Keep the user's vocabulary and omit unused sections.

## One canonical model

`process.md` contains the narrative and the linked model. Any diagrams, HTML,
JSON, or other downstream representations are derived views. They must name
the exact model ID and revision they consumed and preserve source IDs. Do not
maintain a second hand-edited ontology beside the prose.

Use this frontmatter, with actual values:

```yaml
---
format: process-model/v1
model_id: returns
revision: 1
mode: EXISTING
agreement: draft
coverage: partial
---
```

- `model_id`: stable lowercase slug. `revision`: positive integer.
- `mode`: `EXISTING` or `ENVISIONED`; never silently mix accounts.
- `agreement`: `draft` or `user-confirmed`. Confirmed means the user affirmed
  accuracy, not that all facts were independently verified.
- `coverage`: `partial` or `reviewable`. This is independent of agreement.

Begin with a title, a short purpose/scope statement, and a concise narrative.
Include relevant dates, organizational context, start/end boundaries, and
exclusions when established. Link important claims to model records; record
unestablished boundaries as questions rather than completing the header by
guessing. A few paragraphs and a small inventory may be enough.

## Stable records and links

Give a meaningful item a stable lowercase ID such as `actor-support`,
`case-return`, `rule-receipt`, or `q-approval`. Prefixes are convenient, not
required. Each record uses an ID-only level-three heading and named fields:

```markdown
### rule-receipt
- Kind: rule
- Name: Receipt before refund
- Meaning: A refund requires a recorded return receipt.
- Evidence: reported; policy; [Interview](#src-interview)
- Applies to: [Issue refund](#action-refund)
```

The heading gives the record a normal Markdown anchor. Link with
`[human-readable label](#record-id)`. Use IDs in diagrams too. Keep IDs when
names change; never reuse one for a different meaning. If an item splits or
merges, record the old ID and its replacements instead of silently retargeting
existing references. A record ID does not make a concept a DDD entity.

Every non-source record has `Kind`, `Name`, `Meaning`, and `Evidence`.
Available kinds are `context`, `actor`, `concept`, `action`, `event`, `state`,
`relationship`, `rule`, `scenario`, and `question`. Use only those needed.
Fields can contain short prose and links. Avoid giant empty tables.

`Evidence` begins with a knowledge status and what the claim describes,
separated by semicolons, followed by its source links and any qualification:

- Knowledge: `observed`, `reported`, `inferred`, `disputed`, or `unknown`.
- Describes: `practice`, `policy`, `intent`, or `definition`.

Observed means supported by something actually inspected, not independently
verified universal behavior. Reported means attributed to a person or
document. An inference states its basis. Disputed means accounts conflict.
Unknown names what is missing. Do not add invented confidence percentages.

Evidence defaults apply only to that record. If one field has a different
basis, explicitly qualify it with its own status, claim type, and source.
Prefer separate records for conflicting claims so a consumer cannot collapse
them. A policy claim and a practice claim may both be accurate accounts.
In ENVISIONED mode, planned actions/rules are intent, not observed practice;
any existing constraints or background observations must be labeled as such.

Sources are records too:

```markdown
### src-interview
- Kind: source
- Name: Operations interview
- Locator: Supplied transcript, answer A3, 2026-10-09
```

Use a real accessible URL, path and section, transcript answer label, or an
honest conversation locator. Never fabricate a message ID, quote, timestamp,
or citation. If no durable locator exists, include an attributed summary that
makes the basis understandable without the chat. Sources need `Kind`, `Name`,
and `Locator`; they do not need an `Evidence` field.

## Behavior and relationships

Add fields only when they carry established meaning:

- Actor: responsibility, authority, context.
- Concept: definition, identity/value distinction if justified, properties
  that matter to the process, lifecycle or context links.
- Action: actor, subject, trigger, inputs, outcome, applicable rules.
- Event: what happened, affected concept, relevant actor or context.
- State: condition of a named concept; do not confuse it with an action.
- Rule: conditions, outcome/prohibition, exceptions, units or boundaries.
- Question: uncertainty, affected IDs, consequence, needed source, next step.

A relationship record also has `From`, `To`, and `Relation`. Both endpoints
link to records. Name its actual meaning, for example `precedes`, `triggers`,
`requires`, `changes-state`, or `belongs-to`. Include cardinality, guard,
branch/join behavior, or time only when established. A relationship's own
evidence is necessary; known endpoints do not establish an edge between them.

Distinguish causation, temporal order, prerequisite, and conceptual association.
"Both happen after intake" does not establish their order or concurrency.
Not mentioned is not false, forbidden, optional, or absent from the business.
Known independent execution is different from unspecified relative ordering.

## Scenarios and derived views

A scenario has its own ID, evidence, and status. Identify it as a reported
case, observed case, or hypothetical illustration. Link the actions/events
it uses, relevant rules, branches, and outcome. Mark a partial scenario and
the exact gap when trigger-to-outcome behavior is not established. Do not
invent IDs, values, timings, or probabilities to make it runnable.

An ordered case illustrates that case only; it does not prove universal
precedence. A proposed order for showing information is presentation order,
not a business execution trace. Name this difference wherever it matters.

A flow/state/relationship diagram is optional. Every meaningful node and edge
must point back to a record or an explicit evidence-qualified field. Mark
uncertainty visibly, and do not rely on position, animation, or an unlabeled
arrow to imply extra semantics. An HTML viewer can generate its own JSON,
but that data must retain IDs, evidence, baseline revision, and unknowns.

## Partial captures, changes, and consumers

Finish with the important questions and the next useful interview question.
On resumption, preserve answers and IDs. A partial model is a valid output.
Show disagreement rather than resolving it by majority vote or tidy layout.

Increment the revision for material changes to meaning. Add a short revision
note naming corrections and superseded claims. Preserve a prior snapshot
when a downstream artifact depends on it; for example, retain the immutable
Git commit or save `revisions/process-r1.md` before updating the working file.
Do not leave stale claims active after a correction.

A consumer must read the envelope and gaps before using the model. If it
supports only this contract version, a different version requires an explicit
adaptation that preserves the source, not a silent best-effort parse.

- A visualization may explain a partial model but cannot fill missing edges,
  conditions, order, durations, or state changes. Unknowns remain visible.
- An improvement artifact is separate, names the exact baseline revision,
  and links proposed changes to baseline IDs. Alternatives and their claimed
  benefits are proposals, not baseline facts. Acceptance is not deployment.
- A software design may use the domain knowledge without assuming that
  concepts correspond one-to-one to tables, classes, services, or aggregates.

These are artifact boundaries, not requirements to install other skills.
Keep this versioned contract self-contained when packaging a consumer alone.

## Validation

Run `scripts/validate_model.py` when available for metadata, record shape,
unique IDs, resolvable links, source references, and relationship endpoints.
It does not check whether claims are true, a scenario invents behavior, or
the interview was non-leading. Review those against the actual evidence.
