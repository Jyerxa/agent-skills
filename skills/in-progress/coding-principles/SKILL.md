---
name: coding-principles
description: 'In progress: Coding principles for agents. Use when writing, changing, reviewing, debugging, or designing code. Gives the core rules now and names topic files to read only when the work needs them.'
---

# Coding principles

Project instructions and existing code conventions override these principles. Read only the topic files the current work needs.

## Always

Apply to every code change.

**Smallest change.** Make the smallest change that fully solves the problem. Where removing code gives the same result as adding it, remove. Add no abstraction, option, or file the task does not need. Fix causes, not symptoms.

**Simplest design.** Simplicity governs every change, not only refactors. Before you change code, read `simplicity.md`. When you add a requirement, ask whether the design would look the same had the requirement always existed. Delete dead code in the lines you touch. Choose the design with the least code and the least for a reader to hold in mind.

**Reuse first.** Before writing a helper or adding a dependency, search the codebase, the standard library, and the dependencies already installed.

**Working is not done.** Make it work, then make it right (simple, clear, correct), then make it fast only if measured. Passing once is the first stage.

**Verify before saying done.** Run the real thing and check the real result. A compile, a test you wrote, or your own reading is not proof. Say what you verified and what you did not.

## Topic files

Read the files that match the work, in `references/`.

- Designing a module, interface, or API: `contracts.md`, `modules.md`
- Data models, types, domain rules: `domain-modeling.md`
- Changing state, retries, concurrency, parallel agents: `state-changes.md`
- Cleanup, refactors, migrations, naming, comments: `hygiene.md`
- Writing, changing, or deleting tests: `tests.md`
- Declaring work done, or reporting a measurement: `verification.md`
- Debugging, or stuck after repeated failed attempts: `debugging.md`
- Bulk edits, multi-step work, scripting a repeated task: `execution.md`
- Delegating, long sessions, deciding whether to ask the human: `agent-behavior.md`
