---
name: technical-writing
description: 'In progress: Author technical documents when explicitly requested by name. Organize information for the reader, write clear prose, and revise the draft before delivery. Not an always-on style for chat replies.'
metadata:
  version: "0.0.1"
  lifecycle: "in-progress"
---

# Technical writing

**Minimize the effort required for the reader to develop an accurate understanding.**

**Remove anything that adds reading effort without helping understanding.** Cut
unnecessary words, sentences, and sections. Keep context, examples, and repetition
when they reduce the reader's effort. Brevity must not remove facts or qualifications.

Use only when the user invokes this skill. Honor the requested audience, format,
scope, and source material. Complete both phases and deliver the draft by default.
If the user requests an outline review or another checkpoint, pause there for
feedback before continuing. Keep planning proportional to the document; a short
answer does not need a separate planning artifact.

Read the [writing principles](references/writing-principles.md) before drafting.

## 1. Organize the information

Identify the reader's goal, what they already know, and what they must understand
or accomplish. Infer these from the request and available material. If a missing
fact prevents an accurate draft, leave a specific gap or ask a focused question
when interaction is available; do not invent the answer.

Use the Diátaxis compass to choose the primary approach:

| Reader's need | Primary mode | Shape |
| --- | --- | --- |
| Action + learning | Tutorial | Guided practice with observable results |
| Action + work | How-to | Actions and decisions toward a task |
| Understanding + work | Reference | Consistent facts for lookup |
| Understanding + learning | Explanation | Concepts, connections, and reasons |

Give the document one primary purpose. Include supporting material when it helps
the reader achieve that purpose; separate it when it distracts. Use these modes
as guidance, not a requirement to recast a requested design proposal or incident report.

Outline the reader's path. Give each section a purpose and takeaway. Put essential
information before optional detail, introduce prerequisites before their use, and
keep conditions and limitations beside the information they qualify. Use headings
that help the reader find answers.

Check the outline for missing prerequisites, unexplained jumps, repeated coverage,
and sections that do not serve the goal. Adjust it before drafting. Do not pause
for outline approval unless requested.

## 2. Write the information

Draft from the outline using the writing principles. Use familiar, precise words,
direct sentences, consistent terms, and concrete facts. Remove filler at every
level. Let each paragraph develop one main point, with enough connection to the
next for the reader to follow the explanation.

Preserve source facts, uncertainty, commands, identifiers, and the strength of
requirements. Do not replace a vague claim with an invented mechanism or number.
Check technical claims against the available source material.

Before delivery, run technical-revision if it is available. This invocation
includes that revision; do not request another invocation. Otherwise use the
bundled [revision pass](references/revision-pass.md) and its
[pattern catalog](references/patterns.md). Follow one path, not both. Reuse guidance
already read. Default to both composition and prose, autonomously; honor requested
revision options and checkpoints. Revision never restarts the authoring workflow.

Deliver the requested artifact without a process report unless requested. Mention
only assumptions or unresolved gaps that affect its use. The pattern catalog adapts
Lauren Tan's Unslop, with its [MIT notice](references/unslop-license.txt).
