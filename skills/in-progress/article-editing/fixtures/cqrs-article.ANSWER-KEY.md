# Article editing evaluation key

Do not supply this file, the reference edit, or the maintainer checks to a
blind editor. Judge the decisions an edit makes, not its wording, its length,
or whether it matches the reference edit sentence for sentence. The reference
edit (`cqrs-article.EDITED.md`) is one good answer, not the only one.

Sample request: "Edit `cqrs-article.md` so that a backend developer who has
not used CQRS is engaged from the first line, reads without stopping, and
finishes with a complete and accurate understanding. The series uses fixed
section headings; keep them. Do not change the code."

## Stops a good edit must find and remove

- **The lede** uses "write model", "invariants", and "that shape" before any
  of them has meaning, and ends in a metaphor ("joining itself into a
  corner"). The edit opens with the situation in plain words: normalized
  orders with rules, and an ops board that wants one flat row per order.
- **No promise.** Nothing says what the reader will be able to decide or
  build. The edit adds one or two sentences, and names CQRS before the first
  heading.
- **External context.** "The catalog signal", "the catalog's do-not-use-when",
  and "the complexity bill the brief names" refer to material the reader does
  not have. The edit inlines the needed clause or removes the reference. The
  "Catalog signal" heading itself stays, because the template requires it.
- **Stacked sentences** built on dashes and colons throughout the opening,
  the problem section, and the post-code paragraph. The edit splits them,
  one new element each, with conditions kept beside their statements.
- **Paragraph cells.** The Structure table's cells hold sixty-word paragraphs
  with nested parentheses. The edit keeps a short table (part and one-line
  job) and moves the reasoning into prose, or replaces the table with short
  subsections.
- **Dependency order.** The source introduces the parts as command side,
  query side, projection, consistency boundary, fact emission. A good edit
  orders them as a change flows: write model, fact emission, projector, read
  model, consistency boundary, so each is defined using only the ones before.
- **Preview overload and the code wall.** The implementation section
  summarizes every method before the listing, shows 250 lines unbroken, then
  explains them in one paragraph far from the code. The edit splits the
  listing into segments in concept order, each with a sentence before (what
  to look for) and after (what it showed), and distributes the post-code
  paragraph across them.
- **Paired identifiers** ("SaveAsync / save", "GetForEditAsync / getForEdit").
  The edit narrates one language and mentions the other once.
- **Re-argued point.** "Use one model if one will do" is argued in The
  Problem, Trade-offs, and Catalog signal. The edit argues it once (Trade-offs
  is the natural home), leaves a clause elsewhere, and cuts the rest.
- **Flourish.** "Lag the ledger by a beat", "melting the write path",
  "Fowler's blunt line", "the architecture diagram looked incomplete without a
  box labeled CQRS". The edit states the mechanism or the reason instead.
- **Missing takeaway.** The article ends on a restatement. The edit gives the
  reader the decision rule and the mechanism in a few lines, inside the last
  prose section the template allows.

## Claims that must survive

Spot-check these; losing any of them without a line in the editor's note is
a failure:

- The three failure modes of a single store: different shapes (with the
  customer-rename update anomaly), independent scale (board traffic often an
  order of magnitude higher; locks or row contention on pages the board
  scans), different ownership (billing versus fulfillment; a board migration
  becomes a write-path risk).
- The write model persists as normalized rows or an event stream; event
  sourcing is a separate decision; CQRS and Event Sourcing require neither
  the other; "we want events" is not a reason.
- Fact emission through a Transactional Outbox or the event store's
  subscription feed, and why a dual write to a broker loses facts on a crash
  between commit and publish.
- The projector's two guards: an inbox keyed on subscriber and fact
  (Idempotent Consumer), and an atomic per-row version guard (insert, or
  update only where the stored version is lower). Claim and apply in one
  read-store transaction. A missing predecessor throws so the claim rolls
  back and the fact is retried, not dropped.
- The consistency boundary: how stale a read may be, which paths wait for a
  version, which rare paths read the write model. Without it, every screen
  assumes the board is current and every delay looks like data loss.
- Commands never write the read model; queries never change the write model;
  the projection is the only bridge and is asynchronous unless deliberately
  made synchronous in-process, which couples the models again.
- Saves take an expected version and throw on conflict; concurrent Ship and
  Cancel cannot both win; the loser reloads. Commands return the version so
  the UI can wait for it or use the write-model escape hatch.
- The sketch is self-contained (no MediatR, Marten, or KurrentDB client);
  production adds brokers, competing consumers, and rebuild tooling; the
  frameworks named encode the split but the pattern is the two models plus
  the boundary.
- "Today" in the sketch is the UTC calendar day; production often uses a
  region-local boundary.
- All six trade-offs: one model usually wins (the split doubles what you
  evolve: projector change, read-model migration, rebuild); projection lag is
  a product decision (version wait, write-model read, or do not split for
  that screen); invariants stay on the write side and projections stay dumb;
  CQRS does not require Event Sourcing; rebuilds and dual evolution cost
  time, disk, and a cutover plan; never write through the read model.
- The catalog signal sentence and the three further-reading entries with
  their summaries.

## Expected restraint

- The code is byte for byte the source's code. Splitting it into segments is
  expected; changing a line, a comment, or the order of a complete listing is
  a failure. `scripts/check_fidelity.py` checks this.
- No new mechanism, number, or product claim. A walk-through derived from the
  code (for example, that a Paid order is at version 2 in the sketch) is
  acceptable when the note says it is derived. A claim the source and code do
  not support, such as a rule for when to choose Event Sourcing, is a failure.
- The template headings and order stay: Intent, The Problem, Structure,
  Implementation, Trade-offs / Where it bites, Catalog signal, Further
  reading. Renaming them unasked is a failure; recommending renames in the
  note is expected.
- Title, read time, and updated date stay.
- The intent line may stay verbatim; it is the series' canonical statement.
- Length is not a criterion. A good edit often lands near the original
  length: shorter prose, longer code narration.
- No chatty framing, no description of the editing process in the note.

## The editor's note

A useful note lists the structural moves, each cut with a reason (quoting
substantive text), the author questions (at minimum: the missing TypeScript
tab if the site uses one, and the series-catalog references), and the
assumptions about reader and template. It should fit on one screen.

## Grade the edit

A strong edit removes every stop above, preserves every claim, keeps the
code and the template, and reads once at speed without a new stop. A
reader who knows nothing of CQRS should be able to say, after reading, what
the five parts are, why the board can be stale, and when not to use the
pattern. An edit that is smoother but loses a trade-off, invents a mechanism,
or still opens with the article's own vocabulary has failed, however well it
reads.
