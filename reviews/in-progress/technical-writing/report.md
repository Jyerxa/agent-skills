# Technical writing skills: design and evaluation

These skills target explicitly requested technical writing. Their shared objective
is to minimize the reader's effort while preserving accurate understanding. They
do not claim full compliance with a third-party style standard.

## Package design

`technical-writing` organizes information, writes prose, and performs a final
revision. It calls `technical-revision` when available; otherwise it uses the same
procedure bundled locally. The reviewer does not call the writer, and the writer
does not run both review paths. A requested checkpoint overrides autonomous work.

`technical-revision` also works on existing drafts. Its independent choices are
scope (`prose`, `composition`, `both`) and mode (`autonomous`,
`recommend-and-approve`). Defaults are both and autonomous. Prose review preserves
organization. Composition review changes structure with only necessary connective
edits. Combined review resolves composition before polishing sentences.

The shared principles, revision procedure, pattern catalog, and upstream license
are identical in both folders. Checks compare their bytes and traverse the
references in isolated package copies. Edit shared material together. Stable
pattern IDs support later changes without growing a new checklist for every example.

Both skills have version 0.0.1 and lifecycle in-progress. Codex invocation policy
is explicit-only; descriptions and instructions also state that boundary for
agents that do not read Codex metadata.

## Source choices

