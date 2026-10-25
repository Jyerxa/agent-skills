---
name: code-review
description: 'In progress: Review existing code or a PR against bundled coding principles, with simplicity and reader cognitive load as the main lens. Report evidence-backed defects and worthwhile simplifications in agent-written or legacy code. Not an implementation workflow or a style audit.'
metadata:
  version: "0.0.1"
  lifecycle: "in-progress"
---

# Review code against principles

**Simplicity scales.** Judge how much a reader must hold in mind to understand
behavior, not how few lines it occupies. Find avoidable complexity and keep the
complexity that correctness, contracts, and real constraints require. A sound
implementation can still deserve a concrete simplification, and a long
implementation can deserve no findings.

Project instructions and established conventions take precedence over this
skill. The lenses in `references/` turn coding principles into review questions
about observable consequences. They are not a second rulebook for authors.
[Principles](references/principles.md) holds the text of each principle a lens
cites. Read a cited entry only to resolve an ambiguity, and do not treat the
file as a checklist.

## Bound the review

Establish the requested files or diff, intended behavior, contracts, conventions,
and available checks. For a PR, compare base and head and read the callers,
tests, and surrounding code needed to assess the change. Separate introduced
problems from relevant pre-existing ones. For a selected-code or legacy review,
assess the code as it stands without assuming a change history or authorship.
Do not turn either into unrelated repository cleanup.

Trace representative behavior through the code. Note where understanding it
requires following forwarding layers, remembering hidden state or ordering,
reconciling repeated rules, or decoding special cases. Start with the
[reading-load lenses](references/reading-load.md). Load the
[behavior and verification lenses](references/behavior.md) only for relevant
contracts, state, errors, or tests. The lenses are prompts for investigation,
not mandatory categories or a violation checklist.

## Support each finding

For each candidate, locate the evidence and check callers, requirements, and
counterexamples. Show either a failure scenario or a concrete reading or change
burden, then a smaller or clearer remedy that preserves required behavior.
Explain what the reader would no longer need to track. Do not propose an
abstraction that only moves lines elsewhere, and do not remove a layer without
checking its boundary, compatibility, ownership, or performance role.

Validate claims with focused checks where practical. Say when a result is
inferred rather than reproduced. Missing context calls for a targeted question
or a stated coverage limit, not an invented defect. Do not apply line-count,
helper-count, coverage, or rule-of-three thresholds. Do not make claims about
whether the author planned, searched, measured, delegated, or wrote tests first.

## Report and stop

Lead with findings, ordered by impact. Use the project's severity scale. Without
one, use High for a serious correctness or safety risk, Medium for a material
behavior or maintenance risk, and Low for a worthwhile, non-blocking
simplification. Justify the rating with consequences, not the principle's name.
Keep each finding concise and include:

- The file and a narrow line range, a title, and the severity.
- The evidence, the triggering scenario or reading burden, the consequence, and
  any uncertainty.
- The relevant principle and the smallest useful remedy, with its important
  tradeoffs.

Combine findings that share a cause. Keep unresolved questions separate from
findings, and do not present suggestions as bugs. End with the scope you
covered, the checks you ran and their outcomes, and any gaps. Zero findings is
a valid result, but it does not guarantee correctness. Finish when you have
covered the agreed scope and each candidate is either validated or marked
unresolved. A review request alone does not authorize you to edit code, post
comments, commit, or expand the task.

For maintainer evaluation, use the isolated [sample request](fixtures/review-request.md).
