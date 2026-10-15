# State changes

## Prefer immutable data
Return new values instead of mutating shared ones. Mutate only inside a function's own scope or in an owner designed for it.

Use when: passing data between functions or components.

## Make transitions explicit
Model state changes as named operations that reject invalid transitions. Do not scatter assignments.

Use when: an entity has a lifecycle (draft, active, canceled).

## Separate commands from queries
Make a function either change state or return data. The exception is an operation that must return what it atomically changed.

Use when: a function named like a read changes state.

## Make operations idempotent
Make an operation safe to run twice, or after a crash partway through, when it retries, restarts, or runs unattended. Use upserts, deterministic IDs, checks inside the transaction, and write-to-temp then rename.

Use when: writing commands, installers, migrations, workers, or anything that retries or restarts.

## Remove sharing before adding locks
When concurrent actors might write the same file, branch, key, or object, first give each its own and merge at read time. Serialize (lock, single writer, compare-and-swap) only when one shared target is a real invariant. If you need a lock, first check whether each actor can have its own copy. Telling a subagent not to touch another agent's files does not prevent conflicts.

Use when: parallel subagents, worktrees, workers, or threads share state.
