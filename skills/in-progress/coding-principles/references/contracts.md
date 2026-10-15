# Contracts and models first

## Decide the data first
Choose the core data structures and their relationships before writing logic. Most tangled logic comes from a wrong data shape.

Use when: starting a feature or module with non-trivial state.

## Design the call site first
Write how the code will be called (arguments, results, errors) before implementing it. If the usage reads awkwardly, change the interface.

Use when: creating a function, API, command, or module.

## Define the contract before both sides
When two components must talk, define the shared type, schema, or interface first, with one source of truth. Then implement each side against it. Do not write one side and bend the other with adapters.

Use when: building a producer and consumer, a client and server, or any seam between components.

## State the contract
For each public function, write its preconditions, postconditions, and invariants in the signature or a doc comment. Enforce them with types first, then checks at the boundary.

Use when: defining or reviewing a public interface.

## Expose less
Callers come to rely on anything observable. Return only what callers need. Do not expose internals, extra fields, or incidental ordering.

Use when: adding a field, method, flag, or output to a public surface.

## Add an interface only at a real seam
Introduce an interface or abstraction only at a real seam: an external system, a boundary you test across, or a second implementation that exists today. Otherwise call the concrete code.

Use when: about to add an interface with one implementation.