- [Daniele Procida's Diátaxis](https://diataxis.fr/compass/) supplies the compass.
  The primary-purpose rule deliberately relaxes strict mode separation. Reference
  tables and brief explanation remain useful inside a how-to when they reduce effort.
- [Google's developer writing guide](https://developers.google.com/style/translation)
  supports plain words, precise modifiers, conditions before instructions, clear
  pronouns, and consistent terminology. These are contextual defaults, not quotas.
- [ASD-STE100's official overview](https://www.asd-ste100.org/STE_faq.html) supports
  controlled meanings and unambiguous language. The skills do not bundle the
  standard's dictionary or claim compliance. The overview was available through
  indexed official text; direct retrieval was unreliable.
- [Microsoft's concise-language guidance](https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences)
  largely confirms the existing principles. The small addition is choosing
  "because" when "since" could mean time. We did not import blanket brevity,
  brand voice, or general avoidance of ordinary verbs such as "is" and "has."
- [Lauren Tan's Unslop](https://github.com/cursor/plugins/blob/main/pstack/skills/unslop/SKILL.md),
  source blob `97f5b6412148fa5b2a2fe478836fe8923ffa5cbb`, supplies pattern coverage.
  Its [MIT license](https://github.com/cursor/plugins/blob/main/pstack/LICENSE) is
  included in each package. Credits inside skills are plain text, without URLs.

All upstream pattern categories are retained, consolidated into 22 stable signals:

| Upstream rule | Catalog |
| --- | --- |
| 3, 5 | P01, P02 |
| 7, 26 | P06, P07 |
| 8, 9 | P09, P10 |
| 10, 12 | P11 |
| 11 | P12 |
| 13, 14 | P18 |
| 15, 16 | P19 |
| 17–19 | P20 |
| 20, 22 | P21, P22 |
| 23, 24, 25 | P13, P04, P05 |
| 27–29 | P03, P15, P16 |
| 30, 31 | P04, P06 and writing principles |
| 32, 33 | P14, P17 |

P08 adds the user's `load-bearing`, `honestly`, `genuinely`, and `that matter`
preferences. Literal technical meanings, quotations, and code are protected.
The adaptations remove blanket punctuation bans, compulsory typography churn,
deletion merely because another project could say the same thing, and the
suggestion that replacing "quickly" with "fast" makes a claim concrete. An
unsupported claim needs evidence or a reported gap, not an invented measurement.

## Evaluation method

Fresh subagents received only the skill package, a request, and raw fixtures.
They did not receive the expected output or suspected failure. One subagent first
wrote an unguided guide without reading either skill. A different subagent then
revised that guide using only the independently packaged revision skill.

The fictional [Relay facts](fixtures/relay-facts.md) exercise attempt counts, retry
windows, response conditions, commands, uncertainty, and absent guarantees. The
[mode draft](fixtures/mode-draft.md) adds deliberate organization problems, the
four requested phrase signals, and protected occurrences in code and a quotation.
The [clean reference](fixtures/clean-reference.md) checks whether review can stop
without rewriting competent text.

## Observed behavior

The saved outputs below are unedited subagent artifacts, not ideal answers.
The parent checked factual constraints and scope boundaries; an additional
[independent assessment](observations/corpus-assessment.md) reviewed the corpus,
upstream coverage, and the first seven outputs before the targeted follow-ups.

| Request | Observation |
| --- | --- |
| Write without either skill, then revise with only technical-revision | The [444-word baseline](observations/unguided.md) became a [427-word revision](observations/revised-unguided.md). Navigation improved, retry limits moved before the response table, and the example command stayed byte-identical. The main benefit was organization, not shortening. |
| Author with both skills available | The [paired output](observations/authored-paired.md) preserves retry identity, attempt and time limits, response conditions, and uncertainty. The agent reported using the revision skill entrypoint. |
| Author with only the installed authoring package | The [isolated output](observations/authored-isolated.md) preserves the same constraints. The agent reported using the bundled revision pass. Its command also matches the source exactly. |
| Revise prose only | The [output](observations/prose-only.md) keeps headings and order. It removes all four requested phrases from editorial prose while retaining their exact occurrences in JSON and the quotation. |
| Revise composition only | The [output](observations/composition-only.md) puts limits before actions and improves grouping. It leaves awkward wording in retained sentences, including "Honestly" and "utilize," respecting the narrower scope. |
| Recommend, then approve only one item | The agent wrote a [proposal](observations/approval-proposals.md) without creating the target. After approval of B only, the [result](observations/approved.md) changes only that paragraph. All other text, code, and quotations remain identical. |
| Request outline approval during authoring | The agent produced an [outline](observations/outline.md) and did not create the draft. |
| Review already-clear reference text | The output is byte-identical to the [clean reference](fixtures/clean-reference.md). |
| Repeat approval mode after tightening its guidance | The [new proposal](observations/approval-concise.md) is 352 words versus 951 initially. It still names concrete changes and leaves the target absent pending approval. |
| Revise conflicting claims against an explicitly authoritative source | The [revision](observations/conflict-revised.md) corrects the [draft's](fixtures/conflict-draft.md) optional header, new-key retry, ambiguous count, and unsupported processing guarantee. It reports unspecified key generation and reconciliation separately. |
| Author a design proposal from a different technical brief | The [cache proposal](observations/design-proposal.md) follows the [requested form](fixtures/cache-brief.md), distinguishes TTL from eviction, preserves inventory requirements, and leaves benefits, sizing, and adoption unproven. |

Both scoped revisions preserved the mode draft's weaker "should" even though
the fact sheet requires the header. The agent surfaced that discrepancy instead
of silently claiming correctness. The targeted default-scope conflict test then
corrected unsupported claims when the source was explicitly authoritative. This
supports keeping scope and factual verification separate, without adding another
exception to the skill.

The independent review found two remaining output weaknesses: an unnecessary
"no client retry library is in scope" phrase in the paired output, and a header
table that repeats the adjacent command in the isolated output. The raw evidence
retains both. Existing relevance and duplication guidance already addresses them;
neither warrants a new universal rule.

## Changes after testing

Replaced the approval paragraph with shorter instructions to group related edits,
use minimal excerpts, and omit unchanged text. This reduced the procedure's size
and the next proposal's length while retaining the approval boundary. No new
pattern entries were added in response to individual output imperfections.

The final authoring entrypoint is 518 words; revision is 122 words. Including all
Markdown references, each independent package contains 2,323 and 1,927 words,
respectively. The shared material is the same 1,805 words in both packages, not
two competing rule sets. A check caps entrypoints at 650 words and each complete
Markdown package at 2,400; these are maintenance limits, not writing quotas.

## Reproduction and checks

For behavioral trials, start fresh agents with only the indicated package and
fixtures. Ask for a developer guide from `relay-facts.md`; generate the unguided
baseline without any skill, then give that output to a different revision agent.
For scoped and approval cases, use `mode-draft.md`, the facts, and explicit
instructions to preserve its JSON and exact quotation. Approve only proposal B
in the original approval trial. For the checkpoint trial, request an outline and
approval before drafting. Use the clean reference without requesting changes.
For the conflict trial, explicitly call the facts authoritative. Use
`cache-brief.md` for the design proposal. Save outputs outside the checkout and
compare artifacts, not just the agents' completion messages.

Package checks:

```sh
python -m pip install PyYAML==6.0.3
python reviews/in-progress/technical-writing/check.py
npx skills add . --list
```

The five package checks cover metadata and explicit invocation, shared-copy
identity, isolated reference resolution, unique pattern IDs, and size budgets.
Both skills also passed the skill-creator frontmatter validator. CLI discovery
found each name once, and separate scratch installations each copied only the
requested skill with its references. `git diff --check` and the outbound-link
scan passed. The workflow repeats package checks for relevant pull requests.

These are single-generation trials across one API guide and one design proposal,
not a reader study or a causal estimate of writing quality. Path reports from
agents supplement artifact checks but do not prove every internal decision.
Most contextual pattern exceptions and other document genres remain untested.
The skills remain in-progress for user review and further real-document trials.
