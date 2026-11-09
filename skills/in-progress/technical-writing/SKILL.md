---
name: technical-writing
description: 'Author technical documents such as runbooks, tutorials, references, design docs, and postmortems: verify source facts, organize for the reader, write clear prose and examples, and revise before delivery.'
disable-model-invocation: true
metadata:
  version: "0.0.2"
  lifecycle: "in-progress"
---

# Technical writing

**Minimize the effort required for the reader to develop an accurate understanding.**

**Remove anything that adds reading effort without helping understanding.** Cut
unnecessary words, sentences, and sections. Keep context, examples, and repetition
when they reduce the reader's effort. Brevity must not remove facts or qualifications.

**Accuracy comes before polish.** A reader who runs a wrong command or repeats an
invented number is worse off than one who never read the document. Every fact
must trace to the source material or be marked as unverified.

Honor the requested audience, format, scope, and source material. Complete all
four phases and deliver the document by default. If the user requests an outline
review or another checkpoint, pause there for feedback before continuing. Keep
planning proportional to the document; a short answer does not need a separate
planning artifact.

Read the [writing principles](references/writing-principles.md) before drafting.

## 1. Gather the facts

Read the source material before planning: the request, provided notes, and, when
the document describes software you can inspect, its code, configuration, help
text, and existing docs. Collect the facts the reader will act on: commands,
flags, defaults, paths, environment variables, messages, outputs, limits, owners,
and times.

Verify what you can. Check each command and identifier against the code or help
text that defines it. Run examples when doing so is safe: local code, help output,
dry runs, and test environments. Never run a command with side effects on a real
system to verify it.

When sources disagree, prefer the one that defines or measures the behavior: code
over comments and old docs, a dashboard figure over an estimate in chat. Use it,
and tell the user about the conflict. Keep unconfirmed facts unconfirmed in the
document, for example "suspected" or "not yet reproduced." If a missing fact
prevents an accurate draft, leave a specific gap or ask a focused question when
interaction is available; do not invent the answer.

## 2. Organize the information

Identify the reader's goal, what they already know, what they must understand or
accomplish, and the conditions they read in: at a desk, during an outage, or
scanning for one value. Infer these from the request and available material.

Choose the document type. If the user, team, or repository has a template or an
established pattern for this kind of document, follow it. Otherwise read
[document types](references/document-types.md) for the reader question, essential
parts, and common failures of each type. When the request names no type, use the
Diátaxis compass to choose the primary approach:

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

## 3. Write the information

Draft from the outline using the writing principles. Use familiar, precise words,
direct sentences, consistent terms, and concrete facts. Remove filler at every
level. Let each paragraph develop one main point, with enough connection to the
next for the reader to follow the explanation.

For steps, commands, code, and expected output, follow
[examples and procedures](references/examples-and-procedures.md). Readers copy
these literally, so an error there costs more than an error in prose.

Preserve source facts, uncertainty, commands, identifiers, and the strength of
requirements. Do not replace a vague claim with an invented mechanism or number.

## 4. Revise and deliver

Revise the draft with the bundled [revision pass](references/revision-pass.md)
and its [pattern catalog](references/patterns.md). Default to both composition
and prose, autonomously; honor requested revision options and checkpoints. This
is the same procedure the technical-revision skill applies, so do not invoke that
skill as well. Revision never restarts the authoring workflow.

Then read the draft as its reader and repair what fails:

- The reader can complete the task or answer their question from this document alone.
- Every command, identifier, number, and time matches the source you checked.
- Every prerequisite appears before its first use, and every placeholder says where its value comes from.
- Uncertainty in the source is still uncertainty in the document.

Deliver the requested artifact. Write it to the path the user names or, in a
repository, where its documentation lives; otherwise answer in place. Do not add
a process report unless requested. After the artifact, mention only unverified
facts, source conflicts you resolved, and gaps the reader must fill.

The pattern catalog includes material adapted from Lauren Tan's Unslop. The
[third-party notice](references/third-party-notices.txt) preserves the source's
copyright and license; it credits the original Unslop material, not authorship
of this skill as a whole.
