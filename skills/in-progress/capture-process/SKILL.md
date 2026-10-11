---
name: capture-process
description: 'Interview a domain practitioner to faithfully capture an existing or envisioned business process: its purpose, language, actors, objects, actions, relationships, lifecycle, and rules. Use to understand business operations, including manual work, before visualization, process improvement, or software design. This skill describes the process; it does not redesign it or prescribe an implementation.'
---

# Capture Process

Turn what a practitioner knows into a concise, evidence-linked process model
that another person or agent can use without the interview transcript. Be an
active modeling partner: resolve ambiguous language, test examples, expose
contradictions, and choose a clear representation. Preserve the process the
person describes rather than substituting a better one.

Read [the process model contract](references/process-model-v1.md) before the
first durable checkpoint. It defines the shared artifact, knowledge labels,
and rules that keep later diagrams and recommendations faithful.

## Establish the account

Read supplied conversation, notes, and any existing model. Reuse answers.
Establish the process's purpose, start and end, relevant context, and mode:

- **EXISTING:** how work happens today. Keep reported practice, inspected
  behavior, and stated policy distinguishable; they may disagree.
- **ENVISIONED:** how the practitioner currently intends work to happen.
  Capture that intent faithfully without presenting it as existing behavior.

Use ordinary tense and context to establish mode: an account of how work is
handled today is EXISTING; a process the user plans but has not started is
ENVISIONED. Do not spend a turn reconfirming clear intent. Ask when the mode
is genuinely ambiguous. If the conversation mixes today and a future idea,
separate the accounts and link
them. Do not quietly switch modes. A tentative suggestion is not an agreed
part of the envisioned process.

Use the user's requested scope. If it is unclear, ask what begins the work
and what outcome finishes it. A business process can involve people, paper,
spreadsheets, software, and external organizations. Do not narrow it to a
proposed application's boundaries.

## Interview through concrete cases

1. Start with one case from trigger to outcome. For EXISTING, ask for a recent
   example. For ENVISIONED, walk through a representative intended example.
2. Maintain a working model and a short set of consequential gaps. Choose
   the next question whose prerequisites are known and whose answer most
   changes the understanding. Default to one focused question, particularly
   on voice. Batch only a few genuinely independent questions when helpful.
3. Ask in the practitioner's language. Prefer "What happens next?", "Who
   decides?", and "What would make this the same case?" over DDD terminology.
4. Test vague words with examples and counterexamples. "Manage requests"
   needs an actual action; "usually" needs the meaningful exception; "fast"
   needs the affected activity, not an invented numeric target.
5. Resolve contradictions neutrally: "Earlier you described X; this case
   seems to show Y. What explains the difference?" Preserve unresolved
   accounts and their sources rather than choosing the tidiest story.
6. Briefly reflect important discoveries and corrections. Update the model,
   then select the next useful question instead of reading a questionnaire.

Do not suggest a recommended factual answer or word questions so "yes"
accepts your design. Neutral alternatives can clarify an already ambiguous
term, but first invite an open account. If improvement ideas arise, park them
outside the baseline and continue the descriptive interview. Only incorporate
new intent when the user explicitly identifies it as part of the ENVISIONED
account.

"I don't know" is a useful answer. Record the gap and what depends on it;
continue independent questions. Do not repeatedly ask someone for knowledge
they do not have. Read supplied or accessible relevant sources for facts you
can establish independently. A document describes what it says, and code
describes what it does; neither automatically overrides reported practice.
Do not contact other people or broaden external research without permission.

## Model only distinctions that matter

Use these lenses as needed, not as boxes to fill:

- **Purpose and boundary:** outcome, beneficiary, trigger, finish, exclusions.
- **Actors and responsibility:** who acts, decides, hands off, or receives
  information; meaningful authority and visibility differences.
- **Concepts and language:** business objects and values, identity through
  change, synonyms, ambiguous terms, and context-specific meanings.
- **Behavior:** actions, business events, inputs, outputs, state changes,
  waits, handoffs, and relevant exceptions.
- **Relationships:** meaning, direction, cardinality if known, and where
  information or responsibility crosses a boundary.
- **Rules and constraints:** prerequisites, permissions, forbidden outcomes,
  invariants, decisions, calculations, timing, and resource limits.

Explore depth in proportion to consequence. For a calculation that materially
affects the process, capture units, boundaries, rounding, and a worked example
when established. Missing values remain unknown. Do not invent rules to make
a diagram executable or exhaust every theoretical edge case.

The DDD lens is conceptual: preserve shared domain language and its context;
investigate whether identity matters or meaning lies in values; distinguish
an action from a meaningful event and a lifecycle state. A consistency
boundary may be a candidate aggregate only when an actual invariant supports
it. Label such classifications as interpretations until validated.

Not every noun is an entity, not every department is a bounded context, and
not every group of objects is an aggregate. Record business consistency needs
without choosing tables, classes, aggregate roots, APIs, transaction engines,
or application architecture. Stable document IDs are cross-references, not
claims about identity in the business.

## Save useful checkpoints

Use the requested location or an existing process-document convention;
otherwise write `docs/processes/<process-name>/process.md`. If writing is not
available, provide the complete artifact for the user to save. Never treat
permission to capture as permission to publish, share, or implement.

Follow the contract: a short narrative, a sparse linked inventory, concrete
scenarios, visible gaps, and source locators. Keep one canonical Markdown
model. Add a flow, lifecycle, or relationship diagram only when it clarifies
supported information; retain IDs and distinguish incomplete or inferred
connections. A diagram is a view, not a new source of facts.

For partial progress, include the next useful question and the source or
person needed to resolve each material gap. On resumption, read the checkpoint
and continue from those gaps. Preserve stable IDs and the revision history.
When corrections alter an account already used downstream, preserve its
prior revision and identify what supersedes it.

## Finish with fidelity, not exhaustion

The model is reviewable when you can explain its purpose and boundaries,
principal participants and terms, a main trigger-to-outcome scenario, and
material rules and exceptions without hiding missing knowledge. An unknown
that prevents a coherent main account keeps coverage partial; lesser gaps
can remain in a reviewable model. Do not prolong the interview for incidental
details. Stop immediately when asked and save a useful partial model.

Before delivery:

- Replay the main case and a consequential exception against the model.
- Check relationships, constraints, and diagrams against their evidence.
  Narrative order is not execution order; unspecified is not concurrent.
- Preserve practice/policy differences, conflicting sources, and unverified
  interpretations. ENVISIONED facts must remain intended behavior.
- Check record IDs and references. If Python is available, run
  `python scripts/validate_model.py <process.md>` relative to this skill.
  This checks structure, not truth; still perform the evidence review.

Present the saved model with its important gaps and ask one accuracy check
(defer this if the user asked to stop):
"Does this faithfully describe the process, or is anything important wrong
or missing?" Mark agreement user-confirmed only after an affirmative answer.
Confirmation does not resolve unknowns or authorize later work.

End at the capture. Its model can be consumed without any other skill
installed. `system-discovery` addresses a software system's intended scope;
this skill captures business operations. Visualization, improvement, and
implementation are separate tasks, pursued only when requested.

## Sources

The dependency-aware interview is inspired by Matt Pocock's
[grill-me](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md)
and [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md).
These instructions are independently written and intentionally use neutral
questions and a bounded stopping point.

The modeling lens draws on Eric Evans's
[Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/).
Use its concepts to clarify meaning, not as a mandatory implementation catalog.
