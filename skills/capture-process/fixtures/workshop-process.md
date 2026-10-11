---
format: process-model/v1
model_id: workshop-bike-intake
revision: 1
mode: EXISTING
agreement: draft
coverage: reviewable
---

# Workshop bike intake, repair, and collection

## Purpose, scope, and current account

This model describes today's work at the interviewed workshop branch, from a bike's drop-off through customer collection, including collection without repair after a declined quote. Other branches are excluded. It records reported operations, not inspected operations. The main case is coherent enough for review; unresolved timing, exception authority, and status questions remain visible below. This saved model has not been confirmed by the user. [Scope](#src-a1), [declined quotes](#src-a5)

Reception [opens a job ticket](#action-open-ticket) at drop-off. The [job](#concept-job) retains its number through collection despite description changes. The mechanic [inspects the bike](#action-inspect) and [checks parts availability](#action-check-parts); both are prerequisites for [preparing the quote](#action-prepare-quote). Their general relative order and whether they can overlap are unknown. The [ordinary reported case](#scenario-ordinary) then proceeds through customer acceptance, repair, readiness, reception's notification, and collection. Its inspection-first sequence describes that case only. [Quote prerequisites](#rule-quote-prerequisites)

The [stated written policy](#rule-accept-before-repair) requires quote acceptance before repair. The practitioner also reports [repair before acceptance](#rule-early-repair-practice) for some small faults for regular customers; the boundary and authority for this practice are unknown. A declined quote leads to [arranging collection without repair](#action-arrange-unrepaired-collection). “Ready” means a repaired bike can be collected; it is not a payment state, and this account makes no claims about payment handling. Notification timing has [two conflicting accounts](#q-notification-timing), preserved separately.

The tentative idea of automatic notifications is parked outside this EXISTING baseline. It is neither agreed future intent nor a software requirement. The user asked to stop, so no further interview questions were posed. [Stopping and future idea](#src-a7)

## People, language, and relationships

### actor-reception
- Kind: actor
- Name: Reception
- Meaning: Opens job tickets, notifies customers of repaired-bike readiness, and arranges collection when a quote is declined.
- Evidence: reported; practice; [A1](#src-a1), [A4](#src-a4), [A5](#src-a5)

### actor-mechanic
- Kind: actor
- Name: Mechanic
- Meaning: Inspects bikes, checks parts availability, prepares quotes, repairs bikes, and marks repaired bikes ready.
- Evidence: reported; practice; [A2](#src-a2), [A4](#src-a4)
- Authority gap: Permission to make the [early-repair exception](#rule-early-repair-practice) is unknown.

### actor-customer
- Kind: actor
- Name: Customer
- Meaning: Accepts or declines a quote and collects the bike. A customer can have several jobs.
- Evidence: reported; practice; [A1](#src-a1), [A4](#src-a4), [A5](#src-a5)

### concept-job
- Kind: concept
- Name: Job and job ticket
- Meaning: Reception opens a job ticket at drop-off. The same job number stays with the job until collection, even if its description is revised. The job and its ticket are discussed together here without asserting that they are separate business entities or exact synonyms.
- Evidence: reported; definition; [A1](#src-a1)
- Identity: Job-number continuity is explicitly established through description changes until collection. Number uniqueness across branches, reuse after collection, and any further identity rules are unspecified.

### concept-bike
- Kind: concept
- Name: Bike
- Meaning: The physical bike dropped off, inspected, potentially repaired, and collected under a job.
- Evidence: reported; definition; [A1](#src-a1), [A4](#src-a4), [A5](#src-a5)

### concept-quote
- Kind: concept
- Name: Quote
- Meaning: Prepared by the mechanic after inspection and a parts availability check; the customer may accept or decline it. Price calculation, contents, revisions, and quote identity are not described.
- Evidence: reported; definition; [A2](#src-a2), [A4](#src-a4), [A5](#src-a5)

### rel-job-bike
- Kind: relationship
- Name: Each job is for one bike
- Meaning: Every job in the described scope concerns exactly one bike. The number of jobs a bike can have is unspecified.
- Evidence: reported; definition; [A1](#src-a1)
- From: [Job](#concept-job)
- To: [Bike](#concept-bike)
- Relation: is-for
- Cardinality: Exactly one bike per job; reverse cardinality unknown.

### rel-customer-jobs
- Kind: relationship
- Name: A customer can have several jobs
- Meaning: Several jobs may belong to the same customer. No upper limit or number of customers per job is established.
- Evidence: reported; definition; [A1](#src-a1)
- From: [Customer](#actor-customer)
- To: [Job](#concept-job)
- Relation: has-jobs
- Cardinality: Multiple jobs per customer are allowed; minimum and reverse cardinality unspecified.

### state-ready
- Kind: state
- Name: Ready
- Meaning: A repaired bike can be collected. “Ready” does not mean the job is paid. Whether an unrepaired bike has a special collection status is unknown.
- Evidence: reported; definition; [A5](#src-a5)
- Subject: [Bike](#concept-bike)
- Entered through: [Mark ready](#action-mark-ready)

## Actions and constraints

The inventory's presentation order is not a universal execution trace. General prerequisites are stated explicitly; the ordinary scenario supplies a particular reported trace.

### action-open-ticket
- Kind: action
- Name: Open a job ticket
- Meaning: At bike drop-off, reception opens the ticket for the job.
- Evidence: reported; practice; [A1](#src-a1)
- Actor: [Reception](#actor-reception)
- Subject: [Job](#concept-job)
- Trigger: Bike drop-off, the start boundary of this capture.

### action-inspect
- Kind: action
- Name: Inspect the bike
- Meaning: After the ticket is opened, the mechanic inspects the bike before preparing the quote.
- Evidence: reported; practice; [A2](#src-a2)
- Actor: [Mechanic](#actor-mechanic)
- Subject: [Bike](#concept-bike)
- Applicable rule: [Quote prerequisites](#rule-quote-prerequisites)

### action-check-parts
- Kind: action
- Name: Check parts availability
- Meaning: After the ticket is opened, the mechanic checks whether parts are available before preparing the quote. The effect of unavailable parts is not established.
- Evidence: reported; practice; [A2](#src-a2)
- Actor: [Mechanic](#actor-mechanic)
- Applicable rule: [Quote prerequisites](#rule-quote-prerequisites)

### action-prepare-quote
- Kind: action
- Name: Prepare the quote
- Meaning: The mechanic prepares the quote once both inspection and the parts availability check have been completed.
- Evidence: reported; practice; [A2](#src-a2)
- Actor: [Mechanic](#actor-mechanic)
- Output: [Quote](#concept-quote)
- Applicable rule: [Quote prerequisites](#rule-quote-prerequisites)

### rule-quote-prerequisites
- Kind: rule
- Name: Inspection and parts check before quote preparation
- Meaning: Ticket opening precedes both inspection and the parts check. Both checks must be done before quote preparation. This establishes two prerequisites, not that parts must be available, not an order between the checks, and not permission or a requirement to run them concurrently.
- Evidence: reported; practice; [A2](#src-a2)
- Applies to: [Open ticket](#action-open-ticket), [inspect](#action-inspect), [check parts](#action-check-parts), [prepare quote](#action-prepare-quote)
- Gap: [General check ordering](#q-check-order)

### action-decide-quote
- Kind: action
- Name: Accept or decline the quote
- Meaning: The customer accepts or declines the prepared quote. The ordinary case reports acceptance; the declined-quote account describes collection without repair.
- Evidence: reported; practice; [A4](#src-a4), [A5](#src-a5)
- Actor: [Customer](#actor-customer)
- Subject: [Quote](#concept-quote)
- Policy: [Acceptance before repair](#rule-accept-before-repair)
- Branch: Decline leads to [arranging collection without repair](#action-arrange-unrepaired-collection).

### action-repair
- Kind: action
- Name: Repair the bike
- Meaning: The mechanic repairs the bike. The ordinary case has acceptance first; some reported practice has repair before customer acceptance is sought.
- Evidence: reported; practice; [A3](#src-a3), [A4](#src-a4)
- Actor: [Mechanic](#actor-mechanic)
- Subject: [Bike](#concept-bike)
- Applicable accounts: [Stated policy](#rule-accept-before-repair), [early-repair practice](#rule-early-repair-practice)

### rule-accept-before-repair
- Kind: rule
- Name: Quote acceptance must precede repair under written policy
- Meaning: The practitioner reports that written policy requires the customer to accept the quote before repair starts. The policy document itself was not inspected, and no policy exception is established.
- Evidence: reported; policy; [A3](#src-a3)
- Applies to: [Quote decision](#action-decide-quote), [repair](#action-repair)
- Different practice: [Some repairs precede acceptance](#rule-early-repair-practice).

### rule-early-repair-practice
- Kind: rule
- Name: Some small faults for regular customers are repaired first
- Meaning: In reported practice, the mechanic sometimes repairs a small fault for a regular customer and asks the customer afterward. This conflicts with the stated required sequence but is not evidence of an authorized policy exception. The exact request made afterward and the timing of quote preparation in these cases are not elaborated.
- Evidence: reported; practice; [A3](#src-a3)
- Applies to: [Repair](#action-repair), [quote decision](#action-decide-quote)
- Gaps: The meaning of “small,” exception permission, and the detailed path are [unresolved](#q-early-repair).

### action-mark-ready
- Kind: action
- Name: Mark the bike ready
- Meaning: In the ordinary case, the mechanic marks the repaired bike ready after repairing it.
- Evidence: reported; practice; [A4](#src-a4)
- Actor: [Mechanic](#actor-mechanic)
- Outcome: [Ready](#state-ready)

### action-notify
- Kind: action
- Name: Notify the customer
- Meaning: Reception notifies the customer after readiness in the ordinary case. The timing of readiness notices more generally is disputed.
- Evidence: reported; practice; [A4](#src-a4)
- Actor: [Reception](#actor-reception)
- Recipient: [Customer](#actor-customer)
- Timing: disputed; practice; [A6](#src-a6); [immediate account](#rule-notify-immediate), [end-of-day account](#rule-notify-batch).

### rule-notify-immediate
- Kind: rule
- Name: Mechanic's account of immediate readiness notices
- Meaning: The mechanic reportedly said reception notifies customers as soon as the mechanic marks the bike ready. This account is unresolved alongside reception's different account.
- Evidence: reported; practice; [A6](#src-a6); mechanic's statement relayed by the interviewee, not independently inspected.
- Applies to: [Mark ready](#action-mark-ready), [notify customer](#action-notify)
- Conflicting account: [End-of-day notices](#rule-notify-batch)

### rule-notify-batch
- Kind: rule
- Name: Reception's account of end-of-day readiness notices
- Meaning: Reception reportedly said readiness notices are sent together at the end of the day. Whether the two accounts describe different days or other conditions is unknown.
- Evidence: reported; practice; [A6](#src-a6); reception's statement relayed by the interviewee, not independently inspected.
- Applies to: [Notify customer](#action-notify)
- Conflicting account: [Immediate notices](#rule-notify-immediate)

### action-arrange-unrepaired-collection
- Kind: action
- Name: Arrange collection without repair
- Meaning: If a customer declines the quote, reception arranges collection without repair. Whether a special status is recorded is unknown.
- Evidence: reported; practice; [A5](#src-a5)
- Actor: [Reception](#actor-reception)
- Trigger: Customer declines the [quote](#concept-quote).
- Intended outcome of this existing activity: [Customer collection](#action-collect) without repair.

### action-collect
- Kind: action
- Name: Collect the bike
- Meaning: The customer picks up the bike, ending the scoped process. Collection of a repaired bike is reported in the ordinary case; collection without repair is the outcome reception arranges after a declined quote. No payment prerequisite or payment workflow is established.
- Evidence: reported; practice; [A1](#src-a1), [A4](#src-a4), [A5](#src-a5)
- Actor: [Customer](#actor-customer)
- Subject: [Bike](#concept-bike)

## Concrete cases and consequential exceptions

### scenario-ordinary
- Kind: scenario
- Name: Yesterday's ordinary repaired-bike job
- Meaning: Reception [opened the ticket](#action-open-ticket); the mechanic [inspected](#action-inspect), [checked parts](#action-check-parts), and [prepared the quote](#action-prepare-quote); the customer [accepted](#action-decide-quote); the mechanic [repaired](#action-repair) and [marked ready](#action-mark-ready); reception [notified](#action-notify); the customer [collected](#action-collect).
- Evidence: reported; practice; [A4](#src-a4)
- Status: Reported case, complete from intake to collection. “Yesterday” is relative to the undated supplied interview; no calendar date is inferred.
- Rules illustrated: [Both checks before quote](#rule-quote-prerequisites), [acceptance before repair policy](#rule-accept-before-repair).
- Limits: Inspection preceded the parts check only in this case. Notification timing beyond its place in this case's sequence was not supplied. No payment behavior is implied.

### scenario-declined
- Kind: scenario
- Name: Declined quote and collection without repair
- Meaning: Following ticket opening and quote preparation with its two prerequisite checks, a customer [declines](#action-decide-quote). Reception [arranges collection without repair](#action-arrange-unrepaired-collection). The scoped outcome is customer [collection](#action-collect) of the unrepaired bike; the arrangement mechanics and status label are not described.
- Evidence: reported; practice; [A1](#src-a1), [A2](#src-a2), [A5](#src-a5)
- Status: Reported general branch account, not a specific observed or reported completed case. Broad trigger and outcome are established; intermediate collection details and status remain incomplete.
- Limits: The relative order of inspection and parts check is unspecified. Do not assign [ready](#state-ready) to this branch or add repair, payment, or an invented status.

### scenario-early-repair
- Kind: scenario
- Name: Repair before asking a regular customer
- Meaning: For some small faults involving regular customers, the mechanic [repairs](#action-repair) and asks the customer afterward, contrary to the [stated policy sequence](#rule-accept-before-repair).
- Evidence: reported; practice; [A3](#src-a3)
- Status: Partial reported exception pattern. There is no complete trigger-to-collection example: fault threshold, authority, quote timing, customer response, and subsequent handling are unknown.
- Applicable account: [Early-repair practice](#rule-early-repair-practice).

## Important questions for resumption

These are saved questions, not new requests to the stopped interviewee. Resolve only if and when capture resumes. The next useful question is the one in [early-repair boundaries](#q-early-repair), because it affects the policy/practice distinction and a consequential exception.

### q-early-repair
- Kind: question
- Name: What governs repair before acceptance?
- Meaning: “Small,” permission for the practice, and the detailed early-repair path are unknown. The interviewee explicitly does not know the threshold or who permits it.
- Evidence: unknown; practice; [A3](#src-a3)
- Affected: [Early-repair practice](#rule-early-repair-practice), [partial exception scenario](#scenario-early-repair)
- Consequence: Cannot treat this as an authorized policy exception or describe its eligibility and outcomes reliably.
- Needed source: A recent example from a mechanic who performed such work, plus the actual written policy and whoever is responsible for interpreting it; those people and access are not yet identified or authorized for outreach.
- Next question: On resumption, ask someone with firsthand knowledge: “Can you walk through a recent small-fault job repaired before asking the customer, including how the decision was made?”

### q-notification-timing
- Kind: question
- Name: When are readiness notices sent?
- Meaning: The immediate and end-of-day accounts conflict; neither is preferred. Whether differing days or conditions explain them is unknown.
- Evidence: disputed; practice; [A6](#src-a6)
- Affected: [Immediate account](#rule-notify-immediate), [end-of-day account](#rule-notify-batch), [notification](#action-notify)
- Consequence: Cannot assign one universal notification delay or batching rule.
- Needed source: Mechanic and reception accounts tied to the same recent cases, with readiness and notice records if available and authorized.
- Next question: “What happened between marking ready and sending the notice for the same recent job?”

### q-check-order
- Kind: question
- Name: Relative order of inspection and parts check
- Meaning: Whether inspection or the parts check generally comes first, or whether they can overlap, is unknown. The ordinary case does not establish a general rule.
- Evidence: unknown; practice; [A2](#src-a2), [A4](#src-a4)
- Affected: [Quote prerequisites](#rule-quote-prerequisites), [inspection](#action-inspect), [parts check](#action-check-parts)
- Consequence: A process view must preserve both prerequisites without imposing serial order or concurrency.
- Needed source: Mechanic with knowledge of the working constraints and contrasting cases.
- Next question: “What determines when you inspect the bike and when you check parts?”

### q-declined-status
- Kind: question
- Name: Status and arrangements for collection without repair
- Meaning: A special status after quote decline is unknown; the collection-arrangement steps are not described.
- Evidence: unknown; practice; [A5](#src-a5)
- Affected: [Arrange collection without repair](#action-arrange-unrepaired-collection), [declined branch](#scenario-declined)
- Consequence: Do not reuse “ready” or invent a status or collection-notification sequence for this branch.
- Needed source: Reception and a declined-quote job ticket, if available and authorized.
- Next question: “For a recent declined quote, what did reception do and record to arrange collection?”

### q-unavailable-parts
- Kind: question
- Name: What follows unavailable parts?
- Meaning: The account requires checking parts before quoting, but does not state what happens when parts are unavailable.
- Evidence: unknown; practice; [A2](#src-a2)
- Affected: [Parts check](#action-check-parts), [quote preparation](#action-prepare-quote)
- Consequence: Cannot infer a wait, purchasing step, rejection, substitution, or rule that only available parts can be quoted.
- Needed source: Mechanic with a recent unavailable-parts example.
- Next question: “What happened on a recent job when the parts check found something unavailable?”

## Sources

### src-a1
- Kind: source
- Name: Scope and job continuity
- Locator: workshop-interview.md, supplied answer A1 — Scope.

### src-a2
- Kind: source
- Name: Quote preparation prerequisites
- Locator: workshop-interview.md, supplied answer A2 — Preparing a quote.

### src-a3
- Kind: source
- Name: Acceptance policy and differing practice
- Locator: workshop-interview.md, supplied answer A3 — Policy and practice.

### src-a4
- Kind: source
- Name: Ordinary completed case
- Locator: workshop-interview.md, supplied answer A4 — Main case.

### src-a5
- Kind: source
- Name: Declined quotes and ready definition
- Locator: workshop-interview.md, supplied answer A5 — Declined quotes.

### src-a6
- Kind: source
- Name: Conflicting notification accounts
- Locator: workshop-interview.md, supplied answer A6 — Conflicting notification accounts.

### src-a7
- Kind: source
- Name: Stop request and tentative future idea
- Locator: workshop-interview.md, supplied answer A7 — Stopping and tempting future idea.

## Revision and review note

Revision 1: Initial saved capture from supplied answers A1–A7. No earlier revision or user accuracy confirmation exists. The ordinary case and consequential declined-quote and early-repair branches were replayed against their cited answers. No diagram was needed, avoiding unsupported ordering or state edges. No software design, improvement recommendation, external research, or outreach is part of this capture.

Accuracy review is deferred because the user asked to stop. If the user resumes and wishes to review, ask: “Does this faithfully describe the process, or is anything important wrong or missing?” Agreement remains draft until an affirmative answer; any such answer would not itself resolve the recorded unknowns.
