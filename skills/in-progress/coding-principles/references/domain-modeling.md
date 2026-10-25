# Domain modeling

## Model the domain
Encode the real rules in a data structure, not in scattered conditionals. Use a typed model for loose parameters, and a map or discriminated union for branching spread across files. Add the structure when an if/else chain gains a branch with each feature, or two booleans must stay in sync. Skip it when the code is clear, local, and unlikely to grow.

Use when: designing the data model or state for a feature, or writing stateful logic.

## Make illegal states impossible
Encode the rules in the types. Use sum types or enums with payloads, not optional fields that allow contradictions (`done: true` with no date). Parse external data into types at the boundary. Fix the model instead of casting. Derive types from an authoritative schema when one exists. Strengthen a type where a runtime assertion shows it is too weak, then stop. In dynamic languages, use schemas.

Use when: designing types or signatures, or about to write a cast, `any`, or a "should never happen" check.

## Replace primitives with value types
When two arguments of the same primitive type can be swapped by mistake (two string IDs), or a value has validation or rounding rules (money, emails), wrap it in a small immutable type that validates on creation and compares by value. Do not wrap a primitive that has one meaning and no rules. Entities have identity; values do not.

Use when: defining types, fields, or signatures for IDs, money, units, or other values with rules.

## Keep invariants in one place
Put each rule that must always hold in one place, and route every change through it. Keep state private and expose operations (`order.cancel()`), not getters and setters that wrap a field. A setter that only assigns protects nothing.

Use when: writing a rule or validation, or designing how callers change an entity.
