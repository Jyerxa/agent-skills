# Proposed revisions to “Retrying Relay requests”

Status: proposals for approval. No revision has been applied to the source or to `/private/tmp/technical-writing-eval/approved.md`.

Scope: composition and prose. The intended reader knows HTTP and is new to Relay. The document should help that reader retry an event without changing its identity or exceeding the documented limits.

## A. Put prerequisites before the retry decisions

Current section order:

1. Background
2. Sending requests
3. Additional considerations
4. Diagnostic examples

Proposed section order, keeping the title “Retrying Relay requests”:

1. **Prepare the request** — the key requirement from “Background,” followed by the storage and timeout explanation from “Sending requests.” Move the latency and downstream-processing limitations here from the end of the draft.
2. **Retry or stop** — combine the retry instructions and “Additional considerations.” Put the 24-hour window and attempt limit before the response-specific actions. Follow those actions with the instruction to reconcile after exhausting attempts.
3. **Diagnostic examples** — retain the introductory sentence, JSON code, and exact quotation without changes.

This puts the conditions that govern every retry before the reader chooses an action. It also replaces headings that do not identify their contents. This proposal changes organization; B–D below specify the wording changes separately.

## B. Replace praise with the required key behavior

Before:

> It is important to note that Relay is a genuinely robust event API, providing a
> load-bearing foundation for the workflows that matter. Honestly, the client
> should utilize an Idempotency-Key header in order to help with retries.

After:

> Every request must include an `Idempotency-Key` header. Generate one key for each logical event and retain it for retries. Use the same key and identical body for every retry.

The source requires this header; the current “should” understates that requirement. The replacement also makes the retry identity rule apply to HTTP 429 as well as HTTP 503 and timeouts. Removing the praise and filler lets the reader reach those instructions immediately. No key-generation method is added because the source does not specify one.

## C. Make the storage explanation and limitations direct

Before:

> The event is stored before HTTP 202 is returned by Relay. A timeout can happen
> after storage. The request may have succeeded even if the client saw a timeout.

After:

> Relay returns HTTP 202 after storing the event. A timeout can occur after storage, so a timeout does not mean the event was lost.

This names the actor and connects the timeout condition with its consequence.

Also replace the final paragraph:

> No latency guarantee is specified. The source does not establish exactly-once
> downstream processing. Keep those limitations when editing this draft.

With:

> No latency guarantee is specified. The source does not establish exactly-once downstream processing.

Keep both qualifications and remove only the instruction to the editor. Under A, this paragraph follows the storage explanation.

## D. Consolidate the retry rules into one decision point

Replace the paragraph beginning “Retry with the same key” and all of “Additional considerations” with the following text. Under A, it belongs in “Retry or stop”; otherwise, keep it at the existing retry paragraph and remove the now-empty “Additional considerations” heading.

> For 24 hours after the first accepted request, Relay deduplicates requests with the same key and identical body; the retry returns the original receipt. After that window, do not retry automatically. Reconcile the event with your records first.
>
> Allow at most 3 total attempts, including the first. For every retry, use the same key and identical body, and follow the applicable action below.

| Response or failure | Action |
| --- | --- |
| HTTP 429 | Wait for the `Retry-After` interval, in seconds, before retrying. |
| HTTP 503 or a network timeout | Wait at least 2 seconds before retrying. |
| HTTP 409 | The same key was used with a different body. Investigate the mismatch; do not change the key merely to bypass the conflict. |
| HTTP 401 or 403 | Fix authentication or permissions. Do not automatically retry. |
| Any other error | Stop and investigate. |

> When all 3 attempts are exhausted, stop and reconcile the event with your records. No status lookup endpoint is documented.

This gathers the retry conditions, waiting periods, and stopping rules where the reader chooses an action. Returning the original receipt and the absence of a documented status lookup endpoint are supported additions from the supplied facts. The attempt count remains 3 total attempts, not 3 retries.

## Protected content and verification

Keep this diagnostic code exactly:

```json
{"load-bearing": true, "message": "honestly, genuinely, that matter"}
```

Keep this sentence and quotation exactly, including its line break:

```text
The fixture author supplied this exact quotation: "Honestly, this is genuinely
load-bearing for the workflows that matter."
```

The prose patterns do not justify changing these literal occurrences. The diagnostic introduction, “The following literals are test data, not editorial claims:”, also stays unchanged.

The proposals retain the 24-hour window measured from the first accepted request, both waiting rules, the total attempt limit, reconciliation requirements, conflict handling, authentication and permission handling, and both guarantee limitations. They add no endpoint, retry library, latency promise, or downstream-processing guarantee. The endpoint, authentication example, and sample request in the source facts are not needed for this narrow retry guide.

## Approval checkpoint

Approve A–D together, or identify the subset to apply. After approval, the approved changes will be written to `/private/tmp/technical-writing-eval/approved.md`; the original draft will remain unchanged.

The invoked [technical-revision skill](/private/tmp/technical-writing-eval/revision-only/technical-revision/SKILL.md) delegates approval handling to its [revision pass](/private/tmp/technical-writing-eval/revision-only/technical-revision/references/revision-pass.md), which says: “propose concrete changes and wait before applying them to the target or delivering an adopted revision.” This checkpoint follows the requested recommend-and-approve mode.
