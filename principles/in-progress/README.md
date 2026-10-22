# coding-principles (in progress)

One agent skill that gives coding agents a curated set of coding principles
while keeping almost all of them out of context until the work needs them.

## How it loads

The skill uses the standard `SKILL.md` format, so Claude Code, Codex, and
Cursor all load it the same way. There is nothing to configure.

| Layer | What loads | When | Cost |
| --- | --- | --- | --- |
| 1 | The skill `description` | Always | about 45 tokens |
| 2 | `SKILL.md` body: an opening rule, seven always-rules, and a topic index | The agent is writing, changing, debugging, or designing code | about 470 tokens |
| 3 | One or two files from `references/` | The work matches a line in the index | 260 to 545 tokens each |

A conversation that is not about code loads layer 1 only. A typical coding
task loads layers 1 and 2 plus one or two topic files. Run `check.py` for
the current numbers.

## Install

The skill lives at `skills/in-progress/coding-principles/`. It is fully
self-contained: `SKILL.md` and `references/` are the whole skill, with no
links back to this repo.

```bash
npx skills add jyerxa/agent-skills --skill coding-principles
```

To try it from a checkout, copy that folder into the agent's skills folder
(for Claude Code, `~/.claude/skills/` or `.claude/skills/`).

For guaranteed use in a repo, add one line to its `AGENTS.md` or `CLAUDE.md`:
`Follow the coding-principles skill for all code changes.`

## Layout

```
skills/in-progress/coding-principles/   the skill (everything an agent needs)
  SKILL.md              always-rules and the topic index
  references/           one file per topic, loaded on demand
principles/in-progress/                 maintainer material, not installed
  README.md             this file
  check.py              budget and format check
  product-design.md     product design principles, held out of the skill
principles/note.md      review log and open decisions
```

## Writing a principle

Each entry in a topic file is a `##` heading, one instruction in one to four
sentences, and a `Use when:` line. Write the `Use when:` line as the activity the agent is doing (designing, writing, editing), not the defect the principle prevents. Keep it under 90 words. Write plain
sentences in active voice. No em dashes, no hedging, no metaphors.

Run `uv run principles/in-progress/check.py` after any edit. It fails when an
entry has no `Use when:` line, an entry or file is over budget, a topic file
is missing from the index, or a dash slipped in.

To add a principle, put it in the topic file that matches its activity, not
its theme. If no file fits and the principle is needed often, add it to the
always-rules only after cutting something else.

## Status

Drafted from the principles review in `../note.md`. Two topics came from
groups whose review was deferred and are drafts: `verification.md` and
`agent-behavior.md`. The note lists the open decisions.

Ideas draw on the pstack principles in cursor/plugins (MIT, Lauren Tan),
rewritten in this repo's own words, and on classic software design writing.
