# Reading-load lenses

Each lens turns the principles it cites into questions about a specific reading
burden. A smell starts a question; it does not prove a finding.

## Indirection and special cases

Principles: [simplicity](principles.md#simplicity),
[deep modules](principles.md#deep-modules).

Trace one operation. Do forwarding layers, mode flags, callback chains, or
scattered exceptions make the reader reconstruct behavior that could be local
and explicit? Identify the actual hops or interacting cases and show an
alternative that removes concepts, not just lines. This trace can support a
maintenance finding without an observed production bug.

Check why the layer exists. An external boundary, a stable public API,
ownership, a transaction, instrumentation, or measured performance may justify
it. An interface with one implementation is not wrong by itself. Explicit
branching may be clearer than a registry, and a long linear function may be
clearer than many tiny helpers. Preserve behavior and documented extension
points.

## Ownership of knowledge

Principles: [one source for each fact](principles.md#one-source-for-each-fact),
[group by one reason to change](principles.md#group-by-one-reason-to-change),
[pure logic, thin wiring](principles.md#pure-logic-thin-wiring).

Find rules split among views, controllers, jobs, or phases. Show which single
business fact a reader must reconstruct, or a maintainer must update, in several
places, or which unrelated policies one module combines. Demonstrate divergent
behavior, a coordinated-change obligation, or framework setup required to
exercise an otherwise independent calculation. A small pure function or clearer
ownership may help more than a service hierarchy.

Similar text is not necessarily shared knowledge. Separate policies may differ
on purpose, and presentation formatting belongs in a view. File length, a mix
of ordinary wiring steps, or a function doing several steps toward one
responsibility does not establish multiple reasons to change. Reuse an existing
helper only if its semantics and ownership match.

## Models and exposed internals

Principles: [contracts](principles.md#contracts),
[domain modeling](principles.md#domain-modeling).

Look for callers that synchronize flags, convert inconsistent shapes, check the
same invariant, or rely on a representation that should be private. Show the
contradictory state the model permits, the mismatch between producer and
consumer contracts, or the specific decision that leaks across callers. Prefer
one boundary check, one owned rule, or a suitable data shape over repeated
defensive patches.

Do not demand a new type for every primitive, or declarations for guarantees
the code already enforces. Dynamic validation, intentional transport models,
independent trust boundaries, and compatibility adapters can be appropriate.
A cast alone is not evidence of invalid input. Trace where the code establishes
the guarantee.

## Noise that obscures meaning

Principles: [hygiene](principles.md#hygiene),
[subtract before you add](principles.md#subtract-before-you-add).

Misleading names or comments, obsolete branches, scratch output, and duplicate
APIs matter when they lead a reader to infer the wrong contract or keep unneeded
paths alive. Explain the contradiction or burden, and suggest a precise rename,
correction, or removal. Confirm references, dynamic registration, external
callers, and migration commitments before calling code dead.

Do not inventory every redundant comment, literal, TODO, or style preference.
Deprecated APIs with unknown external consumers may need to remain. A clearer,
slightly longer expression can reduce reader load. Use existing lint results for
mechanical issues, and do not present them as design findings.
