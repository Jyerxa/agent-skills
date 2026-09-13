---
name: system-discovery
description: 'Guide an interview from a rough software idea to a system brief: purpose, users, workflows, responsibilities, business rules, scope, and constraints. Use when the user wants to figure out what a system should do before designing its codebase, or needs an idea clarified for architecture work.'
---

# System Discovery

Help the user articulate what they want to build. Produce a concise system
brief that gives later design work enough evidence to reason about module
boundaries and invariants.

The finish line is a shared understanding of the system's intended behavior.
Keep architecture choices for the design stage: capture an existing technical
constraint when it matters, but leave new module layouts, patterns, schemas,
and implementation plans out of this interview.

## Start from what is known

Read the conversation and any supplied notes or spec. If a relevant codebase
exists, inspect its overview and the parts needed to answer factual questions.
Distinguish what it does today from what the user wants it to do. Reuse answers
already given; a supplied brief may need only a few clarifications.

If the idea itself is missing, begin with: "What do you want to build?"
Otherwise, briefly reflect your current understanding and ask about the most
consequential gap.

## Interview loop

1. Pick the unanswered question most likely to change your understanding of
   the system. Resolve its prerequisites first: knowing who uses something
   usually matters before exploring what they may change.
2. Ask one focused question and wait for the answer. Use ordinary language
   and concrete situations. Treat the coverage map below as a guide for
   choosing questions, not a questionnaire to present or exhaust.
3. When the user faces a tradeoff, explain the practical difference and offer
   a recommendation grounded in what they have said. Leave factual questions
   open; a suggested answer must not become an invented requirement.
4. Follow vague or conflicting answers with a concrete example. For "manage
   bookings," find out what someone actually does and what happens next. For
   "it must be fast," discover which activity suffers and what delay matters.
5. Update the working understanding and choose the next question from it.
   Briefly recap when an answer changes the scope or resolves a contradiction.
   A correction supersedes the earlier answer; remove stale claims from the
   eventual brief.

"I don't know" is a valid answer. Explain the consequence if useful, record
the uncertainty, and move to an independent question. Revisit it only if it
prevents a coherent account of the system. Never silently accept your own
recommendation on the user's behalf.

## Coverage map

| Learn | Enough detail for this stage |
| --- | --- |
| Purpose and success | The problem, who experiences it, and an observable improvement the system should make. |
| People and other actors | Who initiates work, who benefits, and meaningful differences in what each actor may see or do. Include automated actors where relevant. |
| Main workflows | A concrete journey from trigger to outcome: actor, information supplied, what the system does, and what changes. Explore an important failure or exception when it changes the promise. |
| Domain concepts | The important things users talk about, their meaning, relationships, and significant lifecycle changes. Keep these in domain language. |
| System responsibilities | What this system handles, what people or external systems handle, and the information exchanged between them. These describe the system's scope, not internal modules. |
| Business rules | Known conditions that must hold, actions that must be prevented, and why violations matter. Record the rule itself; enforcement mechanisms come later. |
| Scope | What the first useful version includes, what is explicitly excluded, and which future ideas are tentative. |
| Constraints | Existing commitments that affect design: integrations, operating environment, data sensitivity, scale, latency, availability, team, or delivery limits. Explore only what is material; unknown numbers stay unknown. |

Depth should follow consequence. A personal script might need one workflow
and a few rules. A shared booking service may need ownership, conflicts, and
cancellations clarified. Pursue an exception when it changes responsibility,
scope, or a core promise; defer details that only affect implementation.

## Stop when design can begin

End the questioning when you can explain, without inventing product decisions:

- Who needs the system, why, and what success looks like.
- What the first useful version does, through at least one concrete end-to-end
  workflow, and what lies outside its responsibility.
- The central domain concepts, known business rules, and consequential
  interactions or constraints.
- What remains uncertain and how those uncertainties could affect design.

This is a readiness check, not a demand to settle every possible requirement.
If an unknown could change the primary user, main workflow, system scope, or
a core business promise, clarify it or explicitly mark the brief provisional.
Detail that can safely be deferred should not prolong the interview.

If the user asks to stop or save early, capture a partial brief with the
remaining questions. On resumption, read it and continue from those gaps.

## Capture the system brief

Read [references/brief-template.md](references/brief-template.md) when ready
to synthesize, or when saving partial progress. Write to the user's requested
path or the repo's existing discovery-document location; otherwise use
`docs/design/system-brief.md`. If a brief exists, read and update it, preserving
unrelated content. When no writable workspace is available, present Markdown
the user can save.

Keep the brief proportionate to the idea. It must stand alone without the
chat transcript. Separate confirmed user intent, observed current behavior,
proposed assumptions, and open questions. Cite supplied documents by path and
section, or attribute consequential decisions to the relevant user answer;
do not fabricate source references or turn observations into requirements.

Present the written draft and ask for one accuracy check: "Does this capture
the system you want to build, or is anything important wrong or missing?"
Apply corrections and mark it confirmed only when the user affirms it.
User confirmation and readiness for design are separate: a user can confirm
an accurate account that still contains a fundamental open question.

Hand off the brief with any questions that affect `module-design` or
`invariant-design`. The brief is usable without either skill installed. This
skill ends at the brief; continue into design or implementation only when
that work is included in the user's request.

## Origin

Inspired by Matt Pocock's [grill-me](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md)
and its [grilling workflow](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md).
This adaptation narrows the interview to system discovery and adds a durable
brief and an explicit stopping point.
