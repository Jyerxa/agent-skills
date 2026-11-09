# Technical revision evals

`evals/` holds three test cases for the `technical-revision` skill, in the layout
that `claude plugin eval` reads. They live here, not in the skill folder, so they
are not copied into users' agents. `../technical-writing/check.py` validates their
layout along with the writing skill's cases.

| Case | Trap |
| --- | --- |
| `revise-runbook-steps-and-code` | A purge warning after its step, prompts and output in command blocks, an unexplained placeholder, a misspelled flag, a default stated as both 6 and 12 hours, and filler around meaningful qualifiers. |
| `postmortem-recommend-and-approve` | Approval mode with blame, mixed time zones, a "confirmed" cause that contradicts a pending repro, unowned action items, and the summary last. |
| `design-doc-prose-only` | Prose scope with fixed headings, RFC 2119 keywords, a quote, an ambiguous "shall/should", a resolvable "and/or", and hidden verbs. |

`evals/objective_checks.py <case> <original-files> <run-outputs>` prints evidence
for the scriptable assertions.

## Results for 0.0.2

All runs on 2026-11-09 compared 0.0.2 with the original 0.0.1.

| Round | Cases | 0.0.2 | 0.0.1 |
| --- | --- | --- | --- |
| 1 | All three, one run each | 23 of 24 | 23 of 24 |
| 2 | Runbook only, two runs of 0.0.2 | 8 of 9 per run | 8 of 9 |

The scores tie, but the versions fail different checks:

- **0.0.1** kept `$` prompts and output inside command blocks.
- **0.0.2 in round 1** left a known-broken `--older-then` command in the runbook
  because a new rule forbade changing command text. Round 2 allows corrections
  the tool's code confirms, and both runs fixed and reported it.
- **0.0.2** cuts runbook prose less (12 to 14% against 34%). Most of the
  remaining text is runbook parts that the document-type guidance asks for, such
  as a verify section.

In approval mode, 0.0.2 marked missing owners as TBD and removed a person's name
from the timeline. 0.0.1 left the name in. Both versions caught two problems no
assertion checks: requirements that add up to 35 seconds against a 30-second
budget, and UTC times that are out of order because March 3 falls in PST.

The design-doc assertions do not separate the versions. Harder cases would help,
such as a long document with real structural problems or a requested template.
