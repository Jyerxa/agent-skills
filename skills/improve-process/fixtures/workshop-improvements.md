---
format: process-improvement/v1
assessment_id: workshop-example-options
revision: 1
baseline_format: process-model/v1
baseline_model_id: workshop-bike-intake
baseline_revision: 1
baseline_mode: EXISTING
baseline_agreement: draft
baseline_coverage: reviewable
baseline_locator: ../../capture-process/fixtures/workshop-process.md
baseline_sha256: 560868aeab1ba9e774cf0db7b91e8359e2de50f517c3ec44152912b1552bf03c
---

# Workshop: clarify before changing

## Assessment

The clearest learning opportunity is the reported conflict over repair before acceptance; notification timing is another conditional option. The request ([fictional request](workshop-request.md)) supplies no improvement priority, so neither is ranked by business benefit. This draft covers this branch, drop-off through collection; evidence is reported, with no established frequency, harm, delay, or savings.

No answers are needed today. These are decision aids: no baseline edits, outreach, tests, or implementation occurred, and any subsequent action needs appropriate authorization. The separate interview resumption input is excluded.

### proposal-clarify-repair-authorization
- Name: Clarify acceptance authority before changing early repairs
- Status: needs-evidence
- Problem: If clearer customer agreement matters, repair before acceptance is a candidate concern; adverse consequences are unestablished.
- Basis: Meaning and Evidence in [acceptance policy](../../capture-process/fixtures/workshop-process.md#rule-accept-before-repair) describe reported policy, while [early repairs](../../capture-process/fixtures/workshop-process.md#rule-early-repair-practice) describe differing reported practice, without established permission.
- Affects: [Quote decision](../../capture-process/fixtures/workshop-process.md#action-decide-quote), [repair](../../capture-process/fixtures/workshop-process.md#action-repair), [mechanic](../../capture-process/fixtures/workshop-process.md#actor-mechanic), [job ticket](../../capture-process/fixtures/workshop-process.md#concept-job).
- Diagnosis: The supported finding is a policy/practice mismatch; its cause, prevalence, and effects are unknown.
- Change: Establish the applicable policy and authority, then consider an acceptance-information cue only if existing information proves hard to find.
- Alternatives: Leave handling unchanged to avoid extra work while the goal remains unset, or clarify existing instructions without adding a cue.
- Tradeoffs: Review takes mechanic and policy-interpreter time; a cue could duplicate records or constrain useful judgment, with effort and recording responsibility unknown.
- Constraints: Retain the reported acceptance requirement pending verification; no exception, policy relaxation, changed quote prerequisites, or general check ordering is proposed.
- Benefit hypothesis: If authorization or information uncertainty affects decisions, clarification or a small cue might make their basis easier to establish.
- Test: Compare the actual policy with recent early-repair and ordinary accepted-quote examples, then rehearse any cue using existing, minimally necessary information and check for clarity without duplication.
- Decision: Choose clarification if this concern matters; add a cue only for a demonstrated information gap, and defer exceptions to the still-unidentified policy authority.

### proposal-understand-notification-handoff
- Name: Reconcile notices before changing the handoff
- Status: needs-evidence
- Problem: If predictable communication matters, conflicting timing accounts impede choosing a change; they do not prove late or missing notices.
- Basis: Meaning and Evidence in [immediate notices](../../capture-process/fixtures/workshop-process.md#rule-notify-immediate) and [batched notices](../../capture-process/fixtures/workshop-process.md#rule-notify-batch) preserve separate reported practice claims; [timing](../../capture-process/fixtures/workshop-process.md#q-notification-timing) remains disputed.
- Affects: [Mark ready](../../capture-process/fixtures/workshop-process.md#action-mark-ready), [notify](../../capture-process/fixtures/workshop-process.md#action-notify), [reception](../../capture-process/fixtures/workshop-process.md#actor-reception), [mechanic](../../capture-process/fixtures/workshop-process.md#actor-mechanic), [ready state](../../capture-process/fixtures/workshop-process.md#state-ready).
- Diagnosis: The account disagrees; differing conditions or a handoff gap are possibilities, not established causes.
- Change: Reconstruct same-job timing, then consider an existing-record cue distinguishing readiness from notice completion only if a handoff-information gap appears.
- Alternatives: Keep current handling and its possible useful batching, or clarify intentional variation without changing work; automation remains an unselected idea.
- Tradeoffs: Review uses reception and mechanic time; a cue adds upkeep, while more frequent notices could interrupt work, with actual burdens unknown.
- Constraints: Ready still means a repaired bike can be collected, never paid or notified; declined-job status and notice sequence remain unknown, with no constraint relaxation requested.
- Benefit hypothesis: If unclear handoff information exists, a lightweight cue might reduce notification uncertainty; intentional variation may require no operational change.
- Test: Compare reception and mechanic accounts for the same jobs with available readiness/notice records, then rehearse any cue for clarity and duplicate work before choosing a timing target.
- Decision: Pursue only for an agreed communication goal; prefer clarification when variation is intentional, and leave timing changes pending evidence and an authorized decision-maker.

## Questions and boundaries

Save three questions: What outcome and tradeoff matter? Who interprets acceptance policy, and what happened in an early-repair case? What explains readiness-to-notice timing for the same job?

Unavailable-parts handling, check order/concurrency, and declined-collection details remain unknown; no change should fill these gaps by assumption. The two options are independent but share the need for an agreed goal; no benefits are added together.

Revision 1: Published example adapted from an independently exercised assessment; proposal IDs and the exact capture baseline are preserved.
