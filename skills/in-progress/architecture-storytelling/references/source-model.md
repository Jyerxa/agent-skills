# Source model and traceability

Use a compact table or structured file, not a second architecture specification.
Preserve the source's own IDs where available. Assign stable local IDs otherwise.

## Minimum useful records

- **Source:** filename/title, revision or hash, and precise locator such as section,
  page, diagram element or code lines. Keep private file links local; omit secrets.
- **Actor/journey:** goal, starting condition, supported steps and outcome. Mark
  narrative order separately from established execution order.
- **Component:** source name, scope/level, responsibility, business purpose,
  rationale status, and source locator. Do not infer deployment from diagram style.
- **Transfer:** sender, receiver, data or command, direction, trigger, and known
  ordering/transport. Unknown fields remain unknown. A dependency is not a transfer.
- **Rule:** exact decision or constraint, conditions, responsible actor/component,
  outcome, exceptions and source. Preserve "may", "must", and reported practice.
- **Rationale:** objective or rule → mechanism or handoff → source support.
  Use `documented`, `inferred`, or `unknown`; an inference must say why it is
  plausible and what would confirm it. It must not become a stated requirement.
- **Claim:** scene/object, claim text, supporting record/field and locator.
  Qualify uncertainty at the point of use, not only in an appendix.

Include conflicts and consequential missing information. A partial architecture
can still be presented well: show established responsibilities and frame the
unknown as an open question. Do not animate an invented resolution.

## Example distinctions

A diagram says "web app → queue → worker". This establishes relationships, not
that the web app acknowledges before processing, that delivery is exactly once,
or that workers scale automatically. Those need separate evidence.

A specification says "requests above $10,000 require manager approval before
payment". Show the approval gate and its business purpose. If the architecture
does not identify who enforces it, show "enforcement location unspecified" rather
than placing the rule inside the payment service for a cleaner scene.

An API and database use the same customer name. That does not prove which system
owns the record, synchronization direction, or permissible personal-data access.
A dashed trust boundary does not establish encryption or compliance.

## Review questions

Can a reviewer follow each business claim to the actual source passage? Are
visual hierarchy and size being mistaken for authority or scale? Are status,
error recovery, security guarantees or outcomes stronger than the source? Does
the technical layer qualify the same claims as the business layer? If two
sources disagree, can the audience see the conflict without studying citations?
