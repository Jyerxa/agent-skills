# Execution

## Script repeated work
When work is repeated, bulk, or hard to check by eye, write the smallest script, codemod, or generator that does or proves it, then rerun it. Do the first unit by hand to learn the recipe. When the units follow one pattern, a script beats delegating hand edits. Keep the script throwaway. Skip this for a couple of obvious edits.

Use when: migrations, sweeps, bulk edits, or repeated verification.

## Sequence work into verifiable units
Split multi-step work into small units that each end in a checkable state. Check each unit before starting the next, from a clean baseline.

Use when: sweeps, migrations, or runs of similar edits.

## Fail fast
Surface a problem where it happens, with context about what was being attempted. Do not write empty catch blocks or silent defaults that hide a real failure.

Use when: writing error handling.

## Turn repeated corrections into checks
When you give the same instruction twice or see the same correction recur, make it a lint rule, type, test, check, or script instead of more text. If a structural fix exists, make it. If the lesson needs judgment, write the rule and one failure example in the project's instruction file.

Use when: a mistake recurs, or you repeat a rule.
