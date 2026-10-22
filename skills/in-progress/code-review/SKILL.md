---
name: code-review
description: 'In progress: Review existing code or a PR against coding-principles, with simplicity and reader cognitive load as the main lens. Report evidence-backed defects and worthwhile simplifications in agent-written or legacy code. Not an implementation workflow or a style audit.'
metadata:
  version: "0.0.1"
  lifecycle: "in-progress"
---

# Review code against principles

**Simplicity scales.** Judge how much a reader must hold in mind to understand
behavior, not how few lines it occupies. Find avoidable complexity while
preserving the complexity that correctness, contracts, and real constraints
require. A sound implementation can still deserve a concrete simplification;
a long implementation can deserve no findings.

Project instructions and established conventions take precedence. The
[coding-principles source](https://github.com/Jyerxa/agent-skills/tree/main/skills/in-progress/coding-principles)
supplies the principles; this skill translates their observable consequences
into review questions, not a second authoring rulebook. Use the source in the
checkout or installed skills when available. Follow the source links in the
relevant reference to resolve ambiguity; do not load all topics. If unavailable,
state that limit and review only what the supplied code and bundled lenses support.

## Bound the review

Establish the requested files or diff, intended behavior, contracts, conventions,
and available checks. For a PR, compare base and head and read the callers,
tests, and surrounding code needed to assess the change. Separate introduced
problems from relevant pre-existing ones. For a selected-code or legacy review,
assess the code as it stands without assuming a change history or authorship.
Do not turn either into unrelated repository cleanup.

Trace representative behavior through the code. Note where understanding
requires following forwarding layers, remembering hidden state or ordering,
reconciling repeated rules, or decoding special cases. Start with
[reading-load lenses](references/reading-load.md). Load
[behavior and verification lenses](references/behavior.md) only for relevant
contracts, state, errors, or tests. These are prompts for investigation, not
mandatory categories or a violation checklist.

## Earn each finding

For a candidate, locate the evidence and check callers, requirements, and
counterexamples. Show either a failure scenario or a concrete reading/change
burden, then a smaller or clearer remedy that preserves required behavior.
Explain what the reader would no longer need to track. Do not propose an
abstraction merely to move lines elsewhere, or remove a layer without checking
its boundary, compatibility, ownership, or performance role.

Validate claims with focused checks where practical. State when a result is
inferred rather than reproduced. Missing context warrants a targeted question
or a coverage limit, not an invented defect. No line-count, helper-count,
coverage, or rule-of-three thresholds; no claims about whether the author
planned, searched, measured, delegated, or wrote tests first.

## Report and stop

Lead with findings, ordered by impact. Use the project's severity scale, or
High (serious correctness/safety risk), Medium (material behavior or maintenance
risk), Low (worthwhile, non-blocking simplification). Justify the rating with
consequences, not the principle's name. Keep each finding concise:

- File and narrow line range; title and severity.
- Evidence, triggering scenario or reading burden, consequence, and uncertainty.
- Relevant principle and smallest useful remedy, including important tradeoffs.

Combine findings with the same cause. Keep unresolved questions separate from
findings; do not disguise suggestions as bugs. End with scope covered, checks
run and their outcomes, and gaps. Zero findings is valid, not a guarantee of
correctness. Finish when the agreed scope is covered and candidates are
validated or explicitly unresolved. Review alone does not authorize edits,
posting comments, commits, or expanding the task.

For maintainer evaluation, use the isolated [sample request](fixtures/review-request.md).
