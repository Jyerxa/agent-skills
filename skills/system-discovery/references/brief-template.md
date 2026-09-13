# System Brief Template

Use these sections to capture the interview. Scale their length to the system;
a small idea may need only a paragraph or a few bullets per section. Replace
the prompts with findings. Use "Unknown," "Not applicable," or "None surfaced"
where accurate rather than inventing detail to fill the template.

Separate agreement from completeness in the two status fields. For a partial
brief, list the unanswered discovery questions so another session can resume.

```markdown
# System Brief: <Name or working description>

**Agreement:** Draft / User-confirmed
**Design readiness:** Ready to begin / Provisional
**Basis:** <Conversation context and supplied document paths/sections>

## 1. Purpose and success

<Who has what problem, what they do today if known, and what improvement this
system should make. Include a concrete sign of success; use a numeric target
only if one was actually supplied or agreed.>

## 2. Actors

<People and automated actors, their goals, and meaningful differences in
access or responsibility.>

## 3. First useful version

- Included: <Capabilities needed for the initial outcome.>
- Excluded: <Explicit non-goals.>
- Possible later: <Tentative ideas, clearly distinguished from commitments.>

## 4. Main workflows

### <Workflow name>

- Trigger and actor: <Who starts it and why.>
- Starting information: <What they or an external system provide.>
- Journey: <The main steps in business language.>
- Outcome: <What the system changes or produces and who sees it.>
- Consequential exceptions: <Known failures or alternatives that affect the
  system's promises; mark unresolved behavior as a question.>

<Repeat for other workflows needed to explain the core scope.>

## 5. Domain concepts

<Important terms, meanings, relationships, and significant lifecycle changes.
These are concepts to investigate in design, not prescribed tables or classes.>

## 6. Responsibilities and external interactions

<What this system handles; what remains with people or other systems; what
information crosses those boundaries and who owns it, where known.>

## 7. Business rules

<Known rules and prohibited outcomes, including their source and consequence.
Distinguish confirmed rules from candidates that still need a user decision.>

## 8. Constraints and current context

<Existing technical commitments and material operating constraints, with their
source. Identify observed current behavior separately from intended behavior.
Record unknown targets explicitly when they matter.>

## 9. Assumptions and open questions

| Assumption or question | Status / source | Consequence for design |
| --- | --- | --- |
| <Unconfirmed interpretation or missing decision> | <Proposed / unresolved, and where it arose> | <What depends on settling it; whether discovery must resume first> |

## 10. Design handoff

- Module design inputs: <Point to relevant responsibilities, workflows,
  actors, and external interactions above. Note unresolved ownership.>
- Invariant design inputs: <Point to relevant rules, relationships, and
  lifecycle promises above. Note rules requiring clarification.>
- Readiness: <Why design can begin, or which fundamental questions remain.>
```

The handoff should reference the findings above rather than duplicate them or
invent a module map. Leave mechanism choices for the design work that follows.
