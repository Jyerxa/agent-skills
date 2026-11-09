# Technical writing evals

`evals/` holds three test cases for the `technical-writing` skill, in the layout
that `claude plugin eval` reads. They live here, not in the skill folder, so they
are not copied into users' agents. Each case has a prompt, input files with
deliberate traps, and one grader file per assertion. `check.py` confirms that the
traps still behave as the assertions expect.

| Case | Trap |
| --- | --- |
| `runbook-from-cli-source` | The tool README gives a stale flag and default; prod rotation needs a confirmation flag the README omits. |
| `postmortem-from-incident-notes` | Mixed time zones, a guessed impact figure beside a measured one, a blaming comment, an unconfirmed cause, missing owners, and a weekday that does not match the year. |
| `tutorial-with-runnable-examples` | Retry semantics (`retries=N` means N + 1 attempts) and no packaging metadata, so `pip install` cannot work. |

`evals/objective_checks.py <case> <project-root>` prints evidence for the
scriptable assertions: flags used, code blocks that run, and untagged blocks.

## Results for 0.0.2

One run per configuration on 2026-11-09, comparing 0.0.2 with 0.0.1.

| Version | Assertions passed |
| --- | --- |
| 0.0.2 | 24 of 24 |
| 0.0.1 | 22 of 24 |

Both versions passed all 20 assertions written before the runs. The difference
comes from two assertions added after reading the outputs, so treat it as a
qualitative signal:

- Only 0.0.2 noticed that the incident notes call October 14 a Tuesday, which
  does not match 2026.
- Only 0.0.2 kept shell prompts and output out of command blocks.

0.0.1 already ran commands to check them and followed the code over the stale
README, so these cases do not separate the versions well. Harder cases would
help, such as a requested template, contradictory requirements, or missing
source files.

## Conciseness rules added in technical-revision 0.0.2

The shared writing principles, pattern catalog, and revision pass now include
rules from the CDC Clear Writing Checklist, the Purdue OWL Eliminating Words page,
the SJSU Eliminating Wordiness handout, Grammarist's self-editing checklist, and
Writing Hacks' editing checklist. The CDC checklist, the first five Purdue sections,
and both checklist posts were read in full. The Purdue and SJSU pages could not be
fetched from the build environment, so the rest of their rules come from a summary.

Numeric limits from the CDC checklist became review signals, not limits. Advice
to vary words for style, drop articles and "that," vary sentence length for
interest, or replace every "to be" verb was not adopted, because it conflicts with
one term per concept, parsing clarity, or precise technical statements.
