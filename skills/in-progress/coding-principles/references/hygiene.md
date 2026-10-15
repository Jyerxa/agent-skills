# Hygiene

## Leave it cleaner
Fix small messes in the lines you are already changing. Do not expand into unrelated cleanup. Report other problems you find (see Stay in scope).

Use when: editing existing code.

## Restructure first, then change behavior
When a change needs the code reshaped first, restructure and commit that alone. Then make the behavior change in a second commit. A reviewer can then see what moved and what changed.

Use when: adding a feature or fix to existing code.

## Finish the migration
Aim a refactor at the target design, not an intermediate compatibility state. When you replace an internal API, migrate every caller you can find, delete the old API, and update the tests that call it. If a caller is outside the repo or unknown, keep the old API marked deprecated and report it.

Use when: replacing an API you were asked to replace.

## Name for intent
Name things with the domain's terms, and give one concept one name. Names say what a thing is or does. Replace magic numbers with named constants.

Use when: naming anything, or writing a literal value.

## Comment the why
Code shows what happens. A comment records why: a constraint, a trade-off, or a surprise. Delete comments that restate the code. If a workaround needs a paragraph to justify it, fix the code.

Use when: adding or reading a comment.

## Leave no scratch behind
Before finishing, delete the debug output, temp files, commented-out code, and unused code that you added. Leave older code alone. Keep a TODO only if it states a reason.

Use when: finishing any change.

## Let tools enforce style
Run the project's formatter and linter. Do not style by hand.

Use when: finishing a change, or about to fix formatting by hand.
