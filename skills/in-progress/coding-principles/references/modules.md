# Deep modules

## Make modules deep
A module's interface should be much simpler than what it does. Warning signs: a wrapper that only forwards calls, a class whose methods mirror its fields, a signature as long as the body. Fix these by giving the module more responsibility behind fewer entry points.

Use when: creating or splitting a class, module, or function.

## Hide information
Keep decisions that may change (format, storage, algorithm, vendor) private to one module. Callers use behavior, not representation. Do not re-export transport, storage, or framework types through the public surface.

Use when: choosing what a module exposes.

## Tell, do not ask
Tell an object what to do. Do not read its data, decide outside, and write the result back. Prefer `account.withdraw(n)` to reading the balance and calling `setBalance`.

Use when: logic outside an object manipulates the object's fields.

## Validate at the edge, trust the inside
Parse and validate input once at the boundary (CLI, config, network, external APIs) into typed domain values. Inside, trust those types and do not re-check. Trust holds only where types enforce the guarantee.

Use when: handling external input, or adding null checks deep in a call chain.

## Group by one reason to change
Group code by one body of domain knowledge or one reason to change. Do not group by execution order (load, validate, transform, save), because phase-named modules repeat the same rules in every step. Do not make one class per method either.

Use when: splitting code into modules or classes.

## Compose, do not inherit
Build behavior by combining small pieces. Use inheritance only for a true is-a relationship with a stable base.

Use when: reaching for a base class to share code.
