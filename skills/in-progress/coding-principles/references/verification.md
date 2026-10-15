# Verification

Verification asks whether the code meets the intent. Passing tests are one input, not the answer.

## Define done first
Before starting, write the checkable criteria that mean the request is met. Before reporting done, compare the result to those criteria and to the original request, not to your memory of the work.

Use when: starting a task with more than one step.

## Run the gates and read your diff
Before reporting done, run the build, typecheck, lint, and tests, then read the diff as a reviewer would. Look for unrelated changes, leftover debug output, and unintended side effects. Passing is necessary, not sufficient.

Use when: before reporting done.

## Try to break it
Assume the work is wrong and look for the input or path that shows it: empty, null, very large, concurrent, and error paths. Do not stop at the happy path.

Use when: a feature or fix appears to work.

## Check what depends on your change
Find what depends on what you changed (callers, importers, shared state) and run the checks that cover them.

Use when: changing shared code, a public interface, or a data format.

## Explain the number
Before you trust or report a measurement (speedup, latency, throughput, eval score), find what limits it by asking what stops it from being larger. Check that it measured the right thing, not errors, cached or skipped work, code that never ran, or noise. Keep the run count, the spread, and the limiter with the number.

Use when: benchmarking, optimizing, or comparing eval results.

## Get an independent review for risky changes
Have a fresh reviewer (a subagent with clean context) check the work.

Use when: the change touches auth, payments, data deletion, or migrations, or spans more than about 10 files.
