# Reader load

A reader holds only a few things in mind at once. Understanding a technical
article means taking a few elements, connecting them, and storing the result
as a structure they can reuse. Anything that occupies that small space with
something other than the idea is a cost. Cognitive load theory names three
kinds, and each gives the editor a different move:

- **Intrinsic load** is the subject's real complexity: how many elements
  interact. You cannot remove it. You can sequence it so that only a few new
  elements are live at a time, and chunk it so that earlier elements become
  one unit the reader carries as a whole.
- **Extraneous load** is cost the presentation adds: decoding, searching,
  re-reading, holding a term that has no meaning yet, reconciling two names
  for one thing. Remove it.
- **Germane load** is the effort of building the structure. Support it with a
  worked example, consistent names, visible organization, and something to
  carry away at the end.

An engaging article is a low-load article that gives the reader a reason to
continue. The reason comes from a problem they recognize and a promise they
want kept; the [article shape](article-shape.md) covers that. This file covers
the load. The examples come from a draft article on CQRS, the pattern that
separates a system's write model from its read models.

## The moves

### Define before use

A term with no meaning is a slot the reader must keep open until the
definition arrives. Each open slot competes with the idea. Introduce a term
where the reader first needs it, define it in that sentence or the one before,
and from then on use only that term.

Before (the first sentence of the draft):

> the write model that enforces cancel and ship invariants cannot serve that
> shape without either lying or joining itself into a corner.

The reader must hold "write model", "invariants", and "that shape" undefined,
and decode a metaphor, before the article has said anything.

After:

> Checkout keeps one normalized orders table, built to enforce rules such as
> "an order cannot ship until it is paid". Ops wants a flat row per order for
> today's board: customer name, items, payment status, region. The same table
> cannot serve both well.

A series glossary changes what counts as known. If earlier articles defined
"aggregate", a one-clause reminder is enough; if not, define it.

### Concrete before abstract

A general statement is cheap to write and expensive to read, because the
reader must generate their own instance to test it against. Give the instance
first, then name the rule. The running example does most of this work: each
concept is introduced as something that happens to the example, and the
general name is attached afterward.

Before:

> Split the write model (commands, invariants) from one or more read models
> optimized for queries, accepting that they may lag or differ in shape.

After:

> Keep the orders table for placing, paying, shipping, and cancelling. Build a
> second, flat table just for the board, and update it from the first. The
> board may be a moment behind. That split is CQRS: commands go to one model,
> queries to another.

### One new element at a time

A sentence that joins three ideas with dashes or a colon asks the reader to
hold all three before any is resolved. Split it so that each sentence adds one
element to what the reader already has. A condition stays with the statement
it qualifies; that is one element, not two.

Before:

> CQRS splits them: commands mutate the write model; a projection pipeline
> builds read models for the shapes queries actually need — accepting that
> the board may lag the ledger by a beat.

After:

> CQRS splits them. Commands change the write model. A projector copies each
> change into the board's table, in the shape the board needs. Because the
> copy happens after the write, the board can be briefly behind.

### Say it once, where it matters

Re-arguing a point in three sections makes the reader check each time whether
this is new information. Argue once, where the reader can act on it. Elsewhere
a clause of reminder is fine and often helpful; a paragraph of repetition is
not. The repetition worth keeping saves a look back: a name, a condition, the
state of the example.

In the draft, "use one model if one model will do" is argued in the problem
section, the trade-offs, and the closing. Keep the full argument in the
trade-offs, one line in the closing decision rule, and remove it from the
problem section, which has its own job.

### Keep explanation next to its subject

When the explanation of a line of code sits two hundred lines away from it,
the reader splits attention between two places and loses both. Interleave: a
short paragraph, a segment of code, a short paragraph. The same applies to
conditions ("only when the row's version still matches") and to notes on a
table: put them beside what they qualify.

### One name per thing

Two names for one thing cost a reconciliation each time the second appears.
"Facts", "events", and "change records"; "board", "read model", and
"projection"; "SaveAsync / save". Pick the name the reader will meet in the
code and use it everywhere. When the source offers two languages, narrate one
and say once that the other mirrors it, instead of pairing identifiers in
every sentence.

### Plain statement over clever compression

A metaphor is worth keeping when it explains faster than the literal statement
and its limits are obvious. "Joining itself into a corner", "lag the ledger by
a beat", and "melting the write path" each require the reader to reconstruct
the mechanism the author had in mind, and the reconstruction may be wrong.
State the mechanism. Keep a figure of speech only when the literal statement
would be longer and less clear.

### Tables for lookup, prose for reasoning

A table promises that each cell can be read alone and quickly. A cell holding
a sixty-word paragraph with parenthetical cross-references breaks the promise;
the reader gets neither a scan nor a story. Keep cells to a name and a short
phrase. Put the reasoning in prose beside the table, or replace the table with
short subsections when the reasoning is the point.

### Signpost

Headings and opening sentences let the reader predict what comes next, and
prediction is what makes new material easy to absorb. A heading should say
what the section gives ("Why one table cannot serve both" rather than "The
problem"; "Where the split costs you" rather than "Where it bites"). A
section's first sentence should make the section's first claim, so the reader
learns what the section is about by reading it. "This section explains why
one store fails" is an announcement, and an announcement before every section
is a stop before every section. When a template fixes the heading text, the
first sentence does the job alone.

### Carry no external context

"The catalog signal", "the brief", and "the do-not-use-when" refer to
something the author has open and the reader does not. Either inline the
clause the reader needs ("the condition that justifies the pattern: read and
write shapes genuinely differ") or remove the reference. A link to an earlier
article is fine when the sentence still works for a reader who does not
follow it.

### Give the reader something to carry away

Understanding that is never retrieved is lost. End with the smallest statement
of the idea the reader can keep: the decision rule, the mechanism in three
lines, the one trade-off that decides. This is where a well-placed repetition
belongs.

## What this is not

- **Not a word budget.** Cutting flourish shortens an article; adding
  definitions and code narration lengthens it. Both are correct.
- **Not simplification of the subject.** The claims, conditions, and
  trade-offs stay. The reader should finish with the author's full
  understanding, reached more cheaply.
- **Not a ban on density.** A reader who already holds the concepts can take
  a dense sentence. The load map, read as the intended reader, decides.

## Sources

John Sweller, cognitive load theory: intrinsic, extraneous, and germane load;
the worked-example, split-attention, and redundancy effects.

Richard Mayer, principles of multimedia learning: coherence, signaling,
spatial contiguity, segmenting, and pre-training.

Steven Pinker, The Sense of Style: the curse of knowledge as the main cause
of unclear writing.

Daniele Procida, Diátaxis, and Google's developer documentation style guide,
by way of the bundled writing principles.
