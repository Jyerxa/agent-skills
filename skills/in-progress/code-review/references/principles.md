# Principles

The lenses cite these principles by name. Each one is written as an
instruction to whoever writes the code. In a review, apply a principle only
through the evidence its lens asks for. A principle tells you where to look;
a mismatch with it is not a finding by itself. Read only the entries a lens
cites.

## Simplicity

### Minimize reader load
Minimize what a reader must hold in mind: hidden mutable state, control flow hidden in conventions or reflection, and layers that add no behavior. Judge by what the reader must track, not by line count.

### Design for the least code
Use the simplest design that meets the stated need. When a design needs special cases or extra layers, look for a simpler shape. Add no patterns or extension points for future needs.

### Redesign when the design stops fitting
When you add or change a requirement, compare the current design with the one you would have built had the requirement existed from the start. If they differ and the redesign is simpler overall, redesign. Do not add a special case to the old design. If the redesign reaches beyond the module you are changing, say so before starting.

### Subtract before you add
Before adding code for a change, ask what the change lets you remove: code the new requirement makes unnecessary, and dead paths, strings, config, and tests with no references. Then ask whether deleting the whole block and rewriting it is simpler than adding to it. If so, rewrite it. If a removal breaks something, restore it on purpose. If you cannot tell whether code is dead, leave it and report it.

### One source for each fact
Keep one source of truth for each piece of knowledge, such as a rule, constant, or schema. Do not merge code that only looks alike. If two blocks change for different reasons, keep them separate.

### Keep necessary complexity in one place
When complexity cannot be removed, put it inside the module that owns it so callers stay simple. Do not push it onto every caller through options, ordering rules, or setup steps.

### Pure logic, thin wiring
Whenever possible, keep business logic in pure functions and framework wiring thin, so you can test the logic without the framework.

## Deep modules

### Make modules deep
A module's interface should be much simpler than what it does. Warning signs: a wrapper that only forwards calls, a class whose methods mirror its fields, a signature as long as the body. Fix these by giving the module more responsibility behind fewer entry points.

### Hide information
Keep decisions that may change (format, storage, algorithm, vendor) private to one module. Callers use behavior, not representation. Do not re-export transport, storage, or framework types through the public interface.

### Tell, do not ask
Tell an object what to do. Do not read its data, decide outside, and write the result back. Prefer `account.withdraw(n)` to reading the balance and calling `setBalance`.

### Validate at the edge, trust the inside
Parse and validate input once at the boundary (CLI, config, network, external APIs) into typed domain values. Inside, trust those types and do not re-check. Trust holds only where types enforce the guarantee.

### Group by one reason to change
Group code by one body of domain knowledge or one reason to change. Do not group by execution order (load, validate, transform, save), because phase-named modules repeat the same rules in every step. Do not make one class per method either.

### Compose, do not inherit
Build behavior by combining small pieces. Use inheritance only for a true is-a relationship with a stable base.

## Contracts

### State the contract
For each public function, write its preconditions, postconditions, and invariants in the signature or a doc comment. Enforce them with types first, then checks at the boundary.

### Expose less
Callers come to rely on anything observable. Return only what callers need. Do not expose internals, extra fields, or incidental ordering.

### Add an interface only at a real seam
Introduce an interface or abstraction only at a real seam: an external system, a boundary you test across, or a second implementation that exists today. Otherwise call the concrete code.

### Define the contract before both sides
When two components must talk, define the shared type, schema, or interface first, with one source of truth. Then implement each side against it. Do not write one side first and then force the other to fit with adapters.

## Domain modeling

### Model the domain
Encode the real rules in a data structure, not in scattered conditionals. Use a typed model for loose parameters, and a map or discriminated union for branching spread across files. Add the structure when an if/else chain gains a branch with each feature, or two booleans must stay in sync. Skip it when the code is clear, local, and unlikely to grow.

### Make illegal states impossible
Encode the rules in the types. Use sum types or enums with payloads, not optional fields that allow contradictions (`done: true` with no date). Parse external data into types at the boundary. Fix the model instead of casting. Derive types from an authoritative schema when one exists. Strengthen a type where a runtime assertion shows it is too weak, then stop. In dynamic languages, use schemas.

### Replace primitives with value types
When two arguments of the same primitive type can be swapped by mistake (two string IDs), or a value has validation or rounding rules (money, emails), wrap it in a small immutable type that validates on creation and compares by value. Do not wrap a primitive that has one meaning and no rules. Entities have identity; values do not.

