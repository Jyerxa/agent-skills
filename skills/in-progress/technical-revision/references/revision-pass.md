# Revision pass

Reduce reader effort while preserving meaning. Use this procedure on existing text
or a newly authored draft.

## Set scope and mode

Infer the reader and purpose from the request and source. Preserve required format,
voice, facts, uncertainty, requirement strength, identifiers, commands, code,
quotations, and citations. Never invent evidence for a rewrite.

| Scope | Allowed changes |
| --- | --- |
| Prose | Improve wording and sentences, and the presentation of steps, commands, and code; preserve organization, headings, order, and substantive coverage. Remove verbal filler and redundant phrasing. |
| Composition | Improve selection, grouping, sequence, headings, and depth. Reword only to connect changed sections or avoid duplication. |
| Both (default) | Review composition first, then prose. |

**Autonomous** (default): apply justified changes without a checkpoint.
**Recommend-and-approve**: give a concise, reviewable proposal, then wait. Identify
the location, reason, and exact replacement or new section order. Group related
edits and use minimal excerpts; omit unchanged or protected text from the proposal.
Do not edit the target or treat a preview as approval. Apply only the approved
subset without asking again; seek approval for materially new changes.
User-specified checkpoints take precedence.

## Composition, when in scope

Match content to the reader's goal. Diátaxis offers four primary approaches:
tutorial for learning by doing, how-to for a task, reference for lookup, explanation
for understanding. Preserve appropriate requested forms such as design proposals.

Compare the current sequence with the needed path. Find delayed answers,
prerequisites introduced after use, unexplained jumps, repeated coverage, vague
headings, and optional detail interrupting the main path. Keep conditions and
limitations beside their actions or claims. Supporting explanations and tables
can serve the primary purpose; separate them only when they distract.

When the document has a recognizable type, such as a runbook, tutorial, design doc,
or postmortem, check it against [document types](document-types.md). A missing part,
such as rollback in a runbook or owners in a postmortem, is a composition finding.
Follow the user's or repository's template when one exists. Flag missing facts
instead of inventing them to fill a part.

Move or cut the smallest amount needed. Preserve distinctive evidence and useful
repetition; do not add sections merely to demonstrate a review.

## Prose, when in scope

Apply the [writing principles](writing-principles.md) and [patterns](patterns.md).
Identify a reader cost before editing: confusion, unsupported emphasis, repetition,
inflation, or needless decoding. A matching word alone is insufficient. Prefer a
direct, supported statement; keep the original when no clearer equivalent exists.

For steps, commands, code, and output, apply [examples and procedures](examples-and-procedures.md):
put warnings before the step they affect, keep prompt symbols and output out of
command blocks, tag code blocks, and say where each placeholder's value comes from.
Never change the text of a command, flag, identifier, or code sample; report a
suspected error in one instead.

## Verify and stop

Compare against the source: facts, conditions, uncertainty, actors, quantities, and
requirements. When the text describes code, configuration, or data you can inspect,
check its commands, identifiers, and numbers against them. Report mismatches, source
conflicts, and contradictions within the document; do not resolve them by guessing
which version is right. Then read the result as its reader: they can act on it
alone, prerequisites come before first use, and the source's uncertainty survives. Check references, prerequisites, connections, scope, and approval
limits. Repair failures. Then check spelling, grammar, punctuation, and consistent
formatting of headings, lists, emphasis, and code. Do this last so you do not polish
text you later cut. Stop when no concrete reader benefit remains; avoid synonym
cycling or repeated polishing for novelty.

Deliver the revised artifact, or briefly say it needs no changes. Report unresolved
factual gaps or consequential assumptions; add a change report only if requested.
In approval mode, deliver the proposal and wait instead.
