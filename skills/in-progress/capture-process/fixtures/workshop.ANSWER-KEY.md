# Workshop capture evaluation

Give an evaluator only SKILL.md, its linked reference, the validator, and
workshop-interview.md. Do not provide this answer key or the example output
until it has produced its own model in an isolated directory.

## Evaluate behavior, not exact wording

The first saved capture should:

1. Describe an EXISTING process for one branch, from drop-off to collection.
   Agreement remains draft. Coverage may be reviewable with visible gaps;
   uncertainty must not be hidden to earn that label.
2. Preserve the job ticket's continuing identity across description changes,
   one bike per job, and multiple jobs per customer. Do not invent a database
   key, one-job-per-bike restriction over time, or a finalized aggregate.
3. Preserve inspection and parts checking as prerequisites for a quote.
   Their general relative order and concurrency are unknown. A4 is evidence
   for one case's order only, not a universal inspection-before-check rule.
4. Distinguish quote-acceptance policy from reported early-repair practice.
   Keep the unknown meaning of small fault and the unknown exception
   authority. Do not characterize either claim as independently observed.
5. Include the declined-quote collection path without inventing a lifecycle
   state, refund, payment process, or scrapping of the bike.
6. Preserve both notification accounts, with their attribution and an open
   question. Do not select one, average them, or assert that they conflict
   in all cases. Their applicability may differ.
7. Treat ready as collectable following repair, not paid. Do not invent
   payment handling or a complete lifecycle transition graph.
8. Keep automatic notification outside the current baseline and outside
   confirmed future requirements. No software design or improvement plan.
9. Save a resumable checkpoint without asking for another answer. Include
   a useful next question and the relevant role/source for material gaps.
10. Satisfy process-model/v1 with resolvable IDs, qualified claims, and
    source locators. A consumer must understand the account without guessing.

Some consolidation is desirable. An actor or concept need not be repeated
for every sentence, and a short model need not have every possible kind.
Completeness of inventories, record counts, and exact prose are not scores.

## Resumption test

Provide the evaluator's saved model and A8 only. Verify that it increments
the revision, preserves useful IDs, keeps the earlier baseline reproducible,
and qualifies notification timing by normal versus urgent jobs. The old
unresolved conflict must no longer appear as active, while early-repair and
general inspection-order questions remain open. Agreement remains draft:
A8 confirms a fact, not the whole generated model.

## Envisioned and proportion test

Provide only the separate envisioned input. Verify ENVISIONED mode, intended
behavior rather than observations, the unsafe-item question, draft agreement,
and an honestly short partial model. It must not inherit workshop concepts,
invent disposal policy, or fill every record kind.

## Interactive question test

Begin a fresh interview with: "I'd like to explain how we handle complaints."
The agent should clarify the necessary scope/mode or request a concrete case
without leading factual answers, proposing automation, or presenting the
entire coverage map as a questionnaire. After "I don't know," it should
record the gap and move to an independent question where possible.

## Mechanical and evidence review

Run the bundled validator on every saved model. Then manually inspect the
meaning of each diagram edge, rule, scenario, and evidence label. A validator
pass does not prove semantic fidelity. The committed workshop-process.md is
an independently produced and reviewed example for later consumer tests,
not a mandatory size or template for other business processes.

## Recorded evaluation on 2026-10-09

- An independent evaluator received only the skill, contract, validator, and
  initial A1-A7 interview. It produced workshop-process.md. All ten semantic
  checks above passed on review, and the structural validator passed. Source
  locators were changed from the temporary input path to workshop-interview.md
  when saving the fixture; its meaning was not changed.
- The same evaluator resumed with A8, preserved revision 1, retained IDs, and
  produced a passing revision 2. Notification timing was qualified by normal
  versus urgent jobs; other gaps and draft agreement remained intact.
- A separate evaluator produced a 496-word ENVISIONED partial model from the
  donation input. Its mode, unknown handling, scope, and structural checks
  passed. It did not fill unused inventories.
- The fresh complaints interview initially reconfirmed mode despite wording
  that ordinarily implies current practice. The entrypoint was clarified to
  use ordinary tense and context rather than routinely reconfirm clear intent.
  On retest, the evaluator asked for a recent complaint from intake to outcome
  without an extra mode-confirmation question.
- Thirteen validator unit tests cover valid partial/envisioned captures,
  wrapped evidence, unknowns, duplicate IDs, missing or malformed references,
  invalid metadata, source attribution, and relationship endpoints.

These checks cover the recorded scenarios, not every possible interview.
The validator checks structure only; the independent captures and evidence
review supply the behavioral checks.
