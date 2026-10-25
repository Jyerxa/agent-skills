# Behavior and verification lenses

Load this file only when the reviewed code involves these concerns. Establish
consequences from the code's contracts and callers, not from a generic audit
checklist.

## State, order, and retries

Principles: [state changes](principles.md#state-changes).

Hidden mutation, scattered transitions, surprising side effects in queries, and
shared writable state can force readers to track distant operations. Trace the
actors, the owner, the valid transitions, and the order of operations. For a
retry or concurrency finding, establish that retries or concurrent execution
happen, and give a specific interleaving, duplicate effect, or crash boundary.
Check transaction scope, idempotency keys, isolation, and serialization before
claiming an operation is unsafe. Prefer removing unnecessary shared state, or a
smaller ownership fix, when either preserves the real invariant.

Local mutation, a deliberately mutable owner, an operation that atomically
returns what it changed, and idempotency enforced below the visible call are
counterexamples, not findings. A missing lock is not a race, and an in-process
lock does not prove safety across workers. Do not recommend speculative
distributed infrastructure.

## Contracts and hidden failures

Principles: [state the contract](principles.md#state-the-contract),
[fail fast](principles.md#fail-fast),
[fix root causes](principles.md#fix-root-causes).

A silent catch, fallback, or guard merits a finding when it turns a real failure
into apparent success, hides required context, or leaves state invalid. Show the
reachable input or error, how downstream code interprets the result, and the
violated contract. Prefer repairing the responsible boundary, or keeping an
explicit failure, over adding another branch that hides the symptom.

A documented best-effort operation, an optional cache, an expected absence, or a
contractual default may recover by design. Missing doc comments are not a defect
if the contract is clear elsewhere. Code cannot show whether its author
reproduced a bug or followed a particular debugging sequence.

## Tests and review evidence

Principles: [tests](principles.md#tests),
[verification](principles.md#verification).

Ask what incorrect observable result an assertion would reject. If a test would
pass with the relevant wrong result, demonstrate the gap and suggest the
smallest assertion on behavior. For a missing test, name a meaningful failure
and check existing coverage before recommending another. Trace mocked internal
logic when it bypasses the behavior the test claims to cover. A finding about
order-sensitive fixtures, or uncontrolled time or randomness, needs a concrete
nondeterministic path.

Asserting that a call happened can be correct for external commands, an
exception can be the public behavior, and integration tests can protect wiring.
Matcher spelling, mocking, test length, or coverage percentage alone establishes
nothing. Do not infer test-first history or a lack of manual verification from
the files.

Run the smallest useful checks available for your review claims. Do not run
production operations. Report which checks passed, which failed, and which you
did not run. Broader gates add confidence but do not prove the code has no
issues. For an optimization claim, inspect the relevant benchmark or measured
workload if one exists. Absent results do not show that the author never
measured. If missing evidence prevents an assessment, name that limit instead
of asserting a regression.

## Excluded author-process rules

The code alone cannot show planning order, searching before writing,
restructuring in separate commits, checkpointing, context management,
delegation, when the author asked a human, scripting of bulk edits, or a
test-first sequence. None of these is a review finding, and
[principles](principles.md) leaves them out. Their observable outcomes, when
present, belong to the lenses above. The verification principles govern your
own evidence and disclosure as the reviewer. They are not a verdict on the
author's unseen workflow.
