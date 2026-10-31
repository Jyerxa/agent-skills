# Article shape

An article differs from documentation in one way that changes everything:
nobody has to read it. Documentation readers arrive with a task and will
tolerate a dry page to finish it. Article readers arrive with mild curiosity
and leave at the first paragraph that does not pay. Shape is what keeps them:
a problem they recognize, a promise, and a sequence in which each part makes
the next one wanted.

## The contract

The opening makes a contract: here is a situation you know, and here is what
you will understand by the end. The body keeps it, one concept at a time, on a
single running example. The ending hands the reader the thing they came for in
a form they can keep.

## Opening

The lede is the first one to three sentences. Its one job is to make the
reader recognize a situation and feel its tension. It fails when it
compresses the solution, uses the article's own vocabulary, or performs
cleverness.

- Use only words the reader already has. No term the article will define later.
- Show the situation concretely, with the two things in tension visible.
- Do not explain the solution. Name it, at most, in the sentence that follows.

Before:

> Ops needs today's orders by region with customer names and payment status
> in one row — the write model that enforces cancel and ship invariants
> cannot serve that shape without either lying or joining itself into a corner.

After:

> Checkout keeps orders in a normalized table because that is the easiest way
> to enforce rules like "never ship an unpaid order". The ops team wants
> something else: one flat row per order on today's board, with the customer's
> name, the items, payment status, and region, filterable without a five-table
> join on every refresh. One table cannot do both jobs well.

Then the promise, in a sentence or two: what the reader will be able to decide
or build. "This article shows how CQRS answers that, what it costs, and how to
tell when one table would have been enough." After the promise, state the
article's one idea in plain words, so the reader has a frame before the detail
begins.

Series metadata (read time, updated date, an "Intent" line) stays where the
template puts it. The lede and the promise go in front of it or directly under
it, whichever the template allows.

## Body

A body that reads easily follows this progression, whatever its headings are
called:

1. The situation and why the obvious approach fails. Use the running example.
   Show the failure, not only the claim of failure.
2. The idea, stated plainly, as what happens to the example.
3. The mechanism, one part at a time, in dependency order. For each part: what
   it is for, what it does to the example, what would go wrong without it.
4. The code, in segments that follow the same order as the parts.
5. The limits: where the idea costs more than it returns, and what to do
   about each cost.
6. The decision rule and the takeaway.

Each section opens with a sentence that says what it gives the reader and
closes on the thing that makes the next section necessary: "The board is now
a copy. Copies can be stale, which the next section is about." That hand-off
is what engagement feels like from inside. The reader is never asked to
decide whether to continue.

### The running example

Pick one concrete case and keep it for the whole article: the same names, the
same data, the same actors. Introduce every concept as something that happens
to it. Let the code use its names. Make the trade-offs things that go wrong
for it. When the source uses several examples, keep the richest and fold the
others in as variations, or move them to the limits section.

### Presenting code

Code is the highest-load part of a technical article, because every line is a
new element. Narrate it.

- Before a segment, say in one or two sentences what the reader should look
  for, using the names they are about to see.
- Keep a segment to roughly one screen and to one concept. A 250-line listing
  becomes five or six segments.
- After a segment, say what it showed, connect it to the concept, and hand
  off to the next segment.
- Use the code's own identifiers in the prose, the way the code uses them.
- When the source offers the same code in two languages, narrate one and say
  once that the other follows the same shape. Do not pair identifiers in every
  sentence.
- Keep the code verbatim. Explanation goes in the prose, not in new comments.
- If the publication needs the complete listing in one place, put it at the
  end as a reference, after the narrated segments.

### Tables and lists

A table is for facts the reader will look up or compare: short cells,
consistent columns. A list is for parallel items the reader will scan.
Reasoning, causation, and trade-offs are prose. When a source table holds
paragraphs, keep the table for the names and one-line roles, and move the
reasoning into the paragraphs that introduce each part.

### Trade-offs and limits

A trade-off has three parts: the situation in which it bites, what it costs,
and what to do. "Projection lag is a product decision" is a slogan. "A
customer who has just paid can refresh the board and still see Placed; decide
per screen whether to wait for the projector, read the write model directly,
or accept the lag" is a trade-off. Give each its own paragraph, led by the
situation.

## Ending

End with the takeaway, not a restatement. The takeaway is the smallest set of
sentences the reader needs in order to use the idea: the decision rule (when
to reach for it, when not) and the mechanism in about three lines. A
further-reading list follows, each entry with one line on what it adds that
this article did not.

## Series templates

Many series fix their headings (Intent, Problem, Structure, Implementation,
Trade-offs, Further reading, or similar). Keep the headings and their order.
The shape above fits under them: the lede and promise before the first
heading or inside the first section, the running example inside each section,
code narrated inside the implementation section, the takeaway inside the last
prose section. When a template heading hides what the section gives (a
"Structure" section that is really "the parts and what each is for"), let the
section's first sentence say it. Recommend template changes in the editor's
note; do not make them unasked.

## Voice

Direct, specific, and confident. Address the reader as "you" when the subject
is their decision. Opinions are welcome when they are the author's and stated
as such. Borrowed authority ("Fowler's blunt line") is not an argument: quote
the point, keep the attribution, and give the reason. No asides about the
article itself, no jokes that need a second read, no praise for the pattern.

## Length

There is no target. An edit that removes flourish and repetition but adds
definitions, a promise, and code narration often lands near the original
length. Judge by the load map and the claims list, never by word count.
