# Improvement skill evaluation

This evaluation uses the actual captured fictional workshop model, not a
retrospectively invented baseline. The [request](workshop-request.md) asks for
an initial assessment without more questions, model edits, or implementation.

Baseline: `workshop-bike-intake`, revision 1, EXISTING, draft, reviewable.
Exact-byte SHA-256: `560868aeab1ba9e774cf0db7b91e8359e2de50f517c3ec44152912b1552bf03c`.
The [published assessment](workshop-improvements.md) uses its own identity and
revision, preserving the baseline pin and proposal IDs from the exercised output.

## Independent use

On 2026-10-09, an independent evaluator received the skill, its contracts, the
real capture, and the fictional request, without improvement examples, answer
keys, test code, or intended answers. It produced a complete assessment and
ran the validators. The repository baseline and its isolated input copy were
byte-identical before and after.

The resulting two `needs-evidence` proposals address early-repair authority
and readiness-notice timing. Evidence review confirmed:

- No invented business priority, demonstrated harm, prevalence, cost, duration,
  savings, target, decision-maker, or causal diagnosis.
- Reported policy stays distinct from early-repair practice; unknown permission
  is not promoted to an approved exception.
- Both notification accounts remain unresolved. The interview's separately
  labeled later clarification was excluded from this revision's assessment.
- Inspection/parts-check order and concurrency stay unknown; no parts-available
  gate, payment behavior, declined-job status, or new branch is inferred.
- Each proposal links its problem and affected records to the baseline,
  compares leaving things unchanged, identifies costs and retained constraints,
  states a benefit hypothesis, and gives a conditional test/decision.
- Information cues are conditional options, not adopted changes. Automation is
  an unselected idea. No test, outreach, approval, or implementation is claimed.

The first outputs were unnecessarily long for an initial pass. After adding
short-field guidance, the evaluator reduced the workshop assessment from
1,474 to 682 words while retaining the evidence and decision boundaries.
The published example adapts only its identity, source paths, and revision note.

## Separate partial ENVISIONED case

The evaluator also used a fresh, short account of planned tool-donation intake:
a volunteer logs donations, a coordinator inspects each item and accepts it
into stock or returns it, and unsafe-item handling is undecided. Nothing is
operating. The supplied improvement goal was safer handling without burdening
every donation, while leaving the unsafe-item policy to the user.

The actual output proposed a paper walkthrough of an ordinary and an
uncertain-safety case to explore a minimal referral cue. It retained intended
inspection of every item and did not assume that the coordinator has policy
authority or safety expertise. Handling, storage, acceptance, return, and
disposal of unsafe items remained undecided. No operating performance or
benefit was claimed. The input remained unchanged and both validators passed.
The shortened output was 409 words. This is a tested scenario, not a bundled
second business model or a recommendation to handle suspect tools.

## Structural, package, and cross-contract checks

From the repository root:

```bash
python3 -m unittest discover -s skills/capture-process/scripts -p 'test_*.py' -v
python3 -m unittest discover -s skills/visualize-process/scripts -p 'test_*.py' -v
python3 -m unittest discover -s skills/improve-process/scripts -p 'test_*.py' -v
python3 skills/improve-process/scripts/validate_proposals.py \
  skills/improve-process/fixtures/workshop-improvements.md \
  --baseline skills/capture-process/fixtures/workshop-process.md
```

Results: 15 capture, 19 visualization, and 18 improvement tests passed locally;
all three skill entrypoints passed quick validation. Improvement checks cover
exact hashes including CRLF, all metadata pins, stale input, unknown contracts,
record references, source-versus-affected IDs, duplicate/missing fields, decision
evidence for accepted status, zero-proposal assessments, and standalone read-only
CLI use. Shared contract and baseline-validator copies are byte-identical.

An independent whole-contract review found two structural inconsistencies:
malformed record headings could silently disappear, and scenarios could lack
their required Status. Both were fixed in every bundled baseline validator;
fresh adversarial checks and new capture/renderer regressions verify rejection.
The workshop model and generated HTML remain byte-for-byte unchanged.

The CI workflow repeats these checks and the viewer's 18 real Chromium checks.
See the [visualization evaluation](../../visualize-process/fixtures/workshop.VALIDATION.md)
for browser coverage and genuine screenshot evidence. Nothing was published,
deployed, merged, or operationally implemented during this evaluation.

Validators establish structure and provenance, not the truth of a diagnosis,
the value of a proposal, or genuine user approval. The independent semantic
checks above cover these particular cases, not every possible future input.
