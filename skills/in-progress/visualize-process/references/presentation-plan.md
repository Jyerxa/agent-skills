# Derived presentation plans

Use the generated plan as an evidence-linked starting point, then choose the
focus and supported relationships that best explain the user's question.
The default reading order is not a visual design prescription. This is a
renderer input, not a second maintained process model or an improvement
contract. Regenerate it from the canonical Markdown when meaning changes.

## Storyboard before schema

The JSON plan establishes semantic support; it does not design the experience.
First sketch a concise visual storyboard in working notes. For each beat, name:

| Decision | What to establish |
| --- | --- |
| Learning point | The one idea the viewer should understand after the beat. |
| Basis | The exact record and field supporting any factual depiction. |
| Visual subject | The object, model, space, or metaphor that embodies the idea. |
| Choreography | What assembles, unfolds, separates, is revealed, or changes focus, and why. |
| Camera | Where the viewer starts, how perspective or scale changes, and where it settles. |
| On-screen content | A short headline, essential labels, and any qualification needed now. |
| Interaction | How the viewer advances, explores, or opens the relevant evidence. |
| Accessible state | The equivalent settled composition and text without motion. |

Keep the storyboard disposable and outside `process-view/v1`; do not add keys
to the schema to store it. A visually rich chapter may explain a single
record, and a guided journey may move between concepts without asserting
process order. The amount of prose or number of records does not determine
the number of scenes.

For example, a conceptual model could unfold into layers so the viewer can
inspect a supported distinction, then the camera could pull back to reveal
its relationship to the whole. An unknown outcome could become an unfinished
part of the composition, with its question revealed on approach. These are
possible visual strategies, not mandatory motifs. Physical arrangement must
not silently claim a hierarchy, sequence, quantity, or business boundary.

Choose a visual world specific to the material. Avoid reusing the same islands,
tunnels, glowing nodes, or floating cards for every subject. Evidence handling
is reusable; the art direction and journey deserve fresh decisions.

## Evidence-linked plan

The generator's `--write-view` option produces the full shape:

```json
{
  "format": "process-view/v1",
  "model_id": "returns",
  "revision": 1,
  "sha256": "the actual SHA-256 of the source text",
  "scenarios": [
    {
      "id": "scenario-example",
      "mode": "guided-reading",
      "frames": [
        {
          "focus": ["action-inspect"],
          "basis": [{"id": "scenario-example", "field": "Meaning"}]
        }
      ]
    }
  ],
  "edges": []
}
```

## Frames and motion

`guided-reading` is the safe default. Its frame order is presentation only,
even if the text being explained mentions behavior. A frame may focus several
records together; that implies neither simultaneous execution nor a join.

Use `case-trace` only after reading the case account and establishing its
sequence. Every frame must focus one action/event linked from that scenario's
`Meaning`, with that field as basis. The renderer labels it case-specific and
retains the full case status and limits beside the animation. It does not
infer a universal process or simulate time. Repeated actions are allowed when
the account supports the repetition. A partial exception normally remains a
guided reading, without an invented route to completion.

Basis pointers name existing record IDs and exact field names. The renderer
shows their original values and source links on inspection. It checks that
they resolve, not that the prose proves the depicted claim. Trace order must
be semantically reviewed; link order alone is not sufficient evidence.

### Choreography in custom viewers

For the designed viewer, use cited frames and edges as the semantic foundation.
Implement the storyboard's models, camera paths, easing, and reveals separately;
`process-view/v1` does not accept extra animation keys. The stock renderer's
focus cards are an inspection aid, not a substitute for scene choreography.

Camera travel is an editorial device: approaching a detail, circling a model
to expose a hidden relationship, or pulling back to recontextualize it. It
must not look like an actual item's journey unless the source supports that
journey. Keep a visual landmark or recognizable object across transitions
so ambitious camera movement remains understandable. Compose each destination
for reading; motion should lead to it rather than compete with it.

Map each explanatory beat to a stable, inspectable state and its basis. Keep
presentation progress separate from business time, completion, and certainty.
A traveling marker represents a transfer only when its cited field supports
that transfer; highlighting a prerequisite does not establish a handoff.
Likewise, multiple focused records do not authorize concurrent animation of
their actions. If a richer view depicts supported concurrency, review the
source directly and preserve its qualification; the stock case-trace format
does not encode parallel execution.

Make each settled state reachable through manual steps and reduced motion.
Cancel an in-flight transition before navigating or switching scenarios so
the scene, labels, and evidence panel always describe the same beat.
Keep full original fields and source locators available through inspection;
they need not occupy the main stage. Preserve material qualifications beside
the depiction itself so progressive disclosure never hides its limits.

## Edges

Relationship records automatically produce labeled relationships from their
own `From`, `To`, `Relation`, and evidence. To explain an established dependency
stated in another record, add a derived edge:

```json
{
  "from": "action-inspect",
  "to": "action-quote",
  "relation": "prerequisite for",
  "basis": [{"id": "rule-quote", "field": "Meaning"}]
}
```

Each arrow means only its visible relation. Verify the direction, label, both
endpoints, qualification, and scope against the basis. Unknown relative order
stays unknown. If a condition or qualification is essential to interpreting
an edge, put it in the visible relation label or use an unconnected record
view; do not hide it behind a click. Never connect all actions just to make a
complete-looking chart. Keep disputed and policy-only edges qualified, or
inspect their accounts separately rather than drawing a settled edge.

## Boundaries

Unknown plan keys are rejected; there is no free-form executable markup,
caption, duration, automatic branch decision, or proposed-change input.
Records and original source text are preserved, with safe internal-link
rendering. External locators remain text rather than becoming an injection
or unexpected navigation surface. Omitted scenarios fall back to guided
readings. No scenarios is valid and leaves the record explorer usable.

The package's contract and structural validator are copies of Process Model
v1 to keep single-skill installation self-contained. Keep contract copies
byte-identical when deliberately updating that version across the repository.
