---
name: article-editing
description: 'Edit technical articles so readers stay engaged and reach a complete, accurate understanding with the least effort. Restructure, cut, and rewrite an existing draft without changing its facts or code; the same standard guides drafting a new article.'
disable-model-invocation: true
metadata:
  version: "0.0.1"
  lifecycle: "in-progress"
---

# Article editing

**Minimize the effort the reader spends to reach a complete, accurate
understanding, and keep them reading until they have it.**

Technical articles written quickly, by people or by models, fail in the same
way: the author already understands the subject, so the text compresses it.
Terms arrive before their definitions, one sentence carries three ideas, a
metaphor stands in for the mechanism, and the code appears as a wall. Each of
these costs the reader a stop. Enough stops and the reader leaves with half an
understanding, or leaves.

This skill edits for two qualities:

- **Engagement.** The reader always knows why the next paragraph matters to them.
- **Low load.** The reader never has to stop, re-read, look back, or guess.

In practice they are one quality seen from two sides: a reader who never has
to stop has no reason to leave.

Edit the article; do not re-derive the engineering. Every claim, condition,
trade-off, number, and citation in the source survives, or appears in the
editor's note as cut with a reason. Code stays verbatim.

## Take the brief

Establish from the request and the article itself:

- **The reader:** what they already know, and what they should be able to do
  or decide after reading. Infer from the article's level when not stated,
  and record the assumption.
- **Scope:** `prose`, `structure`, or `both` (default `both`). Prose keeps the
  order, headings, and coverage. Structure changes selection, grouping,
  sequence, and headings, rewording only to connect what moved.
- **Mode:** `autonomous` (default) or `recommend-and-approve`. In approval
  mode, deliver a proposal with locations, reasons, and exact replacements,
  then wait. Apply only what is approved.
- **Template:** when the article belongs to a series with fixed headings, keep
  the headings and their order and restructure within them. Propose changes
  to the template itself in the note; change the skeleton only when asked.
- **Constraints:** house style, length limits, protected text, a series
  glossary (terms earlier articles already defined), and whether code or
  captions may change.

Do not block on missing answers. Make the reasonable choice and record it.

## Run the pass

Follow the [editing pass](references/editing-pass.md). In outline: read once
as the reader and map every stop; list the claims the article makes; find the
spine (one idea, one running example, concepts in dependency order);
restructure by mapping every source paragraph onto the new outline; rewrite
section by section; verify fidelity and flow; deliver.

Read these before editing:

- [Reader load](references/reader-load.md): what makes technical prose hard to
  hold, and the editing move that removes each cause, with examples.
- [Article shape](references/article-shape.md): the structure of an article
  that earns and keeps attention, including how to present code.
- [Article patterns](references/article-patterns.md): signals specific to
  articles, with remedies.
- [Writing principles](references/writing-principles.md) and the
  [prose patterns](references/patterns.md): the sentence-level standard shared
  with the technical writing skills. Article shape replaces their guidance on
  organizing a document; everything else applies as written.

The patterns are review signals, not word bans. Identify the reader cost
before changing anything.

## Keep the facts

The edit may change order, grouping, headings, emphasis, wording, and how much
explanation surrounds a point. It may not change what is true according to
the source:

- Keep every claim, qualification, condition, number, name, and citation, or
  log its removal in the note.
- Add no mechanism, number, product claim, or opinion the source does not
  contain. When clarity needs a fact that is missing, write around the gap
  and ask the author in the note.
- Keep code byte for byte, including its comments. Splitting a listing into
  segments with prose between them is encouraged; editing the code is not,
  unless the request allows it. When both files are available, run
  `python3 scripts/check_fidelity.py source.md edited.md` before delivery. It
  confirms the code survived and lists identifiers, numbers, and links that
  disappeared.
- Keep the title, metadata, and further reading unless asked otherwise. A
  read-time estimate is derived from the text; update it when the site's
  formula is known, otherwise flag it in the note.

## Deliver

Return the edited article in the source format, then a short editor's note:

1. **Structure changes:** what moved, merged, or was added (a lede,
   definitions, code narration) and why.
2. **Cuts:** each removed claim or passage with its reason. Flourish and
   repetition take one line; anything substantive quotes the exact text.
3. **Author questions:** facts the article needs but does not contain,
   references to context the reader will not have, and claims you could not
   verify.
4. **Assumptions** about the reader and the template.

Keep the note short. Do not describe the editing process.

## Writing a new article

When asked to draft rather than edit, use the same references. Build the
spine first (idea, running example, concept order), write to the article
shape, then run the pass on the draft as if someone else had written it.

For maintainer evaluation, use the isolated [sample article](fixtures/cqrs-article.md),
its [answer key](fixtures/cqrs-article.ANSWER-KEY.md), and the
[reference edit](fixtures/cqrs-article.EDITED.md).

The prose pattern catalog includes material adapted from Lauren Tan's Unslop.
The [third-party notice](references/third-party-notices.txt) preserves the
source's copyright and license; it credits the original Unslop material, not
authorship of this skill as a whole.