### Keep invariants in one place
Put each rule that must always hold in one place, and route every change through it. Keep state private and expose operations (`order.cancel()`), not getters and setters that wrap a field. A setter that only assigns protects nothing.

## Hygiene

### Finish the migration
Aim a refactor at the target design, not an intermediate compatibility state. When you replace an internal API, migrate every caller you can find, delete the old API, and update the tests that call it. If a caller is outside the repo or unknown, keep the old API marked deprecated and report it.

### Name for intent
Name things with the domain's terms, and give one concept one name. Names say what a thing is or does. Replace magic numbers with named constants.

### Comment the why
Code shows what happens. A comment records why: a constraint, a trade-off, or a surprise. Delete comments that restate the code. If a workaround needs a paragraph to justify it, fix the code.

### Leave no scratch behind
Before finishing, delete the debug output, temp files, commented-out code, and unused code that you added. Leave older code alone. Keep a TODO only if it states a reason.

### Let tools enforce style
Run the project's formatter and linter. Do not style by hand.

## State changes

### Prefer immutable data
Return new values instead of mutating shared ones. Mutate only inside a function's own scope or in an owner designed for it.

### Make transitions explicit
Model state changes as named operations that reject invalid transitions. Do not scatter assignments.

### Separate commands from queries
Make a function either change state or return data. The exception is an operation that must return what it atomically changed.

### Make operations idempotent
Make an operation safe to run twice, or after a crash partway through, when it retries, restarts, or runs unattended. Use upserts, deterministic IDs, checks inside the transaction, and write-to-temp then rename.

### Remove sharing before adding locks
When concurrent actors might write the same file, branch, key, or object, first give each its own and merge at read time. Serialize (lock, single writer, compare-and-swap) only when one shared target is a real invariant. If you need a lock, first check whether each actor can have its own copy. Telling a subagent not to touch another agent's files does not prevent conflicts.

## Errors

### Fail fast
Raise a problem where it happens, with context about what was being attempted. Do not write empty catch blocks or silent defaults that hide a real failure.

### Fix root causes
Reproduce the problem first. Trace the failure back to its cause, and fix it there. A guard that silences a crash (a null check, a swallowed exception, a retry) is a symptom fix. Search for the same mistake elsewhere, fix the instances in code you are changing, and report the rest. When stuck, add logging or read the actual error. If a failure appears only after a restart, suspect stale persisted state first (config, caches, locks).

## Tests

### Write tests to defend logic
Write a test for logic worth protecting: branching, calculations, state transitions, parsing, and edge cases. Name the failure it would catch. If you cannot name one, do not write it.

### Skip these tests
Do not test trivial code (getters, pass-throughs, wiring), library or framework behavior, constants and config values, anything the type system enforces, or cases existing tests already cover.

### Test behavior, not implementation
Call the code the way its users do and assert the exact result they see. Rewrite any test you wrote or are changing that would still pass if the function returned nothing or a wrong value. Report weak tests elsewhere. Weak tests include loose assertions (`toBeDefined`, `not.toThrow`), call-only checks (`toHaveBeenCalled`), expected values computed by the code under test, restated constants, and assertions on data the test built itself.

### Mock only at boundaries
Mock external services, time, and randomness. Do not mock your own code. If setup outweighs assertions, the test is wrong. Prefer a simple fake to asserting that a mock was called.

### Keep each test small and deterministic
Test one behavior per test and name it for that behavior. Tests run independently, in any order, with the same result every time. Find and fix the cause of a flaky test. Do not add retries, and do not delete it without asking.

### Test at the level of the behavior
Use unit tests for logic and an integration test for how components connect. Confirm the intent by running the real thing.

## Verification

### Run the gates and read your diff
Before reporting done, run the build, typecheck, lint, and tests, then read the diff as a reviewer would. Look for unrelated changes, leftover debug output, and unintended side effects. Passing is necessary, not sufficient.

### Try to break it
Assume the work is wrong and look for the input or path that shows it: empty, null, very large, concurrent, and error paths. Do not stop at the happy path.

### Check what depends on your change
Find what depends on what you changed (callers, importers, shared state) and run the checks that cover them.

### Explain the number
Before you trust or report a measurement (speedup, latency, throughput, eval score), find what limits it by asking what stops it from being larger. Check that it measured the right thing, not errors, cached or skipped work, code that never ran, or noise. Keep the run count, the spread, and the limiter with the number.
