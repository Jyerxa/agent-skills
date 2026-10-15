# Product design

## Put the user's result first
When convenience for the implementer conflicts with the user's result, choose the user. The user is whoever consumes the work: an end user, a caller, or the next maintainer. Do not add features, controls, or options the task did not ask for. Handle feedback, errors, and empty states for the ones it did. When scope is open, ship fewer polished things over more rough ones.

Use when: scoping a feature or choosing between approaches.

## Explore before committing
For a new interaction or design with no precedent in the codebase, where a wrong choice is costly to reverse, compare two or three options in a few sentences each. Build a throwaway prototype only when the choice depends on feel. Follow the existing pattern when one exists.

Use when: a new interaction or design decision has no precedent in the codebase.

## Make the common case easy
Set defaults so most users need no configuration. Keep rare options available but out of the way, and show detail only on request.

Use when: adding an option, setting, or flag.

## Write errors that help
An error says what happened and what to do next. "Port 8080 is in use; pass --port to choose another", not "Invalid input".

Use when: writing error or validation messages.

## Match what exists
Match the product's existing names, flags, defaults, and layout. Where none exist, choose the behavior a typical user would expect.

Use when: adding to a UI, CLI, or API, or choosing defaults and flag names.

## Ship a thin slice first
Get the smallest complete path working end to end, then widen it.

Use when: starting a feature that spans layers.

## Meet the accessibility baseline
Make every UI operable by keyboard, with readable contrast and labeled controls.

Use when: building or changing a UI.
