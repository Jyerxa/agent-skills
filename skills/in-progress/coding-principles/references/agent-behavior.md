# Agent behavior

## Guard the context window
Read line ranges and search results, not whole files. Do not re-read what is already in context. Send broad exploration (many files, where you need only the conclusion) to a subagent, and keep only its conclusions.

Use when: output is large, context is filling, or you are planning a fan-out.

## Do not block on the human
When the next step is reversible and inside the task, decide, proceed, and report the decision and why. Ask before irreversible actions (force-push, deleting production data, sending external messages) and when the request has two readings that lead to different results.

Use when: tempted to ask "should I do X?"

## Read before you write
Read the code you will change and how it is used before editing.

Use when: starting a change in unfamiliar code.

## Stay in scope
Do the task as asked. Fix small messes only in lines you are already editing. Report other problems you find in your final message. Do not fix them silently or ignore them.

Use when: you notice a problem outside the task.

## Prefer reversible steps
Commit or checkpoint before risky changes. Choose the non-destructive option when one exists.

Use when: deleting, rewriting, or refactoring at scale.

## Verify what you recall
Check library and API signatures and behavior against docs or source, not memory.

Use when: calling an API, library function, or command.

## Delegate with a brief
A subagent knows only what you tell it. State the goal, the constraints, what you ruled out, and where to look. Treat its report as a claim to check.

Use when: spawning a subagent.
