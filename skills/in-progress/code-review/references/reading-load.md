# Reading-load lenses

Use these translations of the linked source principles to investigate a
specific reading burden. A smell starts a question; it does not prove a finding.

## Indirection and special cases

Source: [simplicity](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/simplicity.md),
[deep modules](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/modules.md).

Trace one operation. Do forwarding layers, mode flags, callback chains, or
scattered exceptions make the reader reconstruct behavior that could be local
and explicit? Identify the actual hops or interacting cases and show an
alternative that removes concepts, not just lines. A maintenance finding can
be supported by this trace without an observed production bug.

Check why the layer exists: an external boundary, stable public API, ownership,
transaction, instrumentation, or measured performance may justify it. An
interface with one implementation is not inherently wrong. Explicit branching
may be clearer than a registry; a long linear function may be clearer than
many tiny helpers. Preserve behavior and documented extension points.

## Ownership of knowledge

Source: [one source for each fact](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/simplicity.md#one-source-for-each-fact),
[group by one reason to change](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/modules.md#group-by-one-reason-to-change),
[pure logic, thin wiring](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/SKILL.md#always).

Find rules split among views, controllers, jobs, or phases. Show which single
business fact must be reconstructed or updated in several places, or which
unrelated policies a module forces together. Demonstrate divergent behavior,
a coordinated-change obligation, or framework setup required to exercise an
otherwise independent calculation. A small pure function or clearer ownership
may help more than a service hierarchy.

Similar text is not necessarily shared knowledge. Separate policies may
intentionally differ; presentation formatting belongs in a view. File length,
a mixture of ordinary wiring steps, and a function doing several steps toward
one responsibility do not establish multiple reasons to change. An existing
helper merits reuse only if its semantics and ownership match.

## Models and exposed internals

Source: [contracts](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/contracts.md),
[domain modeling](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/domain-modeling.md).

Look for callers synchronizing flags, converting inconsistent shapes, checking
the same invariant, or relying on representation that should be private. Show
the permitted contradictory state, mismatched producer/consumer contract, or
specific decision that leaks across callers. Prefer one boundary check, one
owned rule, or a suitable data shape over repeated defensive patches.

Do not demand a new type for every primitive or declarations for guarantees
already enforced. Dynamic validation, intentional transport models, independent
trust boundaries, and compatibility adapters can be appropriate. A cast alone
is not evidence of invalid input. Trace where the guarantee is established.

## Noise that obscures meaning

Source: [hygiene](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/hygiene.md),
[subtract before you add](https://github.com/Jyerxa/agent-skills/blob/main/skills/in-progress/coding-principles/references/simplicity.md#subtract-before-you-add).

Misleading names/comments, obsolete branches, scratch output, and duplicate
APIs matter when they make a reader infer the wrong contract or preserve
unneeded paths. Explain the contradiction or burden; suggest a precise rename,
correction, or removal. Confirm references, dynamic registration, external
callers, and migration commitments before calling code dead.

Do not inventory every redundant comment, literal, TODO, or stylistic preference.
Deprecated APIs with unknown external consumers may need to remain. A clearer,
slightly longer expression can reduce reader load. Use existing lint results
for mechanical issues, without dressing them up as design findings.
