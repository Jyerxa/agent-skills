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
| [`capture-process`](skills/capture-process) | Interview a practitioner to faithfully capture an existing or envisioned business process in a versioned, evidence-linked model, including manual work, domain language, rules, exceptions, and unresolved questions. |
| [`visualize-process`](skills/visualize-process) | Turn a captured process into a portable, animated HTML explorer with case walkthroughs, inspectable evidence and relationships, and visible uncertainty. |
| [`improve-process`](skills/improve-process) | Propose evidence-linked changes to a captured process, preserving its baseline and comparing alternatives, tradeoffs, and tests before a decision. |
| [`system-discovery`](skills/system-discovery) | Guide an interview from a rough software idea to a system brief covering purpose, users, workflows, responsibilities, rules, and scope - ready to inform codebase design. |
| [`pattern-design`](skills/pattern-design) | Turn a system design spec or PRD into a disciplined pattern-based design — which patterns to apply, where, why — plus repo-ready agent instructions that enforce it. |
| [`jy-codebase-analysis`](skills/jy-codebase-analysis) | Deep, evidence-backed analysis of an existing codebase: an orchestrator surveys the repo and fans out subagents to read every file, then synthesizes a business overview, a business-logic catalog (calculations captured as business rules), an architecture overview with Mermaid diagrams, and a layer-by-layer engineering-patterns report. Works in Claude Code, Cursor, Codex, and Copilot. |

Some skills have a longer write-up on my site explaining how they work and the
thinking behind them.

### Business process workflow

`capture-process` describes existing operations or envisioned intent without
redesigning it. Its single, versioned Markdown model is the common input for
two separate tasks: `visualize-process` explains it; `improve-process` proposes
changes against it. Neither consumer fills gaps or overwrites the baseline.
Each skill can be installed on its own; consumers bundle the shared contract.
`system-discovery` remains a separate workflow for defining a software system.

The fictional workshop example includes a [capture](skills/capture-process/fixtures/workshop-process.md),
an [offline animated viewer](skills/visualize-process/fixtures/workshop.html), and
a [conditional improvement assessment](skills/improve-process/fixtures/workshop-improvements.md).
Download the HTML and open it locally; no site or server is required.

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

