# Coding Principles: Working Notes

Scratch space for curating coding principles that guide coding agents.

## Process

1. **Setup**: create `principles/` and this note. (done)
2. **Review source** (done, all 24 kept; see log): walk through the 24 principles from the reference repo one by one, discuss, and record keep / drop / modify decisions.
3. **Layer in classics**: discuss well-known coding principles (e.g. SOLID, DRY, YAGNI, KISS) and add the ones we want.
4. **Organize and refine**: group, dedupe, reword into the final principles set.

## Source repo

https://github.com/cursor/plugins/blob/main/pstack/docs/guide/08-principles.md

Sections in the source: Core (1-10), Architecture (11-16), Verification (17-21), Delegation (22-23), Meta (24).

## Review log

| # | Principle | Decision | Notes |
|---|-----------|----------|-------|
| 1 | Laziness Protocol: prefer deletion and the smallest change that solves the problem | Keep | Strong keeper. Guardrail: "smallest change that fully solves it", tie to #18 root causes. Classic analog: YAGNI. |
| 2 | Foundational Thinking: choose core data structures before logic | Keep | Overlaps #11, #13. Group: Contracts & models. |
| 3 | Redesign from First Principles: fold new requirements in as if present from the start | Keep (modify) | Group: Simplicity Scales. Tension with #1 resolved: smallest change to the design, not the diff. Trigger (needs wording work): redesign when a new requirement doesn't fit cleanly into the design AND a redesign maximizes simplicity. |
| 4 | Attack the Premise: after repeated failed fixes, question the shared assumption | Keep | Group: Tactical coding (how to operate, not how to design). Related: #18. |
| 5 | Subtract Before You Add: remove dead weight before building on it | Keep | Group: Simplicity Scales. Guardrail: only dead weight in the area being changed; confirm no callers/references before deleting. |
| 6 | Minimize Reader Load: collapse layers and hidden state | Keep | Group: Simplicity Scales (sub-category TBD). Possibly the umbrella goal (#1, #3, #5 as tactics). Counterweight: test is what the reader must track, not line/layer count. |
| 7 | Outcome-Oriented Execution: drive rewrites to the target design, not temporary compatibility states | Keep | Group: Code hygiene (what you leave behind). Narrow scope (refactors/migrations). Likely merge with #15 (#15 as concrete example); merge still OPEN. Rule: don't keep compatibility states you don't need; some (public APIs, deployed data) are legitimate. |
| 8 | Experience First: user's result over implementation convenience | Keep | Group: Design (how to design well, not how to code well). Source skill is about product/scope tradeoffs: justify every feature, ship fewer polished things, prototype first, polish the core loop. "User" = whoever consumes the work (end user, importer, next maintainer). Open: keep UI-specific details or generalize the core. Governs the target; #2 governs sequence. |
| 9 | Exhaust the Design Space: with no precedent, prototype 2-3 options | Keep | Group: Design. Source skill body is nearly empty, so we write our own wording. Make it conditional: only for decisions costly to reverse or dependent on feel, and when the codebase has no precedent. For architecture a written comparison may suffice; prototypes for UI/interaction. |
| 10 | Build the Lever: script repeatable work, save agents for judgment | Keep | Group: Tactical coding. Open: whether to soften the bar from "non-trivial" to "repeated, bulk, or hard to verify by eye". Keep "smallest script, never a framework" (#1) and "script beats fan-out". Distinct from #24 (this = work in front of you; #24 = recurring guidance). |
| 11 | Model the Domain: encode repeated rules in one structure, not scattered conditionals | Keep | Group: Contracts & models (cross-reference from Deep modules for the ownership half; "temporal decomposition" is Ousterhout's term). Applied form of #2. Keep the "execution order is not ownership" / temporal decomposition smell, and the built-in guardrail (don't force abstraction; prefer boring code when shape is clear and local). Possible merge of #2 + #11 (+ #13) at organize time. |
| 12 | Boundary Discipline: validate at the edges, trust internal types | Keep | Group: Deep modules. Parse once at the edge, don't leak transport/storage/framework types, pure core + thin shell. Caveat: "trust internal code" holds only if types enforce the guarantees (#13). OPEN: split functional core / imperative shell into its own principle? |
| 13 | Type System Discipline: make illegal states unrepresentable | Keep | Group: Contracts & models. Core idea: the typed model carries the business rules so the compiler/schema enforces them, instead of procedural checks (avoid primitive obsession / weak types). Avoid the word "anemic" in final wording (Fowler's anemic domain model means the opposite). Direction: language-agnostic core (illegal states unrepresentable, parse at boundaries, don't lie to the type system, derive from authoritative schemas, strengthen types only where partiality appears); per-language details live elsewhere. Dynamic-language analog: Pydantic/zod-style schemas, enums. Source has 8 rules; branding and exhaustive matching are techniques; boundary parsing duplicates #12, schema derivation overlaps #24. |
| 14 | Make Operations Idempotent: retries converge on the same end state | Keep | Group: State mutation (new; first principle about how to mutate state). Situational (retries, restarts, migrations, workers): consider a conditional trigger. Source examples are tied to its orchestrator (PID locks, sessions); rewrite generically (upserts, check-then-act inside the transaction, deterministic IDs, write-temp-then-rename). Likely sibling: #16. |
| 15 | Migrate Callers Then Delete Legacy APIs: one wave | Keep | Group: Code hygiene. Concrete procedure for #7: inventory callers, migrate, delete old API in the same wave, update tests, delete tests that only protect old implementation details. Put the applicability condition first: only when you control every caller; otherwise deprecate first. Temporary adapters are exceptional and time-boxed. |
| 16 | Separate Before Serializing Shared State: remove sharing before adding coordination | Keep | Group OPEN: leaning State mutation (next to #14), but it is also "simplification through design". Rule of thumb proposed: group by the decision a principle governs; simplicity is the reason it works, so treat Simplicity Scales as the umbrella theme with decision-area groups beneath, not as a bucket. Keep agent-specific wording: "instructions and conventions are not concurrency control" (parallel subagents/worktrees). Cross-reference #22. Key line: "we need a lock" is a design smell to check, not the default. |
| 17 | Prove It Works: verify the real artifact, not a proxy | Keep | Group: Verification. Likely the top-level verification rule, with #18-#21 as specializations. Possibly the most valuable principle for coding agents. Trim the "script the check" half and cross-reference #10 to avoid overlap. When verification fails, suspect the observation method before the system. |
| 18 | Fix Root Causes: reproduce and trace before changing code | Keep | Group: Tactical coding (how to operate as an agent; Verification is about knowing when something is done and correct). Pairs with #4 (stuck companion) and #1 guardrail. Keep: reproduce first, ask why, no symptom-silencing guards, fix the pattern not the instance, instrument don't guess. Restart-bug note: shrink to a one-line example. Last bullet (propose a cheap always-on signal) cross-reference #24. ADD: explanation check, worded for agents: before declaring a bug fixed, state the mechanism and the evidence for it; "the tests pass now" is not a mechanism (folded in from "Don't program by coincidence", which was rejected as a separate human-oriented principle). |
| 19 | Sequence Work into Verifiable Units: check each small unit before the next | Keep | Execution half is the principle; Group: Tactical coding (pairs with #17: #17 is the proof, this is when to take it). Before/after bracket per unit; rebase onto clean trunk; run the check even when a script makes it free. Delivery half (stack commits/PRs so the sequence proves itself, e.g. failing test then fix) split out as an OPEN candidate for a separate delivery / PR-conventions note; opinionated, may not be universal. |
| 20 | Test Behavior, Not Implementation: public interface, literal expected values, delete tests that pass against a stub | Keep | Group: Writing good tests (new heading). Lead with the distinctive check: would the test still pass if every function returned undefined or a wrong value? Plus literal expected values. Keep the weak-test shapes (loose assertion, call-only, self-computed expectation, restated constant, asserting on data the test built); drop Jest/Vitest matcher names. Cross-reference #15 (delete tests that only protect old implementation details) and #17. |
| 21 | Explain the Number: find what limits a measurement and rule out measuring the wrong thing | Keep | Group OPEN: Verification (specialization of #17) vs. a new Benchmarking heading. Most specialized principle; applies only when measuring (benchmarks, perf, evals), conditional trigger. Memorable test: "why not double?". Rule out what else the number could measure (errors, skipped/cached work, code that never ran, untuned side, noise, too-small piece); keep run count, spread, limiter with the number. Source defers the full procedure to a benchmark-checklist skill: write our own short version or leave a pointer. |
| 22 | Guard the Context Window: bulk reading to subagents, keep only findings | Keep | Group: Agent behavior (new heading, name TBD). REVISIT implementation: source body is one line, we write our own. Draft tactics: read ranges/searches not whole files, send broad exploration to a subagent and keep conclusions, don't re-read what's in context, cap each phase's scope. Caution: delegation loses detail and has its own cost; use for sweeps where only the conclusion matters, not lookups you can do in a few calls. |
| 23 | Never Block on the Human: proceed with reversible work, present the result | Keep (modify) | Group: Agent behavior. Make conditional on supervision mode: unattended runs, or the next step is reversible and clearly within scope. Guardrails: "proceed" covers the task as given, not expanding scope or choosing product direction; flag ambiguity that changes what gets built; always present the decision and why. Bright line stays reversible vs. irreversible (force-push, delete prod data, external messages need confirmation). |
| 24 | Encode Lessons in Structure: advice repeated twice becomes a lint, check, or script | Keep | Group OPEN, not classified: user leans Tactical coding; source calls it Meta. Meta-principle for the whole set: written guidance is the weakest enforcement, so ask of every principle whether a lint, type, test, or script could enforce it. General case of #13, #12, #20, #10. Keep the "twice" trigger and the corollary (if the fix is structural, use only the structural fix; the instruction is the symptom). REVISIT wording: source is two sentences. |

## Classic principles to layer in

### Simplicity Scales (discussed)

Keep:
- Rule of Three (wait for the third occurrence before abstracting); duplication is cheaper than the wrong abstraction. A premature abstraction becomes the bad earlier decision that drives the next one.
- DRY, worded as intended: one source of truth per piece of knowledge, not per stretch of similar-looking text.
- Strategic over tactical programming (Ousterhout), steered toward less is more: when designing, remove complexity and add elegance, not extra design. Accomplish the intent with the least code. Explicitly anti-over-design.
- Pull complexity downward (Ousterhout): necessary complexity lives inside the module that owns it, not in every caller. Cross-reference Deep Modules.
- Premature optimization / make it work, make it right, make it fast, strengthened: "it works" does not mean "it's done." Always be aware of which of the three you are doing. Making it right includes making it simple. Pairs with Explain the Number (measure before optimizing).

Skip / exclude:
- Chesterton's Fence: user is fine with an agent removing something until it breaks, then adding it back deliberately. Only exception: accidental side effects (things breakage won't reveal).
- Gall's law.
- KISS / YAGNI as separate principles: mention as aliases under the Laziness Protocol. Occam's razor too vague.

### Contracts & Models first (discussed)

Keep:
- Design the call site first: write how the code will be used before implementing; if the usage reads awkwardly, the interface is wrong. Ties to Experience First.
- Contract-first at component boundaries: define the shared type/schema/interface first, implement both sides against it; one source of truth so adapters never glue mismatched shapes.
- Design by contract: preconditions, postconditions, invariants as the vocabulary. Links to Encapsulation and invariants-in-one-place.
- Hyrum's law as a caution: anything observable gets depended on, so expose less. Supports Deep Modules.
- Program to an interface / dependency inversion, WITH guardrail: only at real seams (external system, a boundary you must test across, a second implementation that exists). Otherwise one-implementation interfaces add layers (conflicts with Minimize Reader Load, Rule of Three).

Skip:
- Postel's law: deliberately rejected; conflicts with Boundary Discipline (validate strictly at the edge).
- Interface segregation (cuts against Deep Modules); Liskov substitution (inheritance only; prefer composition).

### Deep Modules (discussed)

Keep:
- Deep over shallow (Ousterhout): interface much simpler than implementation. Lead principle. Warning signs: forwarding-only wrapper, class with many small methods mirroring its fields, signature as long as the body.
- Information hiding: internals stay private so changes don't ripple. Encapsulation (State section) is the data-level version; cross-reference.
- Tell, don't ask: tell an object what to do rather than pulling its data out, deciding outside, and writing back. Pairs with Encapsulation (behaviors over getters/setters).
- Composition over inheritance.
- Separation of concerns / single responsibility, WITH careful definition: one reason to change or one body of domain knowledge, not one method per class. Tie to Model the Domain (execution order is not ownership). Guard against many tiny classes.

Skip:
- Law of Demeter (user decision).
- Open/closed (speculative extension points, conflicts with Laziness Protocol).
- Fixed function-length rules (splitting to hit a line count makes modules shallower; Minimize Reader Load covers the real goal).

### Product design (discussed)

Keep:
- Principle of least surprise (behavior, naming, defaults, side effects).
- Make the common case easy and the rare case possible (sensible defaults; options exist but stay out of the way).
- Progressive disclosure.
- Errors that say what happened and what to do next ("Invalid input" fails; "Port 8080 is in use; pass --port to choose another" passes).
- Consistency with what already exists (conventions of the product and codebase).
- Thin vertical slice first (smallest end-to-end version, then widen). Concrete practice, not Gall's law.
- Accessibility baseline for anything with a UI (keyboard operable, readable contrast, labeled controls); UI work only.

Skip:
- UI laws (Fitts, Hick, etc.): too specialized, invites fussy over-design.
- Jobs-to-be-done and product strategy frameworks: what to build comes from the human.

### Code Hygiene (discussed)

Keep:
- Boy Scout rule: leave the code you touch a little cleaner. Own scope in the wording: clean code you're already working in; propose larger cleanups separately.
- Broken windows: fix small messes while you're there; don't build on sloppy code.
- Intention-revealing names (include named constants over magic numbers); ties to ubiquitous language.
- Comments explain why, not what; delete comments that restate the code.
- No dead or commented-out code (git remembers). Overlaps Subtract Before You Add by design (that = before building, this = after).
- Leave no scratch behind: debug prints, temp files, stray experiments, stale TODOs.
- Let tools enforce style (formatters/linters); same idea as Encode Lessons in Structure.
- Beck's rule, simplified for the agent: restructure first (own commit), then make the behavior change. Partly resolves the delivery-conventions question.

(User explicitly approved only the Beck item; the rest were taken as accepted. Confirm if any should be dropped.)

Skip:
- Rigid hygiene metrics (coverage targets, line/function length).
- "Never leave a TODO" (stale/orphaned TODOs are the problem; covered by "leave no scratch behind").

### Agent Behavior (DEFERRED)

Candidates proposed, not decided: read before you write; stay in scope and surface adjacent problems; report faithfully; prefer reversible steps and checkpoint before risky ones; verify recalled library/API behavior against docs or source; delegate with a clear brief and check what comes back; keep changes small and reviewable. Proposed skips: "always plan first" (fold into reversible steps), time-boxing (covered by Attack the Premise).

### Writing good tests (discussed)

Frame: a test is a cost that has to earn its place. Most agent-written tests have little or negative value.

When to write:
- Write a test to defend logic (branching, calculations, state transitions, parsing, edge cases).
- Write a regression test for every bug fixed: fails before the fix, passes after (failing-test-first; links Fix Root Causes).
- Every test must name the failure it would catch. If you can't, don't write it (extends "would it pass if stubbed out?" from Test Behavior, Not Implementation).

When NOT to write:
- Trivial code (getters, pass-throughs, wiring).
- Library/framework behavior.
- Constants and config values.
- Anything the type system already enforces.
- Implementation details (make refactors painful).
- Duplicates of existing coverage; delete these.

How to write the ones that remain:
- Mock only at real boundaries (external services, time, randomness). Don't mock your own code. More setup than assertions is a smell. Prefer simple fakes to mock-call assertions.
- One behavior per test, named for the behavior; arrange-act-assert.
- Deterministic and independent. Flaky tests are fixed or deleted, never retried.
- Choose the level where the behavior lives: unit tests for logic, integration for how pieces fit, nothing for glue.

Skip:
- Coverage targets (gamed, says nothing about quality).
- Blanket TDD. Failing-test-first for bug fixes and logic-heavy changes only.

Cross-link to Verification: passing unit tests do not prove the code meets its intent.

### Verification (DEFERRED)

Candidates proposed, not decided: define done before you start (checkable criteria); re-read the original request at the end; try to break it (empty/null/huge/concurrent/error paths); review your own diff as a reviewer; check the blast radius; run the project's existing gates (necessary, not sufficient); separate verified from assumed in the final report (cross-ref Agent Behavior "report faithfully"); done = works, simple, verified, clean; conditional independent review for large or risky changes. Proposed skips: mutation testing / formal verification, mandatory manual QA scripts.

### Tactical coding (discussed)

Keep:
- Change one thing at a time, and bisect (halve the search space, e.g. git bisect).
- Search before you write: check the codebase, stdlib, and existing dependencies first; a new dependency is a deliberate cost. Overlaps (acceptably) with deferred "read before you write" in Agent Behavior.
- Fail fast and don't swallow errors; errors carry context about what was being attempted. Related: Fix Root Causes (a guard that silences a crash is a symptom fix).
- Tracer bullet: cross-reference Product design's thin vertical slice, not listed twice.
- Encode Lessons in Structure placed here (user's lean).

Decided against:
- "Don't program by coincidence" as its own principle (folded into Fix Root Causes as an explanation check).
- Rubber-duck debugging, time-boxing.

DEFERRED: Error handling as its own group (what to throw/catch, caller recovery, error messages as part of the contract). Start with the fail-fast item; split out later if more principles show up.

### State & domain modeling (discussed)

Keep:
- Primitive obsession (named smell; fix with value objects)
- Value objects vs. entities (one-line distinction)
- Invariants live in one place; changes go through it
- Ubiquitous language (names match the domain)
- Immutability by default
- Explicit transitions (cross-reference Model the Domain's state machines)
- Command-query separation (tentative; user said all good)
- Encapsulation: keep state private, change it only through operations that enforce the rules; don't add getters/setters just to wrap a field (shallow, fake encapsulation). Prefer behaviors (`order.cancel()`) over setters (`setStatus`). Cross-reference Deep Modules (hiding is its root idea).

Skip: bounded contexts, repositories, domain events, rest of tactical DDD ceremony (over-engineering risk, conflicts with Laziness Protocol).

## Group definitions (user's working descriptions)

- **Simplicity Scales**: how to design, write, and refactor code to maximize simplicity and elegance. Goes beyond YAGNI: recognize when a previous bad (or no-longer-best) decision is driving the next sub-optimal one; always look for refactors that remove unnecessary complexity; deliberately organize the complexity that must exist into predictable, explicit places so it is easy to find and understand, not hidden throughout the system.
- **Contracts & Models first**: think about the system's design before implementation; how components interact through models and interfaces, rather than writing logic first and adapters between pieces afterward.
- **Deep Modules**: organize code into logical blocks with clear, easy interfaces that hide complexity from callers.
- **Design**: product design (not code design).
- **State Change**: how state should change within a system. Work through DDD, primitive obsession, etc. in this section.
- **Code hygiene**: clean up and leave code better than you found it (Boy Scout rule).
- **Agent Behavior**: SOP for agents as they code; how an agent should spend its context.
- **Writing good tests**: how and when to write unit tests. Core piece: when NOT to write tests and not over-writing them; most agent-written tests have little or negative value.
- **Verification**: how an agent knows what it has done is correct and done.
- **Tactical coding**: how to code well; another SOP, but about coding (Agent Behavior is about how the agent spends its context).

## Proposed groupings (draft)

- **Simplicity Scales**: #1 (Laziness Protocol), #3 (Redesign from First Principles), #5 (Subtract Before You Add; removing noise that could lead to a sub-optimal design, so it stays here rather than in hygiene), #6 (Minimize Reader Load; sub-category TBD)
- **Contracts & models first** (order of work: contracts/interfaces before logic and adapters): #2 (Foundational Thinking); add contract-first / API-first / design-by-contract material. Model the Domain and Type System Discipline appear here AND under State (overlap is fine; principles need not be fully DRY).
- **Deep modules** (small interface hiding complexity; how a module is shaped and where it validates): #12 (Boundary Discipline), plus the module-ownership half of #11 (cross-reference)
- **Product design** (renamed from Design; not code design): #8 (Experience First), #9 (Exhaust the Design Space)
- **State & domain modeling** (what states are valid and how state changes; work through DDD, primitive obsession here): #11 (Model the Domain), #13 (Type System Discipline) [also in Contracts & models first], #14 (Make Operations Idempotent), #16 (Separate Before Serializing Shared State)
- **Code hygiene** (what you leave behind; no dead code, shims, or half-migrated states): #7 (Outcome-Oriented Execution), #15 (Migrate Callers Then Delete Legacy APIs)
- **Agent behavior** (name TBD; how the agent manages itself and its relationship to the human and other agents: context, autonomy, delegation; distinct from Tactical coding = how to work on the code): #22 (Guard the Context Window), #23 (Never Block on the Human)
- **Writing good tests** (own group, NOT part of Verification): #20 (Test Behavior, Not Implementation). Unit tests exist to defend logic. Core content to write: when NOT to write tests, don't over-write them. Agents treat piles of unit tests as their answer to verification; that is a major mistake.
- **Verification** (does the code meet intent; knowing when something is done and correct): #17 (Prove It Works); #21 (Explain the Number; home open vs. Benchmarking)
- **Tactical coding** (how to operate, not how to design): #4 (Attack the Premise), #10 (Build the Lever), #18 (Fix Root Causes), #19 (Sequence Work into Verifiable Units, execution half)

- **Unclassified**: #24 (Encode Lessons in Structure; leans Tactical coding, source says Meta)

## Decisions on group structure

- Model the Domain and Type System Discipline may appear in both Contracts & models first and State; overlap is fine.
- Simplicity Scales and Code hygiene stay separate, no shared scope boundary.
- Writing good tests is its own group: unit tests defend logic; Verification is about whether the code meets intent.

## Build-out (drafted while user was away, 2026-10-15)

Drafted all kept principles as one skill, now at `skills/in-progress/coding-principles/` (self-contained; maintainer README and check.py stay in `principles/in-progress/`). Design: one `coding-principles` skill, a short always-rules section in `SKILL.md`, and 11 topic files in `references/` (12 before product-design moved out) loaded on demand by activity. Uses the standard SKILL.md format, so no per-agent setup.

Decisions made while drafting (all easy to reverse; review these):
- Always-rules in SKILL.md: Laziness Protocol ("Smallest change"), Search before you write ("Reuse first"), Make it work/right/fast ("Working is not done"), Prove It Works ("Prove it"). Moved out of their groups so nothing is duplicated.
- Topic files are organized by activity, not by theme: simplicity, contracts, modules, domain-modeling, state-changes, hygiene, tests, verification, debugging, execution, agent-behavior.
- State & domain modeling split across two files (domain-modeling, state-changes) so each loads only for its activity.
- Tactical coding split across debugging and execution for the same reason.
- Boundary Discipline drafted as ONE entry ("Validate at the edge, trust the inside"); the split question is still open.
- Outcome-Oriented Execution and Migrate Callers drafted as ONE entry ("Finish the migration"); the merge question is still open (drafted merged because it is shorter).
- Build the Lever bar softened to "repeated, bulk, or hard to check by eye" (open question resolved by drafting; revert if unwanted).
- Explain the Number placed in verification.md (open: Benchmarking group).
- Encode Lessons in Structure placed in execution.md (Tactical coding, per user lean).
- Deferred groups drafted as proposals only: verification.md (all but Explain the Number) and agent-behavior.md.
- Error handling group still deferred; only Fail fast is drafted (execution.md).
- Ubiquitous language kept as a short entry in domain-modeling.md.

Independent review (fresh subagent) applied, with these judgment calls:
- Scope conflict between Stay in scope, Leave it cleaner, and Fix root causes resolved one way: fix small messes and instances only in lines/code you are already changing; report everything else. Leave it cleaner was kept (user's Boy Scout decision).
- Subtract Before You Add: kept the user's "remove, and restore on purpose if it breaks" stance; added a reference search (strings, config, tests) and "if you cannot tell, leave it and report it".
- Redesign from First Principles: trigger tightened to "special cases in more than one place AND redesign is simpler overall". Kept autonomous; only says so before starting when the redesign reaches beyond the module (reviewer wanted to always ask the human; that conflicts with Never Block on the Human).
- Delete-style wording narrowed so agents only delete what they added (Leave no scratch behind, flaky tests, weak tests, migrations). Flaky tests: do not delete without asking.
- Wait for the Third Occurrence narrowed so it does not conflict with One Source for Each Fact (rules, constants, schemas keep one source from the start).
- Replace Primitives with Value Types narrowed to avoid over-wrapping.
- Explore Before Committing now compares options in words; prototypes only when the choice depends on feel.
- Do the expected thing merged into Match what exists; Use the domain's words merged into Name for intent; Check the original request merged into Define done first; Review your diff merged into Run the gates; Separate verified from assumed lives only in SKILL.md; Keep changes small removed (duplicate of Smallest change).
- Kept despite reviewer overlap flag: Expose less (Hyrum's law, user-approved) and Hide information, and Thin slice vs Sequence work, since the activities differ.
- Renames for plainer titles: Build the Lever -> Script repeated work; Encode Lessons in Structure -> Turn repeated corrections into checks; Attack the Premise -> Test your assumptions; Blast radius -> Check what depends on your change; Prove It Works -> Verify before saying done.
- Kept "Working is not done" as a slogan title on purpose (user wanted agents to remember it).

PR #26 review round 1 (user notes):
- Product design moved out of the skill to `principles/in-progress/product-design.md` (product design and coding are different activities). Removed from the SKILL.md index and the skill's topic files.
- Simplicity made near always-on: new "Simplest design" always-rule in SKILL.md that sends the agent to `simplicity.md` on every change.
- Redesign when the design stops fitting: trigger broadened from "special cases in more than one place" to any added or changed requirement. This supersedes the earlier tightening.
- Subtract before you add: applies to every change, not only cluttered code.
- Design for the least code: moved up before Minimize reader load; trigger no longer mentions over-design (an agent does not know it is over-designing).
- Minimize reader load: "Cut" became "Minimize"; trigger covers designing, writing, and refactoring.

Smoke tests (headless Claude Code, skill copied to .claude/skills): retry + parallel workers task loaded only state-changes.md; a bakery-name question loaded nothing; a unit-test task loaded only tests.md and applied "skip these tests". `npx skills add . --list` finds the skill only under `skills/`, so it must move to `skills/in-progress/coding-principles` to be installable (verified in a scratch copy).

## Open questions

- Delivery conventions (from #19; partly resolved: restructure commit first, then behavior-change commit): stack commits/PRs so the sequence proves itself. Separate note or skill?
- #7/#15 merge?
- #12 split (functional core / imperative shell)?
- #16 home: State mutation vs. elsewhere.
- #21 home: Verification vs. a Benchmarking heading.
- #24 home: placed in Tactical coding (user's lean); source called it Meta.
- Error handling as its own group (deferred).
- Deferred groups: Agent Behavior, Verification (candidates saved above).
- Revisit #22 implementation (thin source).
- #10: soften the bar from "non-trivial"?
