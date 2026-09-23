# Verification

Phase 4 adversarially re-checks the claims that would do the most damage if
they were wrong, before anything reaches the artifacts. Verifiers are workers
with fresh context. They read the cited code, not the card's reasoning.

## What to verify

Verify every item in these categories:

1. Every **calculation** record (C-…), especially its worked example.
2. Every **conflict** (X-…) found in Phase 3.
3. Every **high-impact rule** (R-… with impact `high`).
4. Every **pattern claim** (P-…) and every layer violation.

If there are more than about 150 items, verify all of categories 1 and 2 and
a random sample of at least 30% of categories 3 and 4. State the sampling in
the coverage report.

## Batching

Group claims by the files they cite, so each verifier re-reads a small set of
files. Aim for 10–25 claims per verifier. Write each batch as a brief in
`.jy-codebase-analysis/briefs/V-###.md` and dispatch it like any other worker.

## Verifier brief template

````markdown
# Verification Batch V-###

You are a skeptical reviewer. Each claim below was written by another analyst
about this codebase. Your job is to try to prove each claim wrong by reading
the cited code yourself. Do not trust the claim's wording. Do not spawn
subagents. Do not modify any file except your output.

Reference for pattern claims: `<abs path>/references/pattern-recognition.md`
Reference for rules/calculations: `<abs path>/references/business-logic-extraction.md`

## Claims

<paste each claim block verbatim, with its ID>

## For each claim

1. Open every cited location (and immediately surrounding code) and read it.
2. For calculations: re-derive the formula from the code, statement by
   statement. Check each item of the numeric-subtleties checklist. Recompute
   the worked example by following the code, not the claimed formula.
3. For rules: check the boundary conditions (`>` vs `>=`), the exceptions,
   and whether the parameter values match their definitions.
4. For conflicts: confirm both implementations really compute the same
   business concept, and that the stated differences are real.
5. For patterns: confirm each named participant plays its role, and check
   the conformance claim by searching for bypasses.

## Output

Write to `<abs workspace path>/verification/V-###.md` (or return it as your
final message if you cannot write files):

```markdown
| Claim | Verdict | Detail |
|---|---|---|
| C-004-2 | confirmed | — |
| R-007-1 | corrected | Boundary is `>= 10` (`fees.py:31`), not `> 10`. Corrected text: "..." |
| P-002-1 | refuted | `Thirty360` is never passed polymorphically; callers branch on a string (`interest.py:40`). |
```
````

## Applying results (orchestrator)

- **confirmed**: mark the claim verified.
- **corrected**: replace the claim text with the correction and mark it
  verified.
- **refuted**: remove the claim from the artifacts, and keep it in
  `verification.md` with the reason.
- Merge every batch result into `verification.md`, with totals per category
  and verdict. These totals feed the coverage report.
- If more than 20% of a single unit's claims were corrected or refuted,
  re-dispatch that unit's analysis once. A card that bad probably has errors
  outside the verified sample too.
