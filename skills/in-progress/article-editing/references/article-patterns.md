# Article patterns

Signals that recur in technical articles, especially drafts written quickly
or by a model. Each is a prompt to look for a reader cost, not a rule. The
[prose patterns](patterns.md) (P01 to P22) cover sentence-level signals and
apply alongside these.

IDs are stable; never renumber or reuse them. Prefer editing an existing
entry. Add only recurring problems with distinct remedies.

## Opening

**A01: Lede that assumes the conclusion.** The first sentence uses the
article's own vocabulary ("write model", "invariants", "that shape") or
compresses the solution. The reader cannot recognize the situation because it
is described from the far side of understanding. Rewrite with only words the
reader has, showing the two things in tension. Keep any concrete scene it
contains.

**A02: Missing promise.** Nothing in the first lines says what the reader will
be able to do or decide. Add one or two sentences after the lede. Do not grow
it into an abstract.

**A03: Preview overload.** A paragraph summarizes every part of the mechanism
before any part has been explained ("places, marks paid, ships, and cancels
under invariants, emits facts through an outbox-shaped hook, and a projector
that maintains..."), or a sentence lists all the parts by their unexplained
names right before the paragraphs that define them. Replace with the one idea
and the names of the parts, and let each part be explained where it appears.
When a table already summarizes the parts, the sentence is a third summary;
cut it.

## Sequence

**A04: Term before definition.** A term is used before it has meaning, or its
definition arrives sections later. Move the definition to first use, in a
clause. Count a term as known only if the reader or the series glossary
already has it.

**A05: External context.** "The catalog signal", "the brief", "the
do-not-use-when", "as discussed" with nothing discussed. The reader has no
catalog open. Inline the clause the reader needs or remove the reference.

**A06: Re-argued point.** The same warning or rule argued in full in several
sections. Keep the argument once, where the reader can act on it; reduce the
others to a clause or remove them.

**A07: Parenthetical cross-reference.** A sentence interrupts its main idea to
name another pattern or article ("typically Idempotent Consumer discipline
(inbox keyed on (subscriberId, factId))"). Finish the idea, then give the
cross-reference its own sentence, or move it to further reading.

**A08: Lost thread.** A section whose contribution to the one idea cannot be
stated in a sentence. Give it a job, merge it, or cut it; the claims it
carries move elsewhere.

## Presentation

**A09: Stacked sentence.** Three or more ideas joined by dashes, colons, or
semicolons. Split, one new element per sentence, keeping each condition
attached to its statement.

**A10: Clever compression.** A metaphor or aphorism where the mechanism should
be ("joining itself into a corner", "lag the ledger by a beat", "melting the
write path", "the complexity bill"). State the mechanism. Keep the figure only
when it is shorter and clearer than the literal statement.

**A11: Paragraph cells.** Table cells or list items holding paragraphs, often
with nested parentheses. Shorten cells to a name and a phrase; move the
reasoning to prose.

**A12: Code wall.** A long listing with no guidance before it and one long
paragraph after it. Split into segments in concept order, each with a
sentence before (what to look for) and after (what it showed).

**A13: Paired identifiers.** Prose that names the same thing in two languages
at every mention ("SaveAsync / save", "GetForEditAsync / getForEdit").
Narrate one language and say once that the other mirrors it.

**A14: Blank heading.** A heading that names a slot rather than what the
section gives ("Structure", "Where it bites"). Rename when the template allows;
otherwise let the first sentence say what the section gives.

**A15: Roll-call.** A list of libraries, vendors, or alternatives that does
not change what the reader does. Keep the ones the argument needs, or move the
list to further reading with one line each.

**A16: Borrowed authority.** An opinion carried by a name rather than a reason
("Fowler's blunt line is the right default"). Quote the point, keep the
attribution, and give the reason.

## Ending

**A17: Restated ending.** The last prose section repeats the opening instead
of giving the reader something to keep. Replace with the decision rule and the
mechanism in about three lines.

**A18: Further reading without a reason.** Links with a title but no sentence
on what each adds. Add the sentence. Drop a link only when the request allows
and the article never relied on it.

## Signposting

**A19: Announced section.** A sentence about the article instead of the
subject: "This section says what...", "The next section shows...", "This is
the rule to keep." The reader is told what they are about to read instead of
reading it, and an edit that adds these to every section has added a stop to
every section. Open with the section's first claim; hand off with the content
that creates the need for the next section. Keep a pointer only when the
reader must skip ahead or back to use the page ("the complete listing is at
the end").
