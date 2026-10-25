# Proposed outline: Retry Relay events

Audience: Developers who know HTTP and are new to Relay.

Purpose: A how-to guide for sending an event, deciding whether and when to retry,
and stopping when automatic retries are no longer appropriate.

## 1. Prepare and send an event

Purpose: Establish the request details and the identity that retries must preserve.

- Introduce `POST https://relay.example/events` with a JSON event body,
  `Authorization: Bearer <token>`, and the required `Idempotency-Key` header.
- Explain that each logical event needs its own key, retained with the identical
  body for retries. The source does not specify how to generate keys.
- Reproduce the supplied curl example exactly, using `RELAY_TOKEN`, the sample
  body, and `demo-41`. Identify the key as an example for this event, not a key to
  reuse for every new event.
- State that the curl example sends one request and does not perform retries
  automatically. Introduce the limit of 3 total attempts, including the first.

Takeaway: Preserve the key and body for the event, and count the initial request
toward the attempt limit.

## 2. Decide whether and when to retry

Purpose: Put acceptance semantics, retry limits, and response-specific actions
together so readers can make the next decision.

- Explain that HTTP 202 means Relay stored the event. A timeout can occur after
  storage, so it does not prove the event was lost.
- Explain the deduplication window: for 24 hours after the first accepted request,
  retries with the same key and identical body return the original receipt.
- Place both limits before retry instructions: allow at most 3 total attempts;
  do not retry automatically after the 24-hour window expires.
- Use a response/action table:
  - HTTP 429: wait for `Retry-After`, in seconds, before retrying.
  - HTTP 503 or a network timeout: wait at least 2 seconds before retrying.
  - HTTP 409: investigate the body mismatch; do not change the key merely to
    bypass the conflict.
  - HTTP 401 or 403: fix authentication or permissions; do not automatically retry.
  - Other errors: stop and investigate.
- Keep the limitations next to the deduplication claim: it does not establish
  exactly-once downstream processing or any latency guarantee.

Takeaway: Retry only the documented transient failures, with the original key and
body, the required delay, and within both limits.

## 3. Stop and reconcile unresolved events

Purpose: Give readers a clear action when automatic retries must stop.

- On attempt exhaustion, stop and reconcile the event with their records.
- After the deduplication window expires, reconcile with their records before
  any further retry; automatic retries must stop.
- Explain that no status lookup endpoint is documented. Leave reconciliation
  procedures to the reader's records rather than inventing an API or workflow.

Takeaway: When the documented retry limits are reached, resolve the uncertainty
through records before taking further action.

## Approval checkpoint

This outline is ready for review. The document will be written to
`/private/tmp/technical-writing-eval/checkpoint-draft.md` after outline approval.
