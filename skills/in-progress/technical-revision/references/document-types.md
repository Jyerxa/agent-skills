# Document types

Use this guide to shape or review a document whose type is named, chosen, or
recognizable. A template from
the user, team, or repository outranks these defaults. The parts describe what the
reader needs, not mandatory headings: merge or omit parts in a short document, and
do not add an empty section to complete a list.

## Tutorial

**Reader question:** "Can I get this working and understand what I did?"

**Parts:** what the reader will build and what they need; setup; small steps that
each produce a visible result; the finished state; where to go next.

**Common failures:** code that does not run as shown, in order; options and
alternatives that interrupt the path; explanation that outweighs practice.

## How-to guide

**Reader question:** "How do I do this task?"

**Parts:** the goal and when to use the guide; prerequisites; steps; how to confirm
success; variations and problems after the main path.

**Common failures:** teaching concepts the reader already has; background that
delays the first step.

## Runbook

**Reader question:** "Something is wrong or due. What do I do now?" The reader is
often on call, interrupted, and tired.

**Parts:** when to use it (alert, symptom, or schedule); impact and urgency; access
and permissions needed; steps, each with its expected result; how to verify the
outcome; rollback; escalation, or where to find the current contact.

**Common failures:** decisions without criteria ("if it looks wrong"); a
destructive step without a preceding check or warning; missing rollback; steps
that depend on knowledge only the author has. Put reversible checks, such as a
dry run, before changes.

## Reference

**Reader question:** "What exactly is this value, option, or behavior?"

**Parts:** one entry per item in a consistent shape, such as name, type, default,
allowed values, description, and example; an order that supports lookup.

**Common failures:** entries with different shapes; values written from memory
instead of the source; narrative mixed into entries.

## Explanation

**Reader question:** "Why does it work this way?"

**Parts:** the question or problem; the concept, built from what the reader knows;
how the parts connect; reasons, tradeoffs, and limits.

**Common failures:** steps or option lists that belong in a how-to or reference;
unexplained terms.

## README

**Reader question:** "What is this, is it for me, and how do I start?"

**Parts:** what it is and who it is for, in one or two sentences; installation and
a minimal working example; where deeper documentation lives; how to get help or
contribute, when relevant.

**Common failures:** badges and history before the description; a quickstart that
skips installation; full reference material that belongs elsewhere.

## Design doc or RFC

**Reader question:** "What do you propose, why, and what will it cost?" The reader
is usually deciding whether to approve.

**Parts:** a summary that states the decision requested; context and problem;
goals and non-goals; the proposal; alternatives and why they were not chosen;
risks and open questions; rollout, migration, and testing.

**Common failures:** no alternatives; missing non-goals; open questions written
as settled decisions.

## Decision record (ADR)

**Reader question:** "What was decided, and why?" The reader is often a future
maintainer.

**Parts:** a title that states the decision; status and date; context; the
decision; consequences, including accepted costs.

**Common failures:** length that buries the decision; rewriting an accepted
record instead of superseding it.

## Postmortem or incident report

**Reader question:** "What happened, how bad was it, why, and what prevents a
repeat?"

**Parts:** a summary of what happened, impact, duration, and current status;
impact figures with their source; a timeline in one time zone; root cause and
contributing factors, with their confidence stated; what helped and hindered
detection and response; action items with owners and target dates.

**Common failures:** blame. Describe systems, decisions, and missing safeguards,
not individuals' mistakes. Other failures: an open investigation written as a
confirmed cause; estimated or invented impact figures; mixed time zones; owners
or dates invented to make action items look complete. Write "Owner: TBD" instead.

## Release notes, changelog, or migration guide

**Reader question:** "What changed that affects me, and what must I do?"

**Parts:** version and date; breaking changes first, each with the required
action; new features; fixes; deprecations and their timelines. A migration guide
adds before-and-after examples and a way to verify the upgrade.

**Common failures:** internal changes users cannot observe; promotional language
(pattern P03); breaking changes hidden among fixes.
