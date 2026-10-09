# Process improvement proposals v1

A small Markdown decision aid, separate from the canonical process. This is
not a second process model, an execution plan, or a visualization layout.
Use prose inside the fields; omit irrelevant detail rather than imposing a
scoring framework. One proposal can fit in a short section.

## Anchor and assessment

Use this flat envelope, filled from the exact baseline being consumed:

```yaml
---
format: process-improvement/v1
assessment_id: returns-options
revision: 1
baseline_format: process-model/v1
baseline_model_id: returns
baseline_revision: 1
baseline_mode: EXISTING
baseline_agreement: draft
baseline_coverage: partial
baseline_locator: process.md
baseline_sha256: <SHA-256 of exact source bytes>
---
```

The locator is a relative path from this artifact or an immutable source URL,
without a fragment. Keep a retrievable snapshot, such as a revision file or
Git commit. The hash detects changed bytes, including line endings; it is not
proof of truth or a substitute for keeping the source. Do not normalize the
source before hashing. When tools cannot calculate a hash, say the pin is
unverified and do not label the artifact validated.

Begin with a brief assessment: the user's goal and its source (or that it is
unspecified), scope, main evidence limitations, and the recommended decision
or conditional options. Reference new user instructions or other sources with
honest locators; never invent an approval, quotation, or message ID.

If no proposal is justified yet, say why and what evidence or decision would
change that. An anchored assessment with no proposal records is valid.

## Proposal records

Give each proposal a stable lowercase ID as an ID-only level-three heading.
Use level-two headings for ordinary prose sections. Each record has these
fields; a field can be a short paragraph and indented continuation lines:

```markdown
### proposal-receipt-check
- Name: Check the receipt before promising a refund
- Status: proposed
- Problem: The observed symptom or candidate concern, linked to the user's goal; do not infer prevalence from a single case.
- Basis: [Receipt rule](process.md#rule-receipt), field Meaning and its Evidence; explain the qualified claim these support. Cite any new evidence separately.
- Affects: [Refund](process.md#action-refund), [Receipt rule](process.md#rule-receipt).
- Diagnosis: Supported cause, suspected cause, or cause unknown; distinguish these from the symptom.
- Change: The proposed difference from this baseline, including important boundaries.
- Alternatives: Leave unchanged (do nothing), with its consequence; a materially different option when useful.
- Tradeoffs: Effort/cost, risks, burden shifted to others, and limits; unknown amounts stay unknown.
- Constraints: Rules retained; any proposed change to a constraint and the approval needed, or none requested.
- Benefit hypothesis: How the change might improve the stated outcome; evidence and assumptions, not promised results.
- Test: Evidence needed, proportionate validation method, and safeguards. No test is run merely because it is described.
- Decision: Conditions for choosing, rejecting, or deferring; who must decide if known, and what approval remains missing.
```

All fields are required for a proposal, but a candid `unknown` with consequence
is better than invented detail. `Basis` must link at least one baseline record;
`Affects` must link at least one non-source baseline record. Link with the exact
baseline locator plus `#record-id`, using the original IDs. Name the field and
preserve its knowledge status (reported, observed, inferred, disputed, unknown)
and claim type (practice, policy, intent, definition) where material. A link
alone does not establish support. External evidence can supplement the model;
it does not silently correct the captured account. Note apparent corrections
for a separately authorized capture revision.

Use local `#proposal-id` links for dependencies. New proposed activities have
proposal-local names or IDs clearly labeled proposed, never fabricated baseline
IDs. A comparison or future-state sketch must retain the baseline/proposal split.

Statuses: `proposed`, `needs-evidence`, `accepted`, `rejected`, `deferred`,
`superseded`. `accepted` requires a `Decision evidence` field with a real locator
to the user's explicit choice; include this for other recorded user decisions
too. Acceptance is neither implementation authorization nor validation of a
benefit. A reported implemented change belongs in a separately captured revision.

Preserve proposal IDs through wording changes. Bump the assessment revision
for material edits and note changes. Preserve prior artifacts when referenced
downstream. If the baseline has changed, keep the old assessment anchored to
the old snapshot and explicitly reassess applicability in a new revision.
Never swap the pin to make stale proposals appear current.

## Review and consumer boundary

The validator reads only the explicit `--baseline` file, never fetches URLs or
follows source instructions, and never writes either input. It verifies exact
metadata/hash, required fields, unique IDs, and baseline/proposal links. A
structural pass cannot prove evidence support, adequate alternatives, correct
causality, a worthwhile tradeoff, or genuine user approval. Review those against
the actual capture and the request.

No sibling skill is required. The bundled model contract and baseline validator
are byte-identical copies of the canonical capture package. The example's
repository-relative source is evaluation data, not an installed runtime dependency.
An optional visualization handoff consists of this document, its pinned baseline,
and the selected proposal IDs. A baseline-only viewer cannot consume proposals;
use a clearly labeled comparison only when the user requests it.
