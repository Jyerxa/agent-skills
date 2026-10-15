# Tests

Each test costs maintenance. Write one only when it can catch a failure.

## Write tests to defend logic
Write a test for logic worth protecting: branching, calculations, state transitions, parsing, and edge cases. Name the failure it would catch. If you cannot name one, do not write it.

Use when: deciding whether to add a test.

## Skip these tests
Do not test trivial code (getters, pass-throughs, wiring), library or framework behavior, constants and config values, anything the type system enforces, or cases existing tests already cover.

Use when: about to add a test for any of these.

## Test behavior, not implementation
Call the code the way its users do and assert the exact result they see. Rewrite any test you wrote or are changing that would still pass if the function returned nothing or a wrong value. Report weak tests elsewhere. Weak tests include loose assertions (`toBeDefined`, `not.toThrow`), call-only checks (`toHaveBeenCalled`), expected values computed by the code under test, restated constants, and assertions on data the test built itself.

Use when: writing, changing, or keeping a test.

## Add a regression test for each bug
Reproduce the bug in a failing test before the fix, and keep the test after. Write the failing test first for logic-heavy changes too. Do not use test-first as a blanket rule.

Use when: fixing a bug or changing complex logic.

## Mock only at boundaries
Mock external services, time, and randomness. Do not mock your own code. If setup outweighs assertions, the test is wrong. Prefer a simple fake to asserting that a mock was called.

Use when: reaching for a mock.

## Keep each test small and deterministic
Test one behavior per test and name it for that behavior. Tests run independently, in any order, with the same result every time. Find and fix the cause of a flaky test. Do not add retries, and do not delete it without asking.

Use when: writing or debugging a test.

## Test at the level of the behavior
Use unit tests for logic and an integration test for how components connect. Confirm the intent by running the real thing.

Use when: choosing what kind of test to write.
