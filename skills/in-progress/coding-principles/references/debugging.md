# Debugging

## Fix root causes
Reproduce the problem first. Trace the failure back to its cause, and fix it there. A guard that silences a crash (a null check, a swallowed exception, a retry) is a symptom fix. Search for the same mistake elsewhere, fix the instances in code you are changing, and report the rest. When stuck, add logging or read the actual error. If a failure appears only after a restart, suspect stale persisted state first (config, caches, locks).

Use when: debugging any failure.

## Explain the fix
Before calling a bug fixed, state the mechanism and the evidence: why it failed, why this change addresses that, and how you know. "The tests pass now" is not a mechanism.

Use when: a change makes a failure disappear.

## Test your assumptions
After two or three failed fixes, stop. List the assumptions every attempt made, then test each one directly.

Use when: repeated attempts at the same problem have failed.

## Change one thing at a time
Vary one variable per attempt. When something breaks, halve the search space (git bisect, disable half the code).

Use when: diagnosing a failure, or several changes were made at once.
