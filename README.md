# agent-skills

Agent skills I build and use — reusable, disciplined workflows for coding agents
(Claude Code, Cursor, and [70+ other agents](https://github.com/vercel-labs/skills)).

## Install

Pick one, several, or all skills with the interactive picker:

```bash
npx skills add jyerxa/agent-skills
```

Install a single skill directly:

```bash
npx skills add jyerxa/agent-skills --skill pattern-design
```

List everything available here:

```bash
npx skills add jyerxa/agent-skills --list
```

Installation is handled by [`npx skills`](https://github.com/vercel-labs/skills) —
there is nothing to configure on this end. Skills land in your agent's skills
directory (for Claude Code: `.claude/skills/` in your project, or `~/.claude/skills/`
globally with `-g`).

## Skills

| Skill | Description |
| --- | --- |
| [`system-discovery`](skills/system-discovery) | Guide an interview from a rough software idea to a system brief covering purpose, users, workflows, responsibilities, rules, and scope - ready to inform codebase design. |
| [`pattern-design`](skills/pattern-design) | Turn a system design spec or PRD into a disciplined pattern-based design — which patterns to apply, where, why — plus repo-ready agent instructions that enforce it. |

Each skill has a longer write-up on my site explaining how it works and the
thinking behind it.

## Layout

Every skill is a folder under `skills/` containing a `SKILL.md` (name +
description frontmatter, then the instructions) and any supporting reference
files. That layout is the whole distribution mechanism — `npx skills` reads it
directly from this repo.

```
skills/
  <skill-name>/
    SKILL.md
    references/   (optional supporting files)
```

## License

[MIT](LICENSE)
