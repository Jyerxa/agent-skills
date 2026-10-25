# Independent corpus assessment

Retain the current division between authoring and revision. These outputs support the design: revision improves navigation and removes filler without losing the supplied API constraints, and either installed skill contains the guidance it needs. I found no evidence that warrants another rule or a broader rewrite of the skills.

## Observed results

- **Revision improves the baseline chiefly through composition.** `unguided.md` already contains little verbal filler. `revised-unguided.md` adds useful navigation and puts both retry limits before the response table (lines 25–39), where readers need them. It also combines the identical HTTP 503 and timeout wait rules. The reduction from 444 to 427 words is modest; the meaningful improvement is fewer opportunities to act before seeing a qualification.
- **Authoring works with and without the separate reviser.** Both authored versions preserve the example command and all consequential behavior: the original key and identical body, 24 hours measured from first acceptance, three total attempts, specified waits, conflict handling, authentication failures, reconciliation, and the limits of the documented guarantee. Neither invents a key-generation method, lookup endpoint, latency promise, or exactly-once processing. The paired version checks the limits again after waiting (line 43); the isolated version addresses a wait crossing the window (line 51). These are useful consequences of the supplied rules. The paired and isolated outputs are 477 and 469 words, so neither demonstrates a brevity advantage over the baseline. Their extra structure is generally useful, though the isolated header table repeats what the adjacent command shows.
- **The scope boundary holds in the supplied cases.** `prose-only.md` keeps every heading and the original order while removing inflated praise and improving sentences. `composition-only.md` moves limits ahead of retry instructions, groups errors separately, and leaves “Honestly,” “utilize,” “in order to,” and the passive sentence intact. Removing the whole decorative opening claim is consistent with composition's authority over content selection; retaining its remaining awkward sentence is consistent with the narrow permission to reword.
- **The four requested signals are handled contextually.** All four disappear from editorial claims in the prose-only output, while the JSON and exact quotation remain unchanged (`mode-draft.md` lines 31–36; `prose-only.md` lines 31–36). The composition-only output also preserves those protected examples. This is stronger evidence than a simple absence check.

One source discrepancy needs careful attribution: `mode-draft.md` says the client “should” use the header, although `relay-facts.md` says every request needs it. Both scoped revisions retain that weaker requirement. Their preservation of the supplied draft's requirement strength follows the revision instructions; without the actual test prompts, I cannot establish that they received the authoritative fact sheet and should have corrected it. This is not evidence of a newly introduced factual error.

## Corpus and upstream coverage

The author explicitly calls technical-revision when available and otherwise selects its bundled pass; the “one path, not both” and “never restarts” instructions avoid a recursive or duplicated workflow. Both skills clearly default to both scopes and autonomous editing. Approval and checkpoint behavior is specified, though these supplied outputs do not test it.

The reference directories are byte-identical, and the inspected package links stay inside their respective folders. Each agent configuration disables implicit invocation. Static inspection supports independent usability; prose outputs alone cannot prove which revision path executed.

All active upstream Unslop concerns have a home in the catalog. Several are combined sensibly: groups of three and false ranges in P11; punctuation in P18; bold and repetitive labels in P19; presentation conventions in P20. Plain-word, adverb, hedging, and brochure-language concerns are covered by P03/P04/P06 and the shared principles.

The exceptions improve the upstream rules. They protect literal technical vocabulary, useful analogies and contrast, meaningful uncertainty, exact labels and quotations, and clarifying punctuation. They also correct two questionable upstream prescriptions: replacing “runs quickly” with equally unsupported “is fast,” and deleting any sentence another project's documentation could use. Requiring a concrete reader cost before editing keeps this from becoming a word-ban exercise. The test directly validates protected code and quotations; most other exceptions remain untested.

## Changes worth making

No additional skill rule is justified by this evidence. For the paired output, delete “no client retry library is in scope” (line 21): it describes the evaluation boundary, while the preceding sentence already tells readers that the command does not retry. This is an output cleanup under the existing standard, not a reason to add a prohibition. Before changing requirement-preservation guidance, test a draft that conflicts with an explicitly supplied authoritative source.

These are single outputs from one fictional API task, without execution traces, generation prompts, repeated trials, or reader testing. The unguided baseline is already good. The results demonstrate plausible improvements and successful narrow scope handling, not a causal estimate of skill effectiveness or proof of general reliability.
