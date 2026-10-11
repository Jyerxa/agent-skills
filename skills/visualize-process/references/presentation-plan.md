# Derived presentation plans

Use the default generated plan unless an evidence-backed layout or case trace
would materially improve understanding. This is a renderer input, not a
second maintained process model or an improvement contract. Regenerate it
from the canonical Markdown when meaning changes.

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
