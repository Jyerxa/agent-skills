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

Versioning starts from a conservative `0.0.1` / `in-progress` baseline, not a
release or a new maturity claim. Read each skill's `SKILL.md` for its current
version and lifecycle. Existing paths stay unchanged, including skills outside
`in-progress/`. Behaviour and outputs may change during development. Existing
description labels remain visible in installers; lifecycle metadata does not
filter installs.

| Skill | Description |
| --- | --- |
| [`capture-process`](skills/in-progress/capture-process) | **In progress.** Interview a practitioner to faithfully capture an existing or envisioned business process in a versioned, evidence-linked model, including manual work, domain language, rules, exceptions, and unresolved questions. |
| [`visualize-process`](skills/in-progress/visualize-process) | **In progress.** Turn a captured process into a cinematic, portable HTML journey with expressive 3D scenes, choreographed camera movement, progressive discovery, and evidence available on demand. |
| [`improve-process`](skills/in-progress/improve-process) | **In progress.** Propose evidence-linked changes to a captured process, preserving its baseline and comparing alternatives, tradeoffs, and tests before a decision. |
| [`coding-principles`](skills/in-progress/coding-principles) | **In progress.** Curated coding principles for agents. A short always-on core plus topic files that load only when the work needs them (design, state, tests, debugging, verification). |
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

The fictional workshop example includes a [capture](skills/in-progress/capture-process/fixtures/workshop-process.md),
an [offline inspection viewer](skills/in-progress/visualize-process/fixtures/workshop.html) demonstrating evidence handling, and
a [conditional improvement assessment](skills/in-progress/improve-process/fixtures/workshop-improvements.md).
Download the HTML and open it locally; no site or server is required.

## Plugins

Claude Code plugins live under `claude/plugins/`; ones still taking shape sit
in `claude/plugins/in-progress/` and move up once they settle. This repo is
also a plugin marketplace, so one line inside Claude Code installs any of them:

```
/plugin install tree --marketplace jyerxa/agent-skills
```

| Plugin | Description |
| --- | --- |
| [`tree`](claude/plugins/in-progress/tree) | **In progress.** A live file tree pane beside the transcript: the whole working directory, git status colors and badges, and a shimmer on the file Claude is editing. Needs the fullscreen terminal layout (`/tui fullscreen`). |
| [`enrich`](claude/plugins/in-progress/enrich) | **In progress.** Improve a draft prompt in place. `ctrl+x e` tidies it; `ctrl+x d` asks you a few questions in Claude Code's own dialog, then writes a structured prompt (Goal, Context, Tasks, Scope, Guardrails, Success Criteria). The same chord puts your original back. Run `/enrich keys install` once to bind the chords. |

To run one from a checkout without installing: `claude --plugin-dir claude/plugins/in-progress/tree`.

## Versioning

Each skill has its own numeric version and lifecycle label in `SKILL.md`.
The available labels are `in-progress`, `alpha`, `beta`, and `release`; promotion
is a deliberate review decision. Versions cover the whole skill folder, not the
repository or its Claude Code plugins.

See [Versioning and releases](VERSIONING.md) for the metadata, compatibility
rules, release checklist, and how to install a future tagged snapshot. Normal
installs above follow the default branch, including work in progress.

## Layout

Every skill is a folder under `skills/` containing a `SKILL.md` (name,
description, and version/lifecycle metadata, then the instructions) and any
supporting reference files. That layout is the whole distribution mechanism — `npx skills` reads it
directly from this repo.

```
skills/
  <skill-name>/
    SKILL.md
    references/   (optional supporting files)
  in-progress/    (existing paths kept; metadata is the lifecycle authority)
    <skill-name>/
      SKILL.md
      references/ (optional supporting files)
VERSIONING.md     (skill versioning and release process)
claude/
  plugins/
    in-progress/          (plugins still taking shape)
      <plugin-name>/
        .claude-plugin/plugin.json
        hooks/            (hooks.json and the hooks module, with its tests)
        types/            (the plugin's state contract)
        docs/             (PRD and design notes)
.claude-plugin/marketplace.json   (lists the plugins for /plugin install)
```

## License

[MIT](LICENSE)

