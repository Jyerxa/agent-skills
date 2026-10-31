# Editing pass

The steps have an order because each one protects the next. The load map
says what to fix. The claims list says what you may not lose. The spine says
where everything goes. Rewriting before those exist produces smoother
sentences in the same confusing order.

## 1. Set the brief

Confirm the reader, scope, mode, template, and constraints from the request
and the article (see the skill's "Take the brief"). Note each assumption you
make; it goes in the editor's note.

## 2. Read as the reader and map the stops

Read the article once, at reading speed, as the intended reader rather than
as an editor. Record every place you stopped and why. The usual causes:

- A term used before it has meaning, or defined only by context later.
- A sentence that introduces more than one new idea.
- A metaphor or compressed phrase you had to decode into the mechanism it
  stands for.
- A reference to something outside the article: another article, "the
  catalog", "the brief", "as discussed" when nothing was discussed.
- A point you have already read, argued again.
- A table cell or list item that is really a paragraph.
- Code with no guidance on what to look for, or an explanation of code far
  from the lines it explains.
- A heading that does not say what the section gives you.
- The moment you lose the thread and can no longer say what the article is
  building toward.

Also note what works: a concrete scene, a clean definition, a sentence that
lands. Those stay.

A dozen stops in two thousand words is normal for a first draft. The map is a
work list, not a verdict on the author.

## 3. List the claims

Write down what the article asserts, one line each, in source order: facts,
mechanisms, conditions and exceptions, trade-offs, recommendations, numbers,
names, and citations. Include claims you suspect are wrong and mark them for
the note rather than fixing or dropping them silently.

This list is the fidelity contract. At the end, every line is either present
in the edit, with its conditions, or recorded in the note as cut with a reason.

## 4. Find the spine

Answer three questions:

- **The idea.** In one sentence, what should the reader understand that they
  did not before? If the source does not reduce to one sentence, it may be
  two articles. Say so in the note and edit the one the title promises.
- **The running example.** Which concrete situation can carry the whole
  article, from the opening through the code to the trade-offs? Prefer the
  example the source already uses. Give it stable names.
- **The concept order.** List the concepts the reader must hold, in
  dependency order, so that each is defined using only the ones above it.
  This order, not the source's order, decides the sequence of sections and
  paragraphs.

## 5. Restructure

Build the outline from the [article shape](article-shape.md) and the concept
order. Then map every source paragraph, table row, list item, and code block
onto it, marking each keep, move, merge, split, or cut. Cut only repetition and
flourish; a claim is never cut here, only moved. When a template fixes the
headings, fit the outline under them.

Check the outline before rewriting: no concept used before its place; the
running example present in every section; each section making a distinct
contribution; code split into segments that each serve one concept; limits
beside the claims they limit.

In `prose` scope, skip this step and keep the source order, but still build
the concept order so that definitions land at first use.

## 6. Rewrite

Work section by section in the new order, applying [reader load](reader-load.md),
the [article patterns](article-patterns.md), the [writing principles](writing-principles.md),
and the [prose patterns](patterns.md).

For each paragraph: lead with the point, then the reasons, evidence, or
example; introduce one new element; tie it to the running example; end where
the next paragraph can begin. For each sentence: one job, subject and verb
close together, plain words, qualifications attached to what they qualify.

Write definitions where the term first appears, in a clause the reader can
skim once they know it. Replace clever compression with the mechanism it
stands for. Replace an external reference with the clause the reader needs,
or remove it. Turn paragraph cells into short cells plus a sentence of prose.
Narrate code: what to look for, the segment, what it showed.

Do not pad, and do not compress into fragments. The right length is the one
that leaves no stop on the map and no claim off the list.

## 7. Verify

- **Claims:** walk the list. Each is present with its conditions, or in the
  note.
- **Terms:** each defined before use and named one way throughout. Names in
  prose match names in code.
- **Code:** identical to the source. Run `scripts/check_fidelity.py` when both
  files are available; it also lists identifiers, numbers, and links that
  disappeared, which usually means a claim went with them.
- **Flow:** read the edit once at speed. Any new stop goes back to step 6.
- **Template, constraints, title, metadata, and further reading** honored.
- In approval mode: the proposal covers every intended change with locations
  and exact replacements, and nothing has been applied.

## 8. Deliver

The article, then the editor's note: structure changes, cuts, author
questions, assumptions. Stop when no stop remains that you can remove without
inventing a fact. Do not polish for novelty.
