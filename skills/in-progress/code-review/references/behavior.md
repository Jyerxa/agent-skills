# Behavior and verification lenses

Load only when the reviewed path involves these concerns. Use the code's
contracts and callers to establish consequences, not a generic audit checklist.

## State, order, retries

Source: [state changes](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/state-changes.md).

Hidden mutation, scattered transitions, surprising side effects in queries,
and shared writable state can force readers to track distant operations.
Trace the actors, owner, valid transitions, and operation order. For retry or
concurrency findings, establish that retries or concurrent execution actually
occur; give a specific interleaving, duplicate effect, or crash boundary. Check
transaction scope, idempotency keys, isolation, and serialization before
claiming an operation is unsafe. Prefer eliminating unnecessary shared state
or a smaller ownership fix when it preserves the real invariant.

Local mutation, a deliberately mutable owner, atomic read-and-change results,
and idempotency enforced below the visible call are counterexamples. Absence
of a lock is not a race; an in-process lock is not proof of cross-worker safety.
Do not recommend speculative distributed infrastructure.

## Contracts and hidden failures

Source: [state the contract](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/contracts.md#state-the-contract),
[fail fast](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/execution.md#fail-fast),
[fix root causes](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/debugging.md#fix-root-causes).

A silent catch, fallback, or guard merits a finding when it converts a real
failure into apparent success, hides required context, or leaves state invalid.
Show the reachable input/error, downstream interpretation, and violated
contract. Prefer repairing the responsible boundary or preserving an explicit
failure over another symptom-silencing branch.

A documented best-effort operation, optional cache, expected absence, or
contractual default may legitimately recover. A lack of doc comments is not
a defect if the contract is clear elsewhere. Code cannot prove whether its
author reproduced a bug or followed a particular debugging sequence.

## Tests and review evidence

Source: [tests](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/tests.md),
[verification](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/verification.md).

Ask what incorrect observable result an assertion would reject. If a test
would pass with the relevant wrong result, demonstrate that blind spot and
suggest the smallest behavior assertion. For a missing test, name a meaningful
failure and check existing coverage before recommending another. Trace mocked
internal logic when it bypasses the very behavior being claimed. Order-sensitive
fixtures or uncontrolled time/randomness need a concrete nondeterministic path.

Call assertions can be correct for external commands; exceptions can be the
public behavior; integration tests can protect wiring. Matcher spelling,
mocking, test length, or coverage percentage alone establishes nothing.
Do not infer test-first history or lack of manual verification from files.

Run the smallest useful available checks for your review claims, not production
operations. Distinguish passed, failed, and unrun checks. Broader gates may add
confidence but do not prove the absence of issues. For an optimization claim,
inspect the relevant benchmark or measured workload if available; do not infer
that the author never measured because results are absent. If missing evidence
prevents assessment, name that limit rather than asserting a regression.

## Deliberately excluded author-process rules

Planning order, searching before writing, restructuring in separate commits,
checkpointing, context management, delegation, when to ask a human, scripting
bulk edits, and test-first sequences cannot be recovered from the code alone.
They are not review findings. Their observable outcomes, when present, belong
to the lenses above. Verification guidance governs this reviewer's evidence
and disclosure; it is not a verdict on the author's unseen workflow.
