# Simplicity

## Redesign when the design stops fitting
If fitting a requirement needs special cases in more than one place, and redesigning the affected module would be simpler overall, redesign it as if the requirement had always existed. Do not bolt on another special case. Before extending existing code, ask whether the existing design fits the new requirement. If the redesign reaches beyond the module you are changing, say so before starting.

Use when: a change needs special cases in more than one place.

## Subtract before you add
Before adding to cluttered code, delete dead code in the lines you are changing when a search finds no references, including strings, config, and tests. If a removal breaks something, restore it on purpose. If you cannot tell whether code is dead, leave it and report it.

Use when: adding a feature to code that contains dead or unused paths.

## Minimize reader load
Cut what a reader must hold in mind: hidden mutable state, control flow hidden by magic, and layers that add no behavior. Judge by what the reader must track, not by line count.

Use when: adding a layer, helper, or abstraction, or reviewing your own diff.

## Wait for the third occurrence
Do not extract a shared helper from two similar blocks of code. Extract at the third. This does not apply to rules, constants, or schemas, which keep one source from the start.

Use when: tempted to extract a helper from two similar pieces.

## One source for each fact
Keep one source of truth for each piece of knowledge, such as a rule, constant, or schema. Do not merge code that only looks alike. If two blocks change for different reasons, keep them separate.

Use when: duplicating a rule, or merging similar code.

## Design for the least code
Use the simplest design that meets the stated need. When a design needs special cases or extra layers, look for a simpler shape. Add no patterns or extension points for future needs.

Use when: choosing how to implement a change, whether you are tempted to patch quickly or to over-design.

## Keep necessary complexity in one place
When complexity cannot be removed, put it inside the module that owns it so callers stay simple. Do not push it onto every caller through options, ordering rules, or setup steps.

Use when: an interface makes callers know internal details, call order, or flags.
