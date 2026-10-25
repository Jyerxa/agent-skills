# Simplicity

## Redesign when the design stops fitting
When you add or change a requirement, compare the current design with the one you would have built had the requirement existed from the start. If they differ and the redesign is simpler overall, redesign. Do not add a special case to the old design. If the redesign reaches beyond the module you are changing, say so before starting.

Use when: adding or changing any requirement, behavior, or case.

## Subtract before you add
Before adding code for a change, ask what the change lets you remove: code the new requirement makes unnecessary, and dead paths, strings, config, and tests with no references. Then ask whether deleting the whole block and rewriting it is simpler than adding to it. If so, rewrite it. If a removal breaks something, restore it on purpose. If you cannot tell whether code is dead, leave it and report it.

Use when: making any change.

## Design for the least code
Use the simplest design that meets the stated need. When a design needs special cases or extra layers, look for a simpler shape. Add no patterns or extension points for future needs.

Use when: choosing how to implement, structure, or change code.

## Minimize reader load
Minimize what a reader must hold in mind: hidden mutable state, control flow hidden in conventions or reflection, and layers that add no behavior. Judge by what the reader must track, not by line count.

Use when: designing, writing, or refactoring code, or reviewing your own diff.

## Wait for the third occurrence
Do not extract a shared helper from two similar blocks of code. Extract at the third. This does not apply to rules, constants, or schemas, which keep one source from the start.

Use when: tempted to extract a helper from two similar pieces.

## One source for each fact
Keep one source of truth for each piece of knowledge, such as a rule, constant, or schema. Do not merge code that only looks alike. If two blocks change for different reasons, keep them separate.

Use when: duplicating a rule, or merging similar code.

## Keep necessary complexity in one place
When complexity cannot be removed, put it inside the module that owns it so callers stay simple. Do not push it onto every caller through options, ordering rules, or setup steps.

Use when: designing an interface or module that other code will call.
