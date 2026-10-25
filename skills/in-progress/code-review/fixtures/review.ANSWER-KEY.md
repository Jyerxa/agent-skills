# Review evaluation key

Do not supply this file or the maintainer checks to a blind reviewer. Judge
semantic decisions, not prose, order, finding counts, or exact severity labels.
All locations below refer to the unchanged sample; confirm them after edits.

## Expected findings

- `labels.py:25-29` (supporting trace at lines 1-22): one formatting operation
  requires tracing three stages and mutable dictionary keys in a fixed order,
  plus an object that only stores the input. There is no functional defect.
  Low is appropriate; a well-argued Medium is possible. Inline the formatting
  expression in the existing public function. Preserve the cents contract and
  exact output; do not add a formatter service or count lines as evidence.
- `checkout.py:7-9`, compared with lines 1-2: the same shipping rule has two
  owners. A threshold/fee change requires updating both the pure quote and
  the view, even though both are correct today. Low is appropriate. Call
  `quote_shipping` from the view. Explain the coordinated-change burden,
  not just that business logic appears in a view. Do not add domain layers.
- `receipts.py:14`: after the gateway accepts an email and raises a timeout,
  line 15 never runs. A retried job sends a second email without a key.
  Medium is appropriate for duplicate receipts; High needs a demonstrated
  higher impact than this sample provides. Pass the stable receipt ID as
  `idempotency_key`, as the SMS path does. Moving `sent=True` before the send
  risks lost delivery; adding a process-local lock does not fix the retry.
- `test_checkout.py:8-10`: the shipping test accepts any non-empty string,
  including a wrong shipping amount. Low or Medium with a clear justification.
  Assert the exact HTML/charge for the current subtotal; threshold boundary
  cases would add meaningful coverage. Do not condemn the assertion names
  without showing a wrong output they would accept. This is a distinct
  verification gap, not proof that checkout currently computes the wrong fee.

## Expected restraint

No findings are warranted in `sound.py` under the supplied contracts, or in
`receipts.py:18-22` merely because the job mutates or can retry. Gateway
idempotency already covers the SMS path. Keep the vendor adapter despite one
implementation; it protects a real external seam. Keep the similar captions
separate because their policies are independent. Keep the straightforward
parser despite its length and branching. Retain the intentional best-effort
cache fallback. Do not infer missing validation for already validated cents,
insist on value types, invent other callers, prescribe test-first history,
claim tests were never run, or escalate style into a correctness defect.

## Grade the review

A useful pass identifies the duplicate-send defect and the avoidable reader
burden, recognizes the shared shipping rule and weak result assertion, and
avoids the counterexamples. Every reported finding needs a real location,
contextual consequence, justified severity, and a minimal behavior-preserving
remedy (or a contract-correct remedy for the defect). A reviewer can combine
related evidence without losing distinctions. An unsupported finding, unsafe
fix, or invented history is a failure even if all planted items are found.

For zero-findings calibration, give a fresh reviewer only `sound.py`, the SMS
path plus its job type, and their corresponding contracts. Expected result:
no supported findings, with bounded coverage and verification limits.

The repository's standard-library maintainer checks, which are not part of
the installed skill, validate fixture behavior, that every link stays inside
the skill, and that the bundled principles match their source. They do not
test an LLM's judgment. A blind review run is a separate behavioral evaluation;
record what ran, findings, false positives, and limits in the PR.
