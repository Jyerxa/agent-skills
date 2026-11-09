---
name: technical-revision
description: 'Revise technical prose, composition, or both, with autonomous editing or approval before changes: cut wordiness, fit the structure to the document type, tidy steps and code samples, and flag facts that do not match the source.'
disable-model-invocation: true
metadata:
  version: "0.0.2"
  lifecycle: "in-progress"
---

# Technical revision

**Minimize the effort required for the reader to develop an accurate understanding.**

**Remove anything that adds reading effort without helping understanding.** Keep
facts, qualifications, useful examples, and connections between ideas.

**Accuracy comes before polish.** A shorter sentence that changes a requirement,
a flag, or a number is worse than the original. Revision preserves facts; it does
not certify them. When a fact conflicts with the source or with another part of
the document, flag it instead of choosing a version.

Follow the [revision pass](references/revision-pass.md). It defines scope, approval,
review order, and completion. Read the [writing principles](references/writing-principles.md)
for the shared standard and the [pattern catalog](references/patterns.md) when
reviewing prose. When the document has a recognizable type, such as a runbook,
tutorial, design doc, or postmortem, read [document types](references/document-types.md).
When it contains steps, commands, code, or output, read
[examples and procedures](references/examples-and-procedures.md). All required
guidance is bundled here.

Defaults: **both prose and composition; autonomous revision**. Honor explicit
user choices, including checkpoints. Apply this skill to the requested text,
not to unrelated chat or files.

The patterns are review signals, not word bans or evidence that a human did not
write the text. Cut a word only when it costs the reader something; keep words
that carry meaning, quoted text, and wording a standard or contract defines.

Deliver the revised artifact without a change report unless requested. After it,
mention only facts you flagged, source conflicts, and gaps the reader must fill.

The pattern catalog includes material adapted from Lauren Tan's Unslop. The
[third-party notice](references/third-party-notices.txt) preserves the source's
copyright and license; it credits the original Unslop material, not authorship
of this skill as a whole.
