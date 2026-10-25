# Agent instructions

## Keep every skill self-contained

`npx skills add` copies one skill folder into the user's agent. Nothing else in
this repository goes with it, so each skill must work from its own folder alone.

- Every link and file path in a skill points inside that skill's folder. Do not
  link to another skill, to repository files outside the folder (such as
  `README.md`, `VERSIONING.md`, `principles/`, or `reviews/`), or to any web
  page, including this repository on GitHub.
- When a skill needs content that lives elsewhere, copy it into the skill's own
  `references/` and link to the copy. When several skills bundle the same file,
  keep the copies identical and add a check that compares them, as the process
  skills do for `process-model-v1.md`.
- Credit outside sources in plain text. Name the author and the work, with no URL.
- A skill may mention a related skill by name, but it must work without that
  skill installed.
- Links in an output template that point at files the skill itself generates,
  such as `process.md#rule-receipt`, are allowed.

Before finishing a skill change, search the skill's folder for links that leave
it, for example with `grep -rnE '\]\((https?:|\.\./|/)' skills/<path>`.
